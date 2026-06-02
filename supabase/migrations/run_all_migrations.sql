-- =============================================================================
-- MIGRATION: Enterprise Financial Operations Platform v5.1
-- Run this ONCE in Supabase SQL Editor
-- =============================================================================

-- ---------------------------------------------------------------------------
-- PHASE B: Initial Schema
-- ---------------------------------------------------------------------------

CREATE TYPE payment_terms_enum AS ENUM (
  'Immediate', 'Current', 'Current+30', 'Current+60',
  'Current+90', 'Current+120', 'Custom'
);
CREATE TYPE payment_method_enum AS ENUM (
  'Bank_Transfer', 'Check', 'Credit_Card', 'Other'
);
CREATE TYPE payment_type_enum AS ENUM (
  'MASAV', 'Salary_Slip', 'Other'
);
CREATE TYPE entity_status_enum AS ENUM (
  'Active', 'Inactive'
);
CREATE TYPE operational_status_enum AS ENUM (
  'Draft', 'Waiting_Match', 'Partial_Match', 'Matched', 'Cancelled'
);
CREATE TYPE accounting_status_enum AS ENUM (
  'Pending_Approval', 'Approved', 'Queued_For_MASAV', 'Paid', 'Closed'
);
CREATE TYPE financial_event_type_enum AS ENUM (
  'Charge', 'Credit', 'Bounce_Check', 'Adjustment', 'Debt_Close', 'MASAV', 'Offset'
);
CREATE TYPE flex_field_type_enum AS ENUM (
  'string', 'date', 'numeric', 'enum'
);
CREATE TYPE flex_field_entity_type_enum AS ENUM (
  'factory', 'supervisor'
);
CREATE TYPE audit_operation_enum AS ENUM (
  'INSERT', 'UPDATE', 'DELETE'
);

CREATE TABLE system_settings (
  key             text        NOT NULL,
  organization_id uuid        NOT NULL,
  value           jsonb       NOT NULL,
  description     text,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  updated_by      text        NOT NULL,
  PRIMARY KEY (key, organization_id)
);

CREATE TABLE factories (
  id                   uuid                NOT NULL DEFAULT gen_random_uuid(),
  organization_id      uuid                NOT NULL,
  created_at           timestamptz         NOT NULL DEFAULT now(),
  updated_at           timestamptz         NOT NULL DEFAULT now(),
  version_number       integer             NOT NULL DEFAULT 1,
  name                 text                NOT NULL,
  tax_id               text                NOT NULL,
  address              text,
  contact_name         text,
  phone                text,
  email                text,
  external_customer_id text,
  payment_terms        payment_terms_enum  NOT NULL,
  payment_method       payment_method_enum NOT NULL,
  status               entity_status_enum  NOT NULL DEFAULT 'Active',
  flex_data            jsonb,
  is_deleted           boolean             NOT NULL DEFAULT false,
  archived_at          timestamptz,
  inactive_reason      text,
  PRIMARY KEY (id, organization_id),
  UNIQUE      (organization_id, tax_id)
);
CREATE INDEX idx_factories_org_status  ON factories (organization_id, status);
CREATE INDEX idx_factories_org_deleted ON factories (organization_id, is_deleted);
CREATE INDEX idx_factories_org_name    ON factories (organization_id, name);

CREATE TABLE supervisors (
  id                  uuid               NOT NULL DEFAULT gen_random_uuid(),
  organization_id     uuid               NOT NULL,
  created_at          timestamptz        NOT NULL DEFAULT now(),
  updated_at          timestamptz        NOT NULL DEFAULT now(),
  version_number      integer            NOT NULL DEFAULT 1,
  name                text               NOT NULL,
  national_id         text               NOT NULL,
  phone               text,
  email               text,
  address             text,
  payment_type        payment_type_enum  NOT NULL,
  monthly_salary_cost numeric(12, 2)     NOT NULL CHECK (monthly_salary_cost >= 0),
  bank_code           text,
  bank_branch         text,
  bank_account        text,
  bank_account_type   text,
  status              entity_status_enum NOT NULL DEFAULT 'Active',
  flex_data           jsonb,
  is_deleted          boolean            NOT NULL DEFAULT false,
  archived_at         timestamptz,
  inactive_reason     text,
  PRIMARY KEY (id, organization_id),
  UNIQUE      (organization_id, national_id)
);
CREATE INDEX idx_supervisors_org_status  ON supervisors (organization_id, status);
CREATE INDEX idx_supervisors_org_deleted ON supervisors (organization_id, is_deleted);
CREATE INDEX idx_supervisors_org_name    ON supervisors (organization_id, name);

CREATE TABLE flex_field_definitions (
  id              uuid                        NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid                        NOT NULL,
  created_at      timestamptz                 NOT NULL DEFAULT now(),
  updated_at      timestamptz                 NOT NULL DEFAULT now(),
  version_number  integer                     NOT NULL DEFAULT 1,
  entity_type     flex_field_entity_type_enum NOT NULL,
  field_key       text                        NOT NULL,
  label           text                        NOT NULL,
  field_type      flex_field_type_enum        NOT NULL,
  display_order   integer                     NOT NULL DEFAULT 0,
  is_required     boolean                     NOT NULL DEFAULT false,
  enum_options    text[],
  PRIMARY KEY (id, organization_id),
  UNIQUE      (organization_id, entity_type, field_key)
);
CREATE INDEX idx_flex_defs_org_entity ON flex_field_definitions (organization_id, entity_type);

CREATE TABLE jobs (
  id                       uuid                     NOT NULL DEFAULT gen_random_uuid(),
  organization_id          uuid                     NOT NULL,
  created_at               timestamptz              NOT NULL DEFAULT now(),
  updated_at               timestamptz              NOT NULL DEFAULT now(),
  version_number           integer                  NOT NULL DEFAULT 1,
  job_code                 text                     NOT NULL,
  factory_id               uuid                     NOT NULL,
  supervisor_id            uuid                     NOT NULL,
  billing_month            smallint                 NOT NULL CHECK (billing_month BETWEEN 1 AND 12),
  billing_year             smallint                 NOT NULL CHECK (billing_year BETWEEN 2000 AND 2100),
  factory_charge_amount    numeric(12, 2)           NOT NULL CHECK (factory_charge_amount >= 0),
  supervisor_payout_amount numeric(12, 2)           NOT NULL CHECK (supervisor_payout_amount >= 0),
  operational_status       operational_status_enum  NOT NULL DEFAULT 'Draft',
  accounting_status        accounting_status_enum   NOT NULL DEFAULT 'Pending_Approval',
  PRIMARY KEY (id, organization_id),
  UNIQUE      (organization_id, job_code),
  FOREIGN KEY (factory_id,    organization_id) REFERENCES factories  (id, organization_id),
  FOREIGN KEY (supervisor_id, organization_id) REFERENCES supervisors (id, organization_id)
);
CREATE INDEX idx_jobs_org_factory        ON jobs (organization_id, factory_id);
CREATE INDEX idx_jobs_org_supervisor     ON jobs (organization_id, supervisor_id);
CREATE INDEX idx_jobs_org_op_status      ON jobs (organization_id, operational_status);
CREATE INDEX idx_jobs_org_acc_status     ON jobs (organization_id, accounting_status);
CREATE INDEX idx_jobs_org_billing_period ON jobs (organization_id, billing_year, billing_month);

