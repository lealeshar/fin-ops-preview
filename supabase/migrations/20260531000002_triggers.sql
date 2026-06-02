-- =============================================================================
-- Phase C: Trigger Functions & Trigger Bindings
--
-- Execution order for BEFORE UPDATE on jobs (alphabetical by trigger name):
--   trg_jobs_00_state_machine   → validates transitions + immutability
--   trg_jobs_01_set_updated_at  → sets updated_at = now()
--   trg_jobs_02_increment_version → version_number + 1
-- =============================================================================

-- ---------------------------------------------------------------------------
-- fn_set_updated_at
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_factories_01_set_updated_at
  BEFORE UPDATE ON factories
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_supervisors_01_set_updated_at
  BEFORE UPDATE ON supervisors
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_jobs_01_set_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_flex_defs_01_set_updated_at
  BEFORE UPDATE ON flex_field_definitions
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ---------------------------------------------------------------------------
-- fn_increment_version_number
-- Auto-increments version_number on every UPDATE.
-- The calling RPC enforces optimistic locking via WHERE version_number = expected,
-- then checks ROW_COUNT. This trigger just ensures the increment always happens.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_increment_version_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.version_number := OLD.version_number + 1;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_factories_02_increment_version
  BEFORE UPDATE ON factories
  FOR EACH ROW EXECUTE FUNCTION fn_increment_version_number();

CREATE TRIGGER trg_supervisors_02_increment_version
  BEFORE UPDATE ON supervisors
  FOR EACH ROW EXECUTE FUNCTION fn_increment_version_number();

CREATE TRIGGER trg_jobs_02_increment_version
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION fn_increment_version_number();

CREATE TRIGGER trg_flex_defs_02_increment_version
  BEFORE UPDATE ON flex_field_definitions
  FOR EACH ROW EXECUTE FUNCTION fn_increment_version_number();

-- ---------------------------------------------------------------------------
-- fn_enforce_job_state_machine
-- BEFORE UPDATE on jobs. Validates:
--   1. Records at Queued_For_MASAV / Paid / Closed are completely immutable.
--   2. operational_status transition exists in allowed_transitions.
--   3. accounting_status transition exists in allowed_transitions.
--   4. accounting_status cannot advance to Approved or Queued_For_MASAV
--      unless operational_status = Matched.
-- Fires as trg_jobs_00_* so it runs BEFORE set_updated_at and increment_version.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_enforce_job_state_machine()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Rule: immutable accounting states lock the entire record.
  IF OLD.accounting_status IN ('Queued_For_MASAV', 'Paid', 'Closed') THEN
    RAISE EXCEPTION 'IMMUTABLE_RECORD: job % is locked at accounting_status = %',
      OLD.id, OLD.accounting_status
      USING ERRCODE = 'P0001';
  END IF;

  -- Rule: validate operational_status transition.
  IF NEW.operational_status IS DISTINCT FROM OLD.operational_status THEN
    IF NOT EXISTS (
      SELECT 1 FROM allowed_transitions
       WHERE organization_id = OLD.organization_id
         AND status_type     = 'operational'
         AND from_status     = OLD.operational_status::text
         AND to_status       = NEW.operational_status::text
    ) THEN
      RAISE EXCEPTION 'INVALID_TRANSITION: operational_status % → % is not allowed',
        OLD.operational_status, NEW.operational_status
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- Rule: validate accounting_status transition.
  IF NEW.accounting_status IS DISTINCT FROM OLD.accounting_status THEN
    IF NOT EXISTS (
      SELECT 1 FROM allowed_transitions
       WHERE organization_id = OLD.organization_id
         AND status_type     = 'accounting'
         AND from_status     = OLD.accounting_status::text
         AND to_status       = NEW.accounting_status::text
    ) THEN
      RAISE EXCEPTION 'INVALID_TRANSITION: accounting_status % → % is not allowed',
        OLD.accounting_status, NEW.accounting_status
        USING ERRCODE = 'P0001';
    END IF;

    -- Accounting cannot advance to Approved or Queued_For_MASAV unless Matched.
    IF NEW.accounting_status IN ('Approved', 'Queued_For_MASAV')
       AND NEW.operational_status <> 'Matched' THEN
      RAISE EXCEPTION 'PRECONDITION_FAILED: accounting_status cannot advance to % while operational_status = %',
        NEW.accounting_status, NEW.operational_status
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Must fire first — prefix 00 ensures alphabetical ordering before 01 and 02.
CREATE TRIGGER trg_jobs_00_state_machine
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION fn_enforce_job_state_machine();

