-- =============================================================================
-- Phase B: Initial Schema — Enterprise Financial Operations Platform v5.1
-- Every table has (id, organization_id) composite PK and filters enforced by
-- FKs so cross-org data leakage is impossible at the database level.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- ENUMS
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

-- ---------------------------------------------------------------------------
-- SYSTEM_SETTINGS
-- Key-value store for all thresholds, retry limits, feature flags, and
-- fuzzy-match scores — zero hard-coded values in application code (rule #12).
-- ---------------------------------------------------------------------------

CREATE TABLE system_settings (
  key             text        NOT NULL,
  organization_id uuid        NOT NULL,
  value           jsonb       NOT NULL,
  description     text,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  updated_by      text        NOT NULL,

  PRIMARY KEY (key, organization_id)
);

-- ---------------------------------------------------------------------------
-- FACTORIES
-- Soft-delete only (rule #10). tax_id is unique per organization.
-- ---------------------------------------------------------------------------

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

CREATE INDEX idx_factories_org_status     ON factories (organization_id, status);
CREATE INDEX idx_factories_org_deleted    ON factories (organization_id, is_deleted);
CREATE INDEX idx_factories_org_name       ON factories (organization_id, name);

-- ---------------------------------------------------------------------------
-- SUPERVISORS
-- Soft-delete only (rule #10). national_id unique per organization.
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- FLEX_FIELD_DEFINITIONS
-- Per-org custom fields for factories and supervisors.
-- field_key is unique per (org, entity_type).
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- JOBS
-- Core financial record. Dual state machine: operational + accounting.
-- job_code is unique per organization.
-- FKs are composite to enforce same-org relationships (rule #3).
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- FINANCIAL_EVENTS
-- Append-only ledger (rule #9). No UPDATE, no DELETE — ever.
-- idempotency_key is unique per organization to prevent duplicate entries.
-- No version_number (immutable records don't need optimistic locking).
-- No updated_at (never updated).
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- IDEMPOTENCY_LOG
-- Central guard against duplicate writes (rule #7).
-- PK is (key, organization_id) — lookup is always by key within an org.
-- ---------------------------------------------------------------------------

CREATE TABLE idempotency_log (
  key             text        NOT NULL,
  organization_id uuid        NOT NULL,
  operation       text        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  result_summary  text,

  PRIMARY KEY (key, organization_id)
);

CREATE INDEX idx_idempotency_org_created ON idempotency_log (organization_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- ALLOWED_TRANSITIONS
-- State machine truth table (rule #8). Seeded below.
-- Enforced by BEFORE UPDATE triggers in Phase C.
-- status_type: 'operational' | 'accounting'
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- OUTBOX
-- Transactional outbox for reliable event publishing.
-- processed_at IS NULL means pending; retry_count tracks failures.
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- INBOX
-- Idempotent inbound message store for external integrations.
-- idempotency_key prevents duplicate processing.
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- DOMAIN_EVENTS
-- Immutable audit trail of aggregate state changes.
-- sequence_number is set by RPC functions in Phase C to guarantee ordering.
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- AUDIT_LOGS
-- Row-level change log written by triggers in Phase C.
-- record_id is the PK of the changed row (id column only, not composite).
-- ---------------------------------------------------------------------------

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

-- =============================================================================
-- SEED: allowed_transitions
-- These rows are the state machine truth table.
-- Every real organization gets these defaults; custom workflows extend them.
-- The placeholder org '00000000-0000-0000-0000-000000000000' is used as a
-- system template — RPC functions in Phase C copy them per new org on signup.
-- =============================================================================

DO $$
DECLARE
  sys_org uuid := '00000000-0000-0000-0000-000000000000';
BEGIN
  -- Operational transitions: Draft → Waiting_Match → Partial_Match → Matched
  --                          Any non-terminal → Cancelled
  INSERT INTO allowed_transitions (organization_id, status_type, from_status, to_status) VALUES
    (sys_org, 'operational', 'Draft',          'Waiting_Match'),
    (sys_org, 'operational', 'Waiting_Match',  'Partial_Match'),
    (sys_org, 'operational', 'Waiting_Match',  'Matched'),
    (sys_org, 'operational', 'Partial_Match',  'Matched'),
    (sys_org, 'operational', 'Draft',          'Cancelled'),
    (sys_org, 'operational', 'Waiting_Match',  'Cancelled'),
    (sys_org, 'operational', 'Partial_Match',  'Cancelled');

  -- Accounting transitions: Pending_Approval → Approved → Queued_For_MASAV → Paid → Closed
  -- Approval and beyond require operational_status = Matched (enforced by trigger in Phase C).
  INSERT INTO allowed_transitions (organization_id, status_type, from_status, to_status) VALUES
    (sys_org, 'accounting', 'Pending_Approval', 'Approved'),
    (sys_org, 'accounting', 'Approved',         'Queued_For_MASAV'),
    (sys_org, 'accounting', 'Queued_For_MASAV', 'Paid'),
    (sys_org, 'accounting', 'Paid',             'Closed');
END $$;