CREATE TABLE financial_events (
  id              uuid                       NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid                       NOT NULL,
  created_at      timestamptz                NOT NULL DEFAULT now(),
  event_type      financial_event_type_enum  NOT NULL,
  job_id          uuid                       NOT NULL,
  amount          numeric(12, 2)             NOT NULL,
  description     text,
  idempotency_key text                       NOT NULL,
  correlation_id  text                       NOT NULL,
  metadata        jsonb,
  PRIMARY KEY (id, organization_id),
  UNIQUE      (organization_id, idempotency_key),
  FOREIGN KEY (job_id, organization_id) REFERENCES jobs (id, organization_id)
);
CREATE INDEX idx_fin_events_org_job        ON financial_events (organization_id, job_id);
CREATE INDEX idx_fin_events_org_type       ON financial_events (organization_id, event_type);
CREATE INDEX idx_fin_events_org_created_at ON financial_events (organization_id, created_at DESC);

CREATE TABLE idempotency_log (
  key             text        NOT NULL,
  organization_id uuid        NOT NULL,
  operation       text        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  result_summary  text,
  PRIMARY KEY (key, organization_id)
);
CREATE INDEX idx_idempotency_org_created ON idempotency_log (organization_id, created_at DESC);

CREATE TABLE allowed_transitions (
  id              uuid        NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL,
  status_type     text        NOT NULL CHECK (status_type IN ('operational', 'accounting')),
  from_status     text        NOT NULL,
  to_status       text        NOT NULL,
  PRIMARY KEY (id, organization_id),
  UNIQUE      (organization_id, status_type, from_status, to_status)
);
CREATE INDEX idx_transitions_org_type ON allowed_transitions (organization_id, status_type, from_status);

CREATE TABLE outbox (
  id              uuid        NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  event_type      text        NOT NULL,
  payload         jsonb       NOT NULL,
  processed_at    timestamptz,
  error           text,
  retry_count     integer     NOT NULL DEFAULT 0,
  PRIMARY KEY (id, organization_id)
);
CREATE INDEX idx_outbox_org_pending ON outbox (organization_id, created_at)
  WHERE processed_at IS NULL;

CREATE TABLE inbox (
  id              uuid        NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  source          text        NOT NULL,
  event_type      text        NOT NULL,
  payload         jsonb       NOT NULL,
  idempotency_key text        NOT NULL,
  processed_at    timestamptz,
  error           text,
  PRIMARY KEY (id, organization_id),
  UNIQUE      (organization_id, idempotency_key)
);
CREATE INDEX idx_inbox_org_pending ON inbox (organization_id, created_at)
  WHERE processed_at IS NULL;

CREATE TABLE domain_events (
  id              uuid        NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  aggregate_type  text        NOT NULL,
  aggregate_id    uuid        NOT NULL,
  event_type      text        NOT NULL,
  payload         jsonb       NOT NULL,
  correlation_id  text        NOT NULL,
  actor_id        text        NOT NULL,
  sequence_number bigint      NOT NULL,
  PRIMARY KEY (id, organization_id)
);
CREATE INDEX idx_domain_events_org_aggregate ON domain_events (organization_id, aggregate_type, aggregate_id, sequence_number);
CREATE INDEX idx_domain_events_org_created   ON domain_events (organization_id, created_at DESC);

CREATE TABLE audit_logs (
  id              uuid                  NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid                  NOT NULL,
  created_at      timestamptz           NOT NULL DEFAULT now(),
  table_name      text                  NOT NULL,
  record_id       uuid                  NOT NULL,
  operation       audit_operation_enum  NOT NULL,
  old_values      jsonb,
  new_values      jsonb,
  actor_id        text                  NOT NULL,
  correlation_id  text                  NOT NULL,
  PRIMARY KEY (id, organization_id)
);
CREATE INDEX idx_audit_org_record  ON audit_logs (organization_id, table_name, record_id);
CREATE INDEX idx_audit_org_created ON audit_logs (organization_id, created_at DESC);
CREATE INDEX idx_audit_org_actor   ON audit_logs (organization_id, actor_id);

-- Seed state machine transitions
INSERT INTO allowed_transitions (organization_id, status_type, from_status, to_status) VALUES
  ('00000000-0000-0000-0000-000000000000', 'operational', 'Draft',          'Waiting_Match'),
  ('00000000-0000-0000-0000-000000000000', 'operational', 'Waiting_Match',  'Partial_Match'),
  ('00000000-0000-0000-0000-000000000000', 'operational', 'Waiting_Match',  'Matched'),
  ('00000000-0000-0000-0000-000000000000', 'operational', 'Partial_Match',  'Matched'),
  ('00000000-0000-0000-0000-000000000000', 'operational', 'Draft',          'Cancelled'),
  ('00000000-0000-0000-0000-000000000000', 'operational', 'Waiting_Match',  'Cancelled'),
  ('00000000-0000-0000-0000-000000000000', 'operational', 'Partial_Match',  'Cancelled'),
  ('00000000-0000-0000-0000-000000000000', 'accounting',  'Pending_Approval', 'Approved'),
  ('00000000-0000-0000-0000-000000000000', 'accounting',  'Approved',         'Queued_For_MASAV'),
  ('00000000-0000-0000-0000-000000000000', 'accounting',  'Queued_For_MASAV', 'Paid'),
  ('00000000-0000-0000-0000-000000000000', 'accounting',  'Paid',             'Closed');

-- ---------------------------------------------------------------------------
-- PHASE C: Triggers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $func$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$func$;

CREATE TRIGGER trg_factories_01_set_updated_at   BEFORE UPDATE ON factories              FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_supervisors_01_set_updated_at  BEFORE UPDATE ON supervisors             FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_jobs_01_set_updated_at          BEFORE UPDATE ON jobs                    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_flex_defs_01_set_updated_at    BEFORE UPDATE ON flex_field_definitions  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE OR REPLACE FUNCTION fn_increment_version_number()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $func$
BEGIN NEW.version_number := OLD.version_number + 1; RETURN NEW; END;
$func$;

CREATE TRIGGER trg_factories_02_increment_version   BEFORE UPDATE ON factories              FOR EACH ROW EXECUTE FUNCTION fn_increment_version_number();
CREATE TRIGGER trg_supervisors_02_increment_version  BEFORE UPDATE ON supervisors             FOR EACH ROW EXECUTE FUNCTION fn_increment_version_number();
CREATE TRIGGER trg_jobs_02_increment_version          BEFORE UPDATE ON jobs                    FOR EACH ROW EXECUTE FUNCTION fn_increment_version_number();
CREATE TRIGGER trg_flex_defs_02_increment_version    BEFORE UPDATE ON flex_field_definitions  FOR EACH ROW EXECUTE FUNCTION fn_increment_version_number();