-- ---------------------------------------------------------------------------
-- fn_prevent_financial_event_mutation
-- financial_events is append-only (rule #9). No UPDATE, no DELETE — ever.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_prevent_financial_event_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'IMMUTABLE_TABLE: financial_events is append-only — % is forbidden',
    TG_OP
    USING ERRCODE = 'P0001';
END;
$$;

CREATE TRIGGER trg_financial_events_no_update
  BEFORE UPDATE ON financial_events
  FOR EACH ROW EXECUTE FUNCTION fn_prevent_financial_event_mutation();

CREATE TRIGGER trg_financial_events_no_delete
  BEFORE DELETE ON financial_events
  FOR EACH ROW EXECUTE FUNCTION fn_prevent_financial_event_mutation();

-- ---------------------------------------------------------------------------
-- fn_prevent_hard_delete
-- Factories, supervisors, and jobs use soft delete only (rule #10).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_prevent_hard_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'HARD_DELETE_FORBIDDEN: use is_deleted = true on %',
    TG_TABLE_NAME
    USING ERRCODE = 'P0001';
END;
$$;

CREATE TRIGGER trg_factories_no_hard_delete
  BEFORE DELETE ON factories
  FOR EACH ROW EXECUTE FUNCTION fn_prevent_hard_delete();

CREATE TRIGGER trg_supervisors_no_hard_delete
  BEFORE DELETE ON supervisors
  FOR EACH ROW EXECUTE FUNCTION fn_prevent_hard_delete();

CREATE TRIGGER trg_jobs_no_hard_delete
  BEFORE DELETE ON jobs
  FOR EACH ROW EXECUTE FUNCTION fn_prevent_hard_delete();

-- ---------------------------------------------------------------------------
-- fn_write_audit_log
-- AFTER INSERT / UPDATE / DELETE — writes to audit_logs.
-- actor_id and correlation_id are set by RPCs via set_config() before the write.
-- Falls back to 'system' for direct writes that bypass RPC context.
-- SECURITY DEFINER so the trigger can always insert into audit_logs regardless
-- of the caller's role.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_write_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id       text;
  v_correlation_id text;
  v_record_id      uuid;
  v_org_id         uuid;
BEGIN
  v_actor_id       := COALESCE(NULLIF(current_setting('app.actor_id',       true), ''), 'system');
  v_correlation_id := COALESCE(NULLIF(current_setting('app.correlation_id', true), ''), '');

  IF TG_OP = 'DELETE' THEN
    v_record_id := OLD.id;
    v_org_id    := OLD.organization_id;
    INSERT INTO audit_logs
      (organization_id, table_name, record_id, operation, old_values, new_values, actor_id, correlation_id)
    VALUES
      (v_org_id, TG_TABLE_NAME, v_record_id, 'DELETE', to_jsonb(OLD), NULL, v_actor_id, v_correlation_id);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    v_record_id := NEW.id;
    v_org_id    := NEW.organization_id;
    INSERT INTO audit_logs
      (organization_id, table_name, record_id, operation, old_values, new_values, actor_id, correlation_id)
    VALUES
      (v_org_id, TG_TABLE_NAME, v_record_id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), v_actor_id, v_correlation_id);
    RETURN NEW;
  ELSE
    v_record_id := NEW.id;
    v_org_id    := NEW.organization_id;
    INSERT INTO audit_logs
      (organization_id, table_name, record_id, operation, old_values, new_values, actor_id, correlation_id)
    VALUES
      (v_org_id, TG_TABLE_NAME, v_record_id, 'INSERT', NULL, to_jsonb(NEW), v_actor_id, v_correlation_id);
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER trg_factories_audit
  AFTER INSERT OR UPDATE OR DELETE ON factories
  FOR EACH ROW EXECUTE FUNCTION fn_write_audit_log();

CREATE TRIGGER trg_supervisors_audit
  AFTER INSERT OR UPDATE OR DELETE ON supervisors
  FOR EACH ROW EXECUTE FUNCTION fn_write_audit_log();

CREATE TRIGGER trg_jobs_audit
  AFTER INSERT OR UPDATE OR DELETE ON jobs
  FOR EACH ROW EXECUTE FUNCTION fn_write_audit_log();

-- financial_events: only INSERT is audited (no mutation events to record).
CREATE TRIGGER trg_financial_events_audit
  AFTER INSERT ON financial_events
  FOR EACH ROW EXECUTE FUNCTION fn_write_audit_log();

CREATE TRIGGER trg_flex_defs_audit
  AFTER INSERT OR UPDATE OR DELETE ON flex_field_definitions
  FOR EACH ROW EXECUTE FUNCTION fn_write_audit_log();
