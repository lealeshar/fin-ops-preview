-- =============================================================================
-- Phase C: Row-Level Security
--
-- All authenticated reads are isolated by organization_id.
-- SECURITY DEFINER RPCs run as the function owner (postgres/superuser) and
-- therefore bypass RLS — these policies protect direct table access only.
--
-- Write policies are intentionally restrictive: for tables where all writes
-- go through RPCs, authenticated users get no direct write access.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- current_organization_id()
-- Resolves the active org from JWT claims or from set_config()
-- (set_config is used by RPCs when they need to run queries that hit RLS).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION current_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('app.organization_id', true), '')::uuid,
    (auth.jwt() ->> 'organization_id')::uuid
  );
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS on every table
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- system_settings
-- Read-only for authenticated users. All writes via rpc_upsert_system_setting.
-- ---------------------------------------------------------------------------
CREATE POLICY system_settings_select ON system_settings
  FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

-- ---------------------------------------------------------------------------
-- factories
-- Authenticated users can read and perform direct writes within their org.
-- Direct writes are additionally blocked at the application level (rule #2),
-- but the WITH CHECK here is a DB-level safety net.
-- ---------------------------------------------------------------------------
CREATE POLICY factories_org_isolation ON factories
  FOR ALL TO authenticated
  USING      (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

-- ---------------------------------------------------------------------------
-- supervisors
-- ---------------------------------------------------------------------------
CREATE POLICY supervisors_org_isolation ON supervisors
  FOR ALL TO authenticated
  USING      (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

-- ---------------------------------------------------------------------------
-- flex_field_definitions
-- ---------------------------------------------------------------------------
CREATE POLICY flex_defs_org_isolation ON flex_field_definitions
  FOR ALL TO authenticated
  USING      (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

-- ---------------------------------------------------------------------------
-- jobs
-- ---------------------------------------------------------------------------
CREATE POLICY jobs_org_isolation ON jobs
  FOR ALL TO authenticated
  USING      (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

-- ---------------------------------------------------------------------------
-- financial_events
-- Read-only for authenticated users. All inserts via rpc_append_financial_event.
-- UPDATE and DELETE are already blocked by triggers, but withholding the
-- policy is an additional layer of defense.
-- ---------------------------------------------------------------------------
CREATE POLICY financial_events_select ON financial_events
  FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

-- ---------------------------------------------------------------------------
-- idempotency_log
-- Read-only. Written exclusively by SECURITY DEFINER RPCs.
-- ---------------------------------------------------------------------------
CREATE POLICY idempotency_log_select ON idempotency_log
  FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

-- ---------------------------------------------------------------------------
-- allowed_transitions
-- Read-only. Configuration data modified only via rpc_provision_organization
-- or direct admin tooling (service_role).
-- ---------------------------------------------------------------------------
CREATE POLICY allowed_transitions_select ON allowed_transitions
  FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

-- ---------------------------------------------------------------------------
-- outbox / inbox
-- Read-only. Managed by background system workers running as service_role.
-- ---------------------------------------------------------------------------
CREATE POLICY outbox_select ON outbox
  FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY inbox_select ON inbox
  FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

-- ---------------------------------------------------------------------------
-- domain_events
-- Read-only audit trail of aggregate state changes.
-- ---------------------------------------------------------------------------
CREATE POLICY domain_events_select ON domain_events
  FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

-- ---------------------------------------------------------------------------
-- audit_logs
-- Read-only. Written by fn_write_audit_log (SECURITY DEFINER trigger).
-- ---------------------------------------------------------------------------
CREATE POLICY audit_logs_select ON audit_logs
  FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());