CREATE OR REPLACE FUNCTION fn_enforce_job_state_machine()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $func$
BEGIN
  IF OLD.accounting_status IN ('Queued_For_MASAV', 'Paid', 'Closed') THEN
    RAISE EXCEPTION 'IMMUTABLE_RECORD: job % is locked at accounting_status = %', OLD.id, OLD.accounting_status USING ERRCODE = 'P0001';
  END IF;
  IF NEW.operational_status IS DISTINCT FROM OLD.operational_status THEN
    IF NOT EXISTS (
      SELECT 1 FROM allowed_transitions
       WHERE organization_id = OLD.organization_id
         AND status_type = 'operational'
         AND from_status = OLD.operational_status::text
         AND to_status   = NEW.operational_status::text
    ) THEN
      RAISE EXCEPTION 'INVALID_TRANSITION: operational_status % -> % is not allowed', OLD.operational_status, NEW.operational_status USING ERRCODE = 'P0001';
    END IF;
  END IF;
  IF NEW.accounting_status IS DISTINCT FROM OLD.accounting_status THEN
    IF NOT EXISTS (
      SELECT 1 FROM allowed_transitions
       WHERE organization_id = OLD.organization_id
         AND status_type = 'accounting'
         AND from_status = OLD.accounting_status::text
         AND to_status   = NEW.accounting_status::text
    ) THEN
      RAISE EXCEPTION 'INVALID_TRANSITION: accounting_status % -> % is not allowed', OLD.accounting_status, NEW.accounting_status USING ERRCODE = 'P0001';
    END IF;
    IF NEW.accounting_status IN ('Approved', 'Queued_For_MASAV') AND NEW.operational_status <> 'Matched' THEN
      RAISE EXCEPTION 'PRECONDITION_FAILED: accounting_status cannot advance to % while operational_status = %', NEW.accounting_status, NEW.operational_status USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$func$;

CREATE TRIGGER trg_jobs_00_state_machine BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION fn_enforce_job_state_machine();

CREATE OR REPLACE FUNCTION fn_prevent_financial_event_mutation()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $func$
BEGIN
  RAISE EXCEPTION 'IMMUTABLE_TABLE: financial_events is append-only -- % is forbidden', TG_OP USING ERRCODE = 'P0001';
END;
$func$;

CREATE TRIGGER trg_financial_events_no_update BEFORE UPDATE ON financial_events FOR EACH ROW EXECUTE FUNCTION fn_prevent_financial_event_mutation();
CREATE TRIGGER trg_financial_events_no_delete BEFORE DELETE ON financial_events FOR EACH ROW EXECUTE FUNCTION fn_prevent_financial_event_mutation();

CREATE OR REPLACE FUNCTION fn_prevent_hard_delete()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $func$
BEGIN
  RAISE EXCEPTION 'HARD_DELETE_FORBIDDEN: use is_deleted = true on %', TG_TABLE_NAME USING ERRCODE = 'P0001';
END;
$func$;

CREATE TRIGGER trg_factories_no_hard_delete   BEFORE DELETE ON factories   FOR EACH ROW EXECUTE FUNCTION fn_prevent_hard_delete();
CREATE TRIGGER trg_supervisors_no_hard_delete  BEFORE DELETE ON supervisors  FOR EACH ROW EXECUTE FUNCTION fn_prevent_hard_delete();
CREATE TRIGGER trg_jobs_no_hard_delete          BEFORE DELETE ON jobs          FOR EACH ROW EXECUTE FUNCTION fn_prevent_hard_delete();

CREATE OR REPLACE FUNCTION fn_write_audit_log()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
DECLARE
  v_actor_id       text;
  v_correlation_id text;
  v_record_id      uuid;
  v_org_id         uuid;
BEGIN
  v_actor_id       := COALESCE(NULLIF(current_setting('app.actor_id',       true), ''), 'system');
  v_correlation_id := COALESCE(NULLIF(current_setting('app.correlation_id', true), ''), '');
  IF TG_OP = 'DELETE' THEN
    v_record_id := OLD.id; v_org_id := OLD.organization_id;
    INSERT INTO audit_logs (organization_id, table_name, record_id, operation, old_values, new_values, actor_id, correlation_id)
    VALUES (v_org_id, TG_TABLE_NAME, v_record_id, 'DELETE', to_jsonb(OLD), NULL, v_actor_id, v_correlation_id);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    v_record_id := NEW.id; v_org_id := NEW.organization_id;
    INSERT INTO audit_logs (organization_id, table_name, record_id, operation, old_values, new_values, actor_id, correlation_id)
    VALUES (v_org_id, TG_TABLE_NAME, v_record_id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), v_actor_id, v_correlation_id);
    RETURN NEW;
  ELSE
    v_record_id := NEW.id; v_org_id := NEW.organization_id;
    INSERT INTO audit_logs (organization_id, table_name, record_id, operation, old_values, new_values, actor_id, correlation_id)
    VALUES (v_org_id, TG_TABLE_NAME, v_record_id, 'INSERT', NULL, to_jsonb(NEW), v_actor_id, v_correlation_id);
    RETURN NEW;
  END IF;
END;
$func$;

CREATE TRIGGER trg_factories_audit            AFTER INSERT OR UPDATE OR DELETE ON factories              FOR EACH ROW EXECUTE FUNCTION fn_write_audit_log();
CREATE TRIGGER trg_supervisors_audit           AFTER INSERT OR UPDATE OR DELETE ON supervisors             FOR EACH ROW EXECUTE FUNCTION fn_write_audit_log();
CREATE TRIGGER trg_jobs_audit                  AFTER INSERT OR UPDATE OR DELETE ON jobs                    FOR EACH ROW EXECUTE FUNCTION fn_write_audit_log();
CREATE TRIGGER trg_financial_events_audit      AFTER INSERT                     ON financial_events        FOR EACH ROW EXECUTE FUNCTION fn_write_audit_log();
CREATE TRIGGER trg_flex_defs_audit             AFTER INSERT OR UPDATE OR DELETE ON flex_field_definitions  FOR EACH ROW EXECUTE FUNCTION fn_write_audit_log();

-- ---------------------------------------------------------------------------
-- PHASE C: Row-Level Security
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION current_organization_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $func$
  SELECT COALESCE(
    NULLIF(current_setting('app.organization_id', true), '')::uuid,
    (auth.jwt() ->> 'organization_id')::uuid
  );
$func$;

ALTER TABLE system_settings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE factories              ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisors            ENABLE ROW LEVEL SECURITY;
ALTER TABLE flex_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE idempotency_log        ENABLE ROW LEVEL SECURITY;
ALTER TABLE allowed_transitions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_events          ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs             ENABLE ROW LEVEL SECURITY;

CREATE POLICY system_settings_select    ON system_settings        FOR SELECT TO authenticated USING (organization_id = current_organization_id());
CREATE POLICY factories_org_isolation   ON factories              FOR ALL    TO authenticated USING (organization_id = current_organization_id()) WITH CHECK (organization_id = current_organization_id());
CREATE POLICY supervisors_org_isolation ON supervisors            FOR ALL    TO authenticated USING (organization_id = current_organization_id()) WITH CHECK (organization_id = current_organization_id());
CREATE POLICY flex_defs_org_isolation   ON flex_field_definitions FOR ALL    TO authenticated USING (organization_id = current_organization_id()) WITH CHECK (organization_id = current_organization_id());
CREATE POLICY jobs_org_isolation        ON jobs                   FOR ALL    TO authenticated USING (organization_id = current_organization_id()) WITH CHECK (organization_id = current_organization_id());
CREATE POLICY financial_events_select   ON financial_events       FOR SELECT TO authenticated USING (organization_id = current_organization_id());
CREATE POLICY idempotency_log_select    ON idempotency_log        FOR SELECT TO authenticated USING (organization_id = current_organization_id());
CREATE POLICY allowed_transitions_select ON allowed_transitions   FOR SELECT TO authenticated USING (organization_id = current_organization_id());
CREATE POLICY outbox_select             ON outbox                 FOR SELECT TO authenticated USING (organization_id = current_organization_id());
CREATE POLICY inbox_select              ON inbox                  FOR SELECT TO authenticated USING (organization_id = current_organization_id());
CREATE POLICY domain_events_select      ON domain_events          FOR SELECT TO authenticated USING (organization_id = current_organization_id());
CREATE POLICY audit_logs_select         ON audit_logs             FOR SELECT TO authenticated USING (organization_id = current_organization_id());

-- ---------------------------------------------------------------------------
-- PHASE C: Write RPCs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_audit_context(p_actor_id text, p_correlation_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
BEGIN
  PERFORM set_config('app.actor_id',       p_actor_id,       true);
  PERFORM set_config('app.correlation_id', p_correlation_id, true);
END;
$func$;

CREATE OR REPLACE FUNCTION emit_domain_event(
  p_organization_id uuid, p_aggregate_type text, p_aggregate_id uuid,
  p_event_type text, p_payload jsonb, p_actor_id text, p_correlation_id text
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
DECLARE v_seq bigint;
BEGIN
  SELECT COALESCE(MAX(sequence_number), 0) + 1 INTO v_seq
    FROM domain_events
   WHERE organization_id = p_organization_id
     AND aggregate_type  = p_aggregate_type
     AND aggregate_id    = p_aggregate_id;
  INSERT INTO domain_events (organization_id, aggregate_type, aggregate_id, event_type, payload, correlation_id, actor_id, sequence_number)
  VALUES (p_organization_id, p_aggregate_type, p_aggregate_id, p_event_type, p_payload, p_correlation_id, p_actor_id, v_seq);
END;
$func$;

CREATE OR REPLACE FUNCTION rpc_provision_organization(p_organization_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
BEGIN
  INSERT INTO allowed_transitions (organization_id, status_type, from_status, to_status)
  SELECT p_organization_id, status_type, from_status, to_status
    FROM allowed_transitions
   WHERE organization_id = '00000000-0000-0000-0000-000000000000'
  ON CONFLICT (organization_id, status_type, from_status, to_status) DO NOTHING;
END;
$func$;

CREATE OR REPLACE FUNCTION rpc_create_factory(
  p_organization_id uuid, p_idempotency_key text, p_correlation_id text, p_actor_id text,
  p_name text, p_tax_id text, p_payment_terms payment_terms_enum, p_payment_method payment_method_enum,
  p_address text DEFAULT NULL, p_contact_name text DEFAULT NULL, p_phone text DEFAULT NULL,
  p_email text DEFAULT NULL, p_external_customer_id text DEFAULT NULL, p_flex_data jsonb DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
DECLARE v_cached_id text; v_row factories;
BEGIN
  PERFORM set_audit_context(p_actor_id, p_correlation_id);
  SELECT result_summary INTO v_cached_id FROM idempotency_log WHERE key = p_idempotency_key AND organization_id = p_organization_id;
  IF FOUND THEN
    SELECT * INTO v_row FROM factories WHERE id = v_cached_id::uuid AND organization_id = p_organization_id;
    RETURN to_jsonb(v_row);
  END IF;
  INSERT INTO factories (organization_id, name, tax_id, payment_terms, payment_method, address, contact_name, phone, email, external_customer_id, flex_data)
  VALUES (p_organization_id, p_name, p_tax_id, p_payment_terms, p_payment_method, p_address, p_contact_name, p_phone, p_email, p_external_customer_id, p_flex_data)
  RETURNING * INTO v_row;
  INSERT INTO idempotency_log (key, organization_id, operation, result_summary) VALUES (p_idempotency_key, p_organization_id, 'create_factory', v_row.id::text);
  PERFORM emit_domain_event(p_organization_id, 'factory', v_row.id, 'factory.created', to_jsonb(v_row), p_actor_id, p_correlation_id);
  RETURN to_jsonb(v_row);
END;
$func$;

CREATE OR REPLACE FUNCTION rpc_update_factory(
  p_organization_id uuid, p_idempotency_key text, p_correlation_id text, p_actor_id text,
  p_factory_id uuid, p_expected_version integer, p_patch jsonb
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
DECLARE v_cached_id text; v_row factories; v_count integer;
BEGIN
  PERFORM set_audit_context(p_actor_id, p_correlation_id);
  SELECT result_summary INTO v_cached_id FROM idempotency_log WHERE key = p_idempotency_key AND organization_id = p_organization_id;
  IF FOUND THEN
    SELECT * INTO v_row FROM factories WHERE id = v_cached_id::uuid AND organization_id = p_organization_id;
    RETURN to_jsonb(v_row);
  END IF;
  UPDATE factories SET
    name                 = CASE WHEN p_patch ? 'name'                 THEN p_patch ->>'name'                                  ELSE name                 END,
    tax_id               = CASE WHEN p_patch ? 'tax_id'               THEN p_patch ->>'tax_id'                                ELSE tax_id               END,
    address              = CASE WHEN p_patch ? 'address'              THEN p_patch ->>'address'                               ELSE address              END,
    contact_name         = CASE WHEN p_patch ? 'contact_name'         THEN p_patch ->>'contact_name'                         ELSE contact_name         END,
    phone                = CASE WHEN p_patch ? 'phone'                THEN p_patch ->>'phone'                                 ELSE phone                END,
    email                = CASE WHEN p_patch ? 'email'                THEN p_patch ->>'email'                                 ELSE email                END,
    external_customer_id = CASE WHEN p_patch ? 'external_customer_id' THEN p_patch ->>'external_customer_id'                 ELSE external_customer_id END,
    payment_terms        = CASE WHEN p_patch ? 'payment_terms'        THEN (p_patch->>'payment_terms')::payment_terms_enum   ELSE payment_terms        END,
    payment_method       = CASE WHEN p_patch ? 'payment_method'       THEN (p_patch->>'payment_method')::payment_method_enum ELSE payment_method       END,
    status               = CASE WHEN p_patch ? 'status'               THEN (p_patch->>'status')::entity_status_enum          ELSE status               END,
    flex_data            = CASE WHEN p_patch ? 'flex_data'            THEN p_patch ->'flex_data'                              ELSE flex_data            END
  WHERE id = p_factory_id AND organization_id = p_organization_id AND version_number = p_expected_version AND is_deleted = false
  RETURNING * INTO v_row;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count = 0 THEN RAISE EXCEPTION 'OPTIMISTIC_LOCK_CONFLICT_OR_NOT_FOUND: factory %, expected version %', p_factory_id, p_expected_version USING ERRCODE = 'P0001'; END IF;
  INSERT INTO idempotency_log (key, organization_id, operation, result_summary) VALUES (p_idempotency_key, p_organization_id, 'update_factory', v_row.id::text);
  PERFORM emit_domain_event(p_organization_id, 'factory', v_row.id, 'factory.updated', jsonb_build_object('patch', p_patch, 'new_version', v_row.version_number), p_actor_id, p_correlation_id);
  RETURN to_jsonb(v_row);
END;
$func$;

CREATE OR REPLACE FUNCTION rpc_archive_factory(
  p_organization_id uuid, p_idempotency_key text, p_correlation_id text, p_actor_id text,
  p_factory_id uuid, p_expected_version integer, p_inactive_reason text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
DECLARE v_cached_id text; v_row factories; v_count integer; v_active_jobs integer;
BEGIN
  PERFORM set_audit_context(p_actor_id, p_correlation_id);
  SELECT result_summary INTO v_cached_id FROM idempotency_log WHERE key = p_idempotency_key AND organization_id = p_organization_id;
  IF FOUND THEN
    SELECT * INTO v_row FROM factories WHERE id = v_cached_id::uuid AND organization_id = p_organization_id;
    RETURN to_jsonb(v_row);
  END IF;
  SELECT COUNT(*) INTO v_active_jobs FROM jobs
   WHERE factory_id = p_factory_id AND organization_id = p_organization_id
     AND operational_status NOT IN ('Cancelled') AND accounting_status NOT IN ('Paid', 'Closed');
  IF v_active_jobs > 0 THEN RAISE EXCEPTION 'PRECONDITION_FAILED: factory % has % unresolved job(s)', p_factory_id, v_active_jobs USING ERRCODE = 'P0001'; END IF;
  UPDATE factories SET is_deleted = true, archived_at = now(), inactive_reason = p_inactive_reason, status = 'Inactive'
  WHERE id = p_factory_id AND organization_id = p_organization_id AND version_number = p_expected_version AND is_deleted = false
  RETURNING * INTO v_row;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count = 0 THEN RAISE EXCEPTION 'OPTIMISTIC_LOCK_CONFLICT_OR_NOT_FOUND: factory %, expected version %', p_factory_id, p_expected_version USING ERRCODE = 'P0001'; END IF;
  INSERT INTO idempotency_log (key, organization_id, operation, result_summary) VALUES (p_idempotency_key, p_organization_id, 'archive_factory', v_row.id::text);
  PERFORM emit_domain_event(p_organization_id, 'factory', v_row.id, 'factory.archived', jsonb_build_object('inactive_reason', p_inactive_reason), p_actor_id, p_correlation_id);
  RETURN to_jsonb(v_row);
END;
$func$;

CREATE OR REPLACE FUNCTION rpc_create_supervisor(
  p_organization_id uuid, p_idempotency_key text, p_correlation_id text, p_actor_id text,
  p_name text, p_national_id text, p_payment_type payment_type_enum, p_monthly_salary_cost numeric,
  p_phone text DEFAULT NULL, p_email text DEFAULT NULL, p_address text DEFAULT NULL,
  p_bank_code text DEFAULT NULL, p_bank_branch text DEFAULT NULL,
  p_bank_account text DEFAULT NULL, p_bank_account_type text DEFAULT NULL, p_flex_data jsonb DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
DECLARE v_cached_id text; v_row supervisors;
BEGIN
  PERFORM set_audit_context(p_actor_id, p_correlation_id);
  SELECT result_summary INTO v_cached_id FROM idempotency_log WHERE key = p_idempotency_key AND organization_id = p_organization_id;
  IF FOUND THEN
    SELECT * INTO v_row FROM supervisors WHERE id = v_cached_id::uuid AND organization_id = p_organization_id;
    RETURN to_jsonb(v_row);
  END IF;
  INSERT INTO supervisors (organization_id, name, national_id, payment_type, monthly_salary_cost, phone, email, address, bank_code, bank_branch, bank_account, bank_account_type, flex_data)
  VALUES (p_organization_id, p_name, p_national_id, p_payment_type, p_monthly_salary_cost, p_phone, p_email, p_address, p_bank_code, p_bank_branch, p_bank_account, p_bank_account_type, p_flex_data)
  RETURNING * INTO v_row;
  INSERT INTO idempotency_log (key, organization_id, operation, result_summary) VALUES (p_idempotency_key, p_organization_id, 'create_supervisor', v_row.id::text);
  PERFORM emit_domain_event(p_organization_id, 'supervisor', v_row.id, 'supervisor.created', to_jsonb(v_row), p_actor_id, p_correlation_id);
  RETURN to_jsonb(v_row);
END;
$func$;

CREATE OR REPLACE FUNCTION rpc_update_supervisor(
  p_organization_id uuid, p_idempotency_key text, p_correlation_id text, p_actor_id text,
  p_supervisor_id uuid, p_expected_version integer, p_patch jsonb
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
DECLARE v_cached_id text; v_row supervisors; v_count integer;
BEGIN
  PERFORM set_audit_context(p_actor_id, p_correlation_id);
  SELECT result_summary INTO v_cached_id FROM idempotency_log WHERE key = p_idempotency_key AND organization_id = p_organization_id;
  IF FOUND THEN
    SELECT * INTO v_row FROM supervisors WHERE id = v_cached_id::uuid AND organization_id = p_organization_id;
    RETURN to_jsonb(v_row);
  END IF;
  UPDATE supervisors SET
    name                = CASE WHEN p_patch ? 'name'                THEN p_patch ->>'name'                              ELSE name                END,
    national_id         = CASE WHEN p_patch ? 'national_id'         THEN p_patch ->>'national_id'                       ELSE national_id         END,
    phone               = CASE WHEN p_patch ? 'phone'               THEN p_patch ->>'phone'                             ELSE phone               END,
    email               = CASE WHEN p_patch ? 'email'               THEN p_patch ->>'email'                             ELSE email               END,
    address             = CASE WHEN p_patch ? 'address'             THEN p_patch ->>'address'                           ELSE address             END,
    payment_type        = CASE WHEN p_patch ? 'payment_type'        THEN (p_patch->>'payment_type')::payment_type_enum  ELSE payment_type        END,
    monthly_salary_cost = CASE WHEN p_patch ? 'monthly_salary_cost' THEN (p_patch->>'monthly_salary_cost')::numeric     ELSE monthly_salary_cost END,
    bank_code           = CASE WHEN p_patch ? 'bank_code'           THEN p_patch ->>'bank_code'                         ELSE bank_code           END,
    bank_branch         = CASE WHEN p_patch ? 'bank_branch'         THEN p_patch ->>'bank_branch'                       ELSE bank_branch         END,
    bank_account        = CASE WHEN p_patch ? 'bank_account'        THEN p_patch ->>'bank_account'                      ELSE bank_account        END,
    bank_account_type   = CASE WHEN p_patch ? 'bank_account_type'   THEN p_patch ->>'bank_account_type'                ELSE bank_account_type   END,
    status              = CASE WHEN p_patch ? 'status'              THEN (p_patch->>'status')::entity_status_enum       ELSE status              END,
    flex_data           = CASE WHEN p_patch ? 'flex_data'           THEN p_patch ->'flex_data'                          ELSE flex_data           END
  WHERE id = p_supervisor_id AND organization_id = p_organization_id AND version_number = p_expected_version AND is_deleted = false
  RETURNING * INTO v_row;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count = 0 THEN RAISE EXCEPTION 'OPTIMISTIC_LOCK_CONFLICT_OR_NOT_FOUND: supervisor %, expected version %', p_supervisor_id, p_expected_version USING ERRCODE = 'P0001'; END IF;
  INSERT INTO idempotency_log (key, organization_id, operation, result_summary) VALUES (p_idempotency_key, p_organization_id, 'update_supervisor', v_row.id::text);
  PERFORM emit_domain_event(p_organization_id, 'supervisor', v_row.id, 'supervisor.updated', jsonb_build_object('patch', p_patch, 'new_version', v_row.version_number), p_actor_id, p_correlation_id);
  RETURN to_jsonb(v_row);
END;
$func$;

CREATE OR REPLACE FUNCTION rpc_archive_supervisor(
  p_organization_id uuid, p_idempotency_key text, p_correlation_id text, p_actor_id text,
  p_supervisor_id uuid, p_expected_version integer, p_inactive_reason text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
DECLARE v_cached_id text; v_row supervisors; v_count integer; v_active_jobs integer;
BEGIN
  PERFORM set_audit_context(p_actor_id, p_correlation_id);
  SELECT result_summary INTO v_cached_id FROM idempotency_log WHERE key = p_idempotency_key AND organization_id = p_organization_id;
  IF FOUND THEN
    SELECT * INTO v_row FROM supervisors WHERE id = v_cached_id::uuid AND organization_id = p_organization_id;
    RETURN to_jsonb(v_row);
  END IF;
  SELECT COUNT(*) INTO v_active_jobs FROM jobs
   WHERE supervisor_id = p_supervisor_id AND organization_id = p_organization_id
     AND operational_status NOT IN ('Cancelled') AND accounting_status NOT IN ('Paid', 'Closed');
  IF v_active_jobs > 0 THEN RAISE EXCEPTION 'PRECONDITION_FAILED: supervisor % has % unresolved job(s)', p_supervisor_id, v_active_jobs USING ERRCODE = 'P0001'; END IF;
  UPDATE supervisors SET is_deleted = true, archived_at = now(), inactive_reason = p_inactive_reason, status = 'Inactive'
  WHERE id = p_supervisor_id AND organization_id = p_organization_id AND version_number = p_expected_version AND is_deleted = false
  RETURNING * INTO v_row;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count = 0 THEN RAISE EXCEPTION 'OPTIMISTIC_LOCK_CONFLICT_OR_NOT_FOUND: supervisor %, expected version %', p_supervisor_id, p_expected_version USING ERRCODE = 'P0001'; END IF;
  INSERT INTO idempotency_log (key, organization_id, operation, result_summary) VALUES (p_idempotency_key, p_organization_id, 'archive_supervisor', v_row.id::text);
  PERFORM emit_domain_event(p_organization_id, 'supervisor', v_row.id, 'supervisor.archived', jsonb_build_object('inactive_reason', p_inactive_reason), p_actor_id, p_correlation_id);
  RETURN to_jsonb(v_row);
END;
$func$;

CREATE OR REPLACE FUNCTION rpc_create_job(
  p_organization_id uuid, p_idempotency_key text, p_correlation_id text, p_actor_id text,
  p_factory_id uuid, p_supervisor_id uuid, p_billing_month smallint, p_billing_year smallint,
  p_factory_charge_amount numeric, p_supervisor_payout_amount numeric
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
DECLARE v_cached_id text; v_row jobs; v_job_code text;
BEGIN
  PERFORM set_audit_context(p_actor_id, p_correlation_id);
  SELECT result_summary INTO v_cached_id FROM idempotency_log WHERE key = p_idempotency_key AND organization_id = p_organization_id;
  IF FOUND THEN
    SELECT * INTO v_row FROM jobs WHERE id = v_cached_id::uuid AND organization_id = p_organization_id;
    RETURN to_jsonb(v_row);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM factories WHERE id = p_factory_id AND organization_id = p_organization_id AND is_deleted = false AND status = 'Active') THEN
    RAISE EXCEPTION 'NOT_FOUND_OR_INACTIVE: factory % in org %', p_factory_id, p_organization_id USING ERRCODE = 'P0001';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM supervisors WHERE id = p_supervisor_id AND organization_id = p_organization_id AND is_deleted = false AND status = 'Active') THEN
    RAISE EXCEPTION 'NOT_FOUND_OR_INACTIVE: supervisor % in org %', p_supervisor_id, p_organization_id USING ERRCODE = 'P0001';
  END IF;
  v_job_code := 'J' || LPAD(p_billing_year::text, 4, '0') || LPAD(p_billing_month::text, 2, '0') || '-' || upper(left(replace(gen_random_uuid()::text, '-', ''), 6));
  INSERT INTO jobs (organization_id, job_code, factory_id, supervisor_id, billing_month, billing_year, factory_charge_amount, supervisor_payout_amount)
  VALUES (p_organization_id, v_job_code, p_factory_id, p_supervisor_id, p_billing_month, p_billing_year, p_factory_charge_amount, p_supervisor_payout_amount)
  RETURNING * INTO v_row;
  INSERT INTO idempotency_log (key, organization_id, operation, result_summary) VALUES (p_idempotency_key, p_organization_id, 'create_job', v_row.id::text);
  PERFORM emit_domain_event(p_organization_id, 'job', v_row.id, 'job.created', to_jsonb(v_row), p_actor_id, p_correlation_id);
  RETURN to_jsonb(v_row);
END;
$func$;

CREATE OR REPLACE FUNCTION rpc_advance_operational_status(
  p_organization_id uuid, p_idempotency_key text, p_correlation_id text, p_actor_id text,
  p_job_id uuid, p_expected_version integer, p_to_status operational_status_enum
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
DECLARE v_cached_id text; v_row jobs; v_count integer;
BEGIN
  PERFORM set_audit_context(p_actor_id, p_correlation_id);
  SELECT result_summary INTO v_cached_id FROM idempotency_log WHERE key = p_idempotency_key AND organization_id = p_organization_id;
  IF FOUND THEN
    SELECT * INTO v_row FROM jobs WHERE id = v_cached_id::uuid AND organization_id = p_organization_id;
    RETURN to_jsonb(v_row);
  END IF;
  UPDATE jobs SET operational_status = p_to_status
  WHERE id = p_job_id AND organization_id = p_organization_id AND version_number = p_expected_version
  RETURNING * INTO v_row;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count = 0 THEN RAISE EXCEPTION 'OPTIMISTIC_LOCK_CONFLICT_OR_NOT_FOUND: job %, expected version %', p_job_id, p_expected_version USING ERRCODE = 'P0001'; END IF;
  INSERT INTO idempotency_log (key, organization_id, operation, result_summary) VALUES (p_idempotency_key, p_organization_id, 'advance_operational_status', v_row.id::text);
  PERFORM emit_domain_event(p_organization_id, 'job', v_row.id, 'job.operational_status_advanced', jsonb_build_object('to_status', p_to_status, 'new_version', v_row.version_number), p_actor_id, p_correlation_id);
  RETURN to_jsonb(v_row);
END;
$func$;

CREATE OR REPLACE FUNCTION rpc_advance_accounting_status(
  p_organization_id uuid, p_idempotency_key text, p_correlation_id text, p_actor_id text,
  p_job_id uuid, p_expected_version integer, p_to_status accounting_status_enum
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
DECLARE v_cached_id text; v_row jobs; v_count integer;
BEGIN
  PERFORM set_audit_context(p_actor_id, p_correlation_id);
  SELECT result_summary INTO v_cached_id FROM idempotency_log WHERE key = p_idempotency_key AND organization_id = p_organization_id;
  IF FOUND THEN
    SELECT * INTO v_row FROM jobs WHERE id = v_cached_id::uuid AND organization_id = p_organization_id;
    RETURN to_jsonb(v_row);
  END IF;
  IF p_to_status = 'Queued_For_MASAV' THEN
    PERFORM pg_advisory_xact_lock(hashtext('masav_batch:' || p_organization_id::text));
  END IF;
  UPDATE jobs SET accounting_status = p_to_status
  WHERE id = p_job_id AND organization_id = p_organization_id AND version_number = p_expected_version
  RETURNING * INTO v_row;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count = 0 THEN RAISE EXCEPTION 'OPTIMISTIC_LOCK_CONFLICT_OR_NOT_FOUND: job %, expected version %', p_job_id, p_expected_version USING ERRCODE = 'P0001'; END IF;
  INSERT INTO idempotency_log (key, organization_id, operation, result_summary) VALUES (p_idempotency_key, p_organization_id, 'advance_accounting_status', v_row.id::text);
  PERFORM emit_domain_event(p_organization_id, 'job', v_row.id, 'job.accounting_status_advanced', jsonb_build_object('to_status', p_to_status, 'new_version', v_row.version_number), p_actor_id, p_correlation_id);
  RETURN to_jsonb(v_row);
END;
$func$;

CREATE OR REPLACE FUNCTION rpc_append_financial_event(
  p_organization_id uuid, p_idempotency_key text, p_correlation_id text, p_actor_id text,
  p_job_id uuid, p_event_type financial_event_type_enum, p_amount numeric,
  p_description text DEFAULT NULL, p_metadata jsonb DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
DECLARE v_cached_id text; v_row financial_events;
BEGIN
  PERFORM set_audit_context(p_actor_id, p_correlation_id);
  SELECT result_summary INTO v_cached_id FROM idempotency_log WHERE key = p_idempotency_key AND organization_id = p_organization_id;
  IF FOUND THEN
    SELECT * INTO v_row FROM financial_events WHERE id = v_cached_id::uuid AND organization_id = p_organization_id;
    RETURN to_jsonb(v_row);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM jobs WHERE id = p_job_id AND organization_id = p_organization_id) THEN
    RAISE EXCEPTION 'NOT_FOUND: job % in org %', p_job_id, p_organization_id USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO financial_events (organization_id, event_type, job_id, amount, description, idempotency_key, correlation_id, metadata)
  VALUES (p_organization_id, p_event_type, p_job_id, p_amount, p_description, p_idempotency_key, p_correlation_id, p_metadata)
  RETURNING * INTO v_row;
  INSERT INTO idempotency_log (key, organization_id, operation, result_summary) VALUES (p_idempotency_key, p_organization_id, 'append_financial_event', v_row.id::text);
  PERFORM emit_domain_event(p_organization_id, 'job', p_job_id, 'financial_event.appended', to_jsonb(v_row), p_actor_id, p_correlation_id);
  RETURN to_jsonb(v_row);
END;
$func$;

CREATE OR REPLACE FUNCTION rpc_upsert_flex_field_definition(
  p_organization_id uuid, p_idempotency_key text, p_correlation_id text, p_actor_id text,
  p_entity_type flex_field_entity_type_enum, p_field_key text, p_label text,
  p_field_type flex_field_type_enum, p_display_order integer DEFAULT 0,
  p_is_required boolean DEFAULT false, p_enum_options text[] DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
DECLARE v_cached_id text; v_row flex_field_definitions;
BEGIN
  PERFORM set_audit_context(p_actor_id, p_correlation_id);
  SELECT result_summary INTO v_cached_id FROM idempotency_log WHERE key = p_idempotency_key AND organization_id = p_organization_id;
  IF FOUND THEN
    SELECT * INTO v_row FROM flex_field_definitions WHERE id = v_cached_id::uuid AND organization_id = p_organization_id;
    RETURN to_jsonb(v_row);
  END IF;
  INSERT INTO flex_field_definitions (organization_id, entity_type, field_key, label, field_type, display_order, is_required, enum_options)
  VALUES (p_organization_id, p_entity_type, p_field_key, p_label, p_field_type, p_display_order, p_is_required, p_enum_options)
  ON CONFLICT (organization_id, entity_type, field_key) DO UPDATE SET
    label = EXCLUDED.label, field_type = EXCLUDED.field_type,
    display_order = EXCLUDED.display_order, is_required = EXCLUDED.is_required, enum_options = EXCLUDED.enum_options
  RETURNING * INTO v_row;
  INSERT INTO idempotency_log (key, organization_id, operation, result_summary) VALUES (p_idempotency_key, p_organization_id, 'upsert_flex_field_definition', v_row.id::text);
  PERFORM emit_domain_event(p_organization_id, 'flex_field_definition', v_row.id, 'flex_field_definition.upserted', to_jsonb(v_row), p_actor_id, p_correlation_id);
  RETURN to_jsonb(v_row);
END;
$func$;

CREATE OR REPLACE FUNCTION rpc_upsert_system_setting(
  p_organization_id uuid, p_actor_id text, p_key text, p_value jsonb, p_description text DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
BEGIN
  INSERT INTO system_settings (key, organization_id, value, description, updated_by)
  VALUES (p_key, p_organization_id, p_value, p_description, p_actor_id)
  ON CONFLICT (key, organization_id) DO UPDATE SET
    value = EXCLUDED.value,
    description = COALESCE(EXCLUDED.description, system_settings.description),
    updated_at = now(),
    updated_by = EXCLUDED.updated_by;
END;
$func$;

-- ---------------------------------------------------------------------------
-- PHASE D: Read RPCs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION rpc_get_factory_by_id(p_organization_id uuid, p_factory_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
DECLARE v_row factories;
BEGIN
  SELECT * INTO v_row FROM factories WHERE id = p_factory_id AND organization_id = p_organization_id;
  RETURN CASE WHEN FOUND THEN to_jsonb(v_row) ELSE NULL END;
END;
$func$;

CREATE OR REPLACE FUNCTION rpc_list_factories(
  p_organization_id uuid, p_status entity_status_enum DEFAULT NULL,
  p_search text DEFAULT NULL, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
DECLARE v_total integer; v_items jsonb;
BEGIN
  SELECT COUNT(*) INTO v_total FROM factories
   WHERE organization_id = p_organization_id AND is_deleted = false
     AND (p_status IS NULL OR status = p_status)
     AND (p_search IS NULL OR name ILIKE '%' || p_search || '%');
  SELECT COALESCE(jsonb_agg(to_jsonb(f.*) ORDER BY f.name), '[]'::jsonb) INTO v_items
    FROM (SELECT * FROM factories WHERE organization_id = p_organization_id AND is_deleted = false
           AND (p_status IS NULL OR status = p_status)
           AND (p_search IS NULL OR name ILIKE '%' || p_search || '%')
           ORDER BY name LIMIT p_limit OFFSET p_offset) f;
  RETURN jsonb_build_object('items', v_items, 'total_count', v_total);
END;
$func$;

CREATE OR REPLACE FUNCTION rpc_get_supervisor_by_id(p_organization_id uuid, p_supervisor_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
DECLARE v_row supervisors;
BEGIN
  SELECT * INTO v_row FROM supervisors WHERE id = p_supervisor_id AND organization_id = p_organization_id;
  RETURN CASE WHEN FOUND THEN to_jsonb(v_row) ELSE NULL END;
END;
$func$;

CREATE OR REPLACE FUNCTION rpc_list_supervisors(
  p_organization_id uuid, p_status entity_status_enum DEFAULT NULL,
  p_search text DEFAULT NULL, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
DECLARE v_total integer; v_items jsonb;
BEGIN
  SELECT COUNT(*) INTO v_total FROM supervisors
   WHERE organization_id = p_organization_id AND is_deleted = false
     AND (p_status IS NULL OR status = p_status)
     AND (p_search IS NULL OR name ILIKE '%' || p_search || '%');
  SELECT COALESCE(jsonb_agg(to_jsonb(s.*) ORDER BY s.name), '[]'::jsonb) INTO v_items
    FROM (SELECT * FROM supervisors WHERE organization_id = p_organization_id AND is_deleted = false
           AND (p_status IS NULL OR status = p_status)
           AND (p_search IS NULL OR name ILIKE '%' || p_search || '%')
           ORDER BY name LIMIT p_limit OFFSET p_offset) s;
  RETURN jsonb_build_object('items', v_items, 'total_count', v_total);
END;
$func$;

CREATE OR REPLACE FUNCTION rpc_get_job_by_id(p_organization_id uuid, p_job_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
DECLARE v_row jobs;
BEGIN
  SELECT * INTO v_row FROM jobs WHERE id = p_job_id AND organization_id = p_organization_id;
  RETURN CASE WHEN FOUND THEN to_jsonb(v_row) ELSE NULL END;
END;
$func$;

CREATE OR REPLACE FUNCTION rpc_list_jobs(
  p_organization_id uuid,
  p_operational_status operational_status_enum DEFAULT NULL,
  p_accounting_status  accounting_status_enum  DEFAULT NULL,
  p_factory_id         uuid                    DEFAULT NULL,
  p_supervisor_id      uuid                    DEFAULT NULL,
  p_billing_month      smallint                DEFAULT NULL,
  p_billing_year       smallint                DEFAULT NULL,
  p_limit              integer                 DEFAULT 50,
  p_offset             integer                 DEFAULT 0
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
DECLARE v_total integer; v_items jsonb;
BEGIN
  SELECT COUNT(*) INTO v_total FROM jobs
   WHERE organization_id = p_organization_id
     AND (p_operational_status IS NULL OR operational_status = p_operational_status)
     AND (p_accounting_status  IS NULL OR accounting_status  = p_accounting_status)
     AND (p_factory_id         IS NULL OR factory_id         = p_factory_id)
     AND (p_supervisor_id      IS NULL OR supervisor_id      = p_supervisor_id)
     AND (p_billing_month      IS NULL OR billing_month      = p_billing_month)
     AND (p_billing_year       IS NULL OR billing_year       = p_billing_year);
  SELECT COALESCE(jsonb_agg(to_jsonb(j.*) ORDER BY j.billing_year DESC, j.billing_month DESC, j.created_at DESC), '[]'::jsonb) INTO v_items
    FROM (SELECT * FROM jobs WHERE organization_id = p_organization_id
           AND (p_operational_status IS NULL OR operational_status = p_operational_status)
           AND (p_accounting_status  IS NULL OR accounting_status  = p_accounting_status)
           AND (p_factory_id         IS NULL OR factory_id         = p_factory_id)
           AND (p_supervisor_id      IS NULL OR supervisor_id      = p_supervisor_id)
           AND (p_billing_month      IS NULL OR billing_month      = p_billing_month)
           AND (p_billing_year       IS NULL OR billing_year       = p_billing_year)
           ORDER BY billing_year DESC, billing_month DESC, created_at DESC
           LIMIT p_limit OFFSET p_offset) j;
  RETURN jsonb_build_object('items', v_items, 'total_count', v_total);
END;
$func$;

CREATE OR REPLACE FUNCTION rpc_list_financial_events_by_job(
  p_organization_id uuid, p_job_id uuid, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
DECLARE v_total integer; v_items jsonb;
BEGIN
  SELECT COUNT(*) INTO v_total FROM financial_events WHERE organization_id = p_organization_id AND job_id = p_job_id;
  SELECT COALESCE(jsonb_agg(to_jsonb(fe.*) ORDER BY fe.created_at DESC), '[]'::jsonb) INTO v_items
    FROM (SELECT * FROM financial_events WHERE organization_id = p_organization_id AND job_id = p_job_id
           ORDER BY created_at DESC LIMIT p_limit OFFSET p_offset) fe;
  RETURN jsonb_build_object('items', v_items, 'total_count', v_total);
END;
$func$;

CREATE OR REPLACE FUNCTION rpc_list_flex_field_definitions(
  p_organization_id uuid, p_entity_type flex_field_entity_type_enum DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
DECLARE v_items jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(to_jsonb(d.*) ORDER BY d.entity_type, d.display_order), '[]'::jsonb) INTO v_items
    FROM flex_field_definitions d
   WHERE organization_id = p_organization_id
     AND (p_entity_type IS NULL OR entity_type = p_entity_type);
  RETURN v_items;
END;
$func$;

CREATE OR REPLACE FUNCTION rpc_get_system_setting(p_organization_id uuid, p_key text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
DECLARE v_row system_settings;
BEGIN
  SELECT * INTO v_row FROM system_settings WHERE key = p_key AND organization_id = p_organization_id;
  RETURN CASE WHEN FOUND THEN to_jsonb(v_row) ELSE NULL END;
END;
$func$;
