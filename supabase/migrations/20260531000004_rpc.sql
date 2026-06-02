-- =============================================================================
-- Phase C: RPC Functions
--
-- ALL writes to the database go through these SECURITY DEFINER functions.
-- Pattern for every write RPC:
--   1. set_audit_context(actor_id, correlation_id)  — feeds fn_write_audit_log
--   2. idempotency check → return cached result if duplicate key
--   3. business logic + guards
--   4. INSERT / UPDATE
--   5. INSERT into idempotency_log
--   6. emit_domain_event()
--   7. RETURN to_jsonb(row)
--
-- Optimistic locking: caller passes p_expected_version. The UPDATE WHERE clause
-- includes version_number = p_expected_version. If ROW_COUNT = 0, raise conflict.
-- The fn_increment_version_number trigger handles the actual increment.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- set_audit_context (internal helper)
-- Sets session-local variables consumed by fn_write_audit_log.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_audit_context(
  p_actor_id       text,
  p_correlation_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.actor_id',       p_actor_id,       true);
  PERFORM set_config('app.correlation_id', p_correlation_id, true);
END;
$$;

-- ---------------------------------------------------------------------------
-- emit_domain_event (internal helper)
-- Appends an immutable event to domain_events with a monotonic sequence_number
-- scoped to (organization_id, aggregate_type, aggregate_id).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION emit_domain_event(
  p_organization_id uuid,
  p_aggregate_type  text,
  p_aggregate_id    uuid,
  p_event_type      text,
  p_payload         jsonb,
  p_actor_id        text,
  p_correlation_id  text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seq bigint;
BEGIN
  SELECT COALESCE(MAX(sequence_number), 0) + 1 INTO v_seq
    FROM domain_events
   WHERE organization_id = p_organization_id
     AND aggregate_type  = p_aggregate_type
     AND aggregate_id    = p_aggregate_id;

  INSERT INTO domain_events
    (organization_id, aggregate_type, aggregate_id, event_type,
     payload, correlation_id, actor_id, sequence_number)
  VALUES
    (p_organization_id, p_aggregate_type, p_aggregate_id, p_event_type,
     p_payload, p_correlation_id, p_actor_id, v_seq);
END;
$$;

-- =============================================================================
-- ORGANIZATION PROVISIONING
-- =============================================================================

-- ---------------------------------------------------------------------------
-- rpc_provision_organization
-- Must be called once when a new organization is created.
-- Copies system allowed_transitions into the org's namespace so the state
-- machine trigger can validate job status changes.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION rpc_provision_organization(
  p_organization_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sys_org constant uuid := '00000000-0000-0000-0000-000000000000';
BEGIN
  INSERT INTO allowed_transitions (organization_id, status_type, from_status, to_status)
  SELECT p_organization_id, status_type, from_status, to_status
    FROM allowed_transitions
   WHERE organization_id = sys_org
  ON CONFLICT (organization_id, status_type, from_status, to_status) DO NOTHING;
END;
$$;

-- =============================================================================
-- FACTORY RPCs
-- =============================================================================

-- ---------------------------------------------------------------------------
-- rpc_create_factory
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION rpc_create_factory(
  p_organization_id      uuid,
  p_idempotency_key      text,
  p_correlation_id       text,
  p_actor_id             text,
  p_name                 text,
  p_tax_id               text,
  p_payment_terms        payment_terms_enum,
  p_payment_method       payment_method_enum,
  p_address              text  DEFAULT NULL,
  p_contact_name         text  DEFAULT NULL,
  p_phone                text  DEFAULT NULL,
  p_email                text  DEFAULT NULL,
  p_external_customer_id text  DEFAULT NULL,
  p_flex_data            jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cached_id text;
  v_row       factories;
BEGIN
  PERFORM set_audit_context(p_actor_id, p_correlation_id);

  SELECT result_summary INTO v_cached_id
    FROM idempotency_log
   WHERE key = p_idempotency_key AND organization_id = p_organization_id;
  IF FOUND THEN
    SELECT * INTO v_row FROM factories
     WHERE id = v_cached_id::uuid AND organization_id = p_organization_id;
    RETURN to_jsonb(v_row);
  END IF;

  INSERT INTO factories (
    organization_id, name, tax_id, payment_terms, payment_method,
    address, contact_name, phone, email, external_customer_id, flex_data
  ) VALUES (
    p_organization_id, p_name, p_tax_id, p_payment_terms, p_payment_method,
    p_address, p_contact_name, p_phone, p_email, p_external_customer_id, p_flex_data
  ) RETURNING * INTO v_row;

  INSERT INTO idempotency_log (key, organization_id, operation, result_summary)
  VALUES (p_idempotency_key, p_organization_id, 'create_factory', v_row.id::text);

  PERFORM emit_domain_event(
    p_organization_id, 'factory', v_row.id, 'factory.created',
    to_jsonb(v_row), p_actor_id, p_correlation_id
  );

  RETURN to_jsonb(v_row);
END;
$$;

-- ---------------------------------------------------------------------------
-- rpc_update_factory
-- p_patch is a JSON object containing only the fields to change.
-- Supported keys: name, tax_id, payment_terms, payment_method, address,
--   contact_name, phone, email, external_customer_id, flex_data, status.
-- Nullable fields (address, phone, etc.) are set to NULL when the key is
-- present with a null value — use the ? operator to distinguish "absent"
-- from "explicitly null".
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION rpc_update_factory(
  p_organization_id  uuid,
  p_idempotency_key  text,
  p_correlation_id   text,
  p_actor_id         text,
  p_factory_id       uuid,
  p_expected_version integer,
  p_patch            jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cached_id text;
  v_row       factories;
  v_count     integer;
BEGIN
  PERFORM set_audit_context(p_actor_id, p_correlation_id);

  SELECT result_summary INTO v_cached_id
    FROM idempotency_log
   WHERE key = p_idempotency_key AND organization_id = p_organization_id;
  IF FOUND THEN
    SELECT * INTO v_row FROM factories
     WHERE id = v_cached_id::uuid AND organization_id = p_organization_id;
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
  WHERE id              = p_factory_id
    AND organization_id = p_organization_id
    AND version_number  = p_expected_version
    AND is_deleted      = false
  RETURNING * INTO v_row;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count = 0 THEN
    RAISE EXCEPTION 'OPTIMISTIC_LOCK_CONFLICT_OR_NOT_FOUND: factory %, expected version %',
      p_factory_id, p_expected_version
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO idempotency_log (key, organization_id, operation, result_summary)
  VALUES (p_idempotency_key, p_organization_id, 'update_factory', v_row.id::text);

  PERFORM emit_domain_event(
    p_organization_id, 'factory', v_row.id, 'factory.updated',
    jsonb_build_object('patch', p_patch, 'new_version', v_row.version_number),
    p_actor_id, p_correlation_id
  );

  RETURN to_jsonb(v_row);
END;
$$;

-- ---------------------------------------------------------------------------
-- rpc_archive_factory
-- Soft-deletes the factory. Guards against active (unresolved) jobs.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION rpc_archive_factory(
  p_organization_id  uuid,
  p_idempotency_key  text,
  p_correlation_id   text,
  p_actor_id         text,
  p_factory_id       uuid,
  p_expected_version integer,
  p_inactive_reason  text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cached_id   text;
  v_row         factories;
  v_count       integer;
  v_active_jobs integer;
BEGIN
  PERFORM set_audit_context(p_actor_id, p_correlation_id);

  SELECT result_summary INTO v_cached_id
    FROM idempotency_log
   WHERE key = p_idempotency_key AND organization_id = p_organization_id;
  IF FOUND THEN
    SELECT * INTO v_row FROM factories
     WHERE id = v_cached_id::uuid AND organization_id = p_organization_id;
    RETURN to_jsonb(v_row);
  END IF;

  SELECT COUNT(*) INTO v_active_jobs
    FROM jobs
   WHERE factory_id       = p_factory_id
     AND organization_id  = p_organization_id
     AND operational_status NOT IN ('Cancelled')
     AND accounting_status  NOT IN ('Paid', 'Closed');

  IF v_active_jobs > 0 THEN
    RAISE EXCEPTION 'PRECONDITION_FAILED: factory % has % unresolved job(s) — close or cancel them first',
      p_factory_id, v_active_jobs
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE factories SET
    is_deleted      = true,
    archived_at     = now(),
    inactive_reason = p_inactive_reason,
    status          = 'Inactive'
  WHERE id              = p_factory_id
    AND organization_id = p_organization_id
    AND version_number  = p_expected_version
    AND is_deleted      = false
  RETURNING * INTO v_row;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count = 0 THEN
    RAISE EXCEPTION 'OPTIMISTIC_LOCK_CONFLICT_OR_NOT_FOUND: factory %, expected version %',
      p_factory_id, p_expected_version
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO idempotency_log (key, organization_id, operation, result_summary)
  VALUES (p_idempotency_key, p_organization_id, 'archive_factory', v_row.id::text);

  PERFORM emit_domain_event(
    p_organization_id, 'factory', v_row.id, 'factory.archived',
    jsonb_build_object('inactive_reason', p_inactive_reason),
    p_actor_id, p_correlation_id
  );

  RETURN to_jsonb(v_row);
END;
$$;

-- =============================================================================
-- SUPERVISOR RPCs
-- =============================================================================

-- ---------------------------------------------------------------------------
-- rpc_create_supervisor
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION rpc_create_supervisor(
  p_organization_id     uuid,
  p_idempotency_key     text,
  p_correlation_id      text,
  p_actor_id            text,
  p_name                text,
  p_national_id         text,
  p_payment_type        payment_type_enum,
  p_monthly_salary_cost numeric,
  p_phone               text  DEFAULT NULL,
  p_email               text  DEFAULT NULL,
  p_address             text  DEFAULT NULL,
  p_bank_code           text  DEFAULT NULL,
  p_bank_branch         text  DEFAULT NULL,
  p_bank_account        text  DEFAULT NULL,
  p_bank_account_type   text  DEFAULT NULL,
  p_flex_data           jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cached_id text;
  v_row       supervisors;
BEGIN
  PERFORM set_audit_context(p_actor_id, p_correlation_id);

  SELECT result_summary INTO v_cached_id
    FROM idempotency_log
   WHERE key = p_idempotency_key AND organization_id = p_organization_id;
  IF FOUND THEN
    SELECT * INTO v_row FROM supervisors
     WHERE id = v_cached_id::uuid AND organization_id = p_organization_id;
    RETURN to_jsonb(v_row);
  END IF;

  INSERT INTO supervisors (
    organization_id, name, national_id, payment_type, monthly_salary_cost,
    phone, email, address, bank_code, bank_branch, bank_account, bank_account_type, flex_data
  ) VALUES (
    p_organization_id, p_name, p_national_id, p_payment_type, p_monthly_salary_cost,
    p_phone, p_email, p_address, p_bank_code, p_bank_branch, p_bank_account, p_bank_account_type, p_flex_data
  ) RETURNING * INTO v_row;

  INSERT INTO idempotency_log (key, organization_id, operation, result_summary)
  VALUES (p_idempotency_key, p_organization_id, 'create_supervisor', v_row.id::text);

  PERFORM emit_domain_event(
    p_organization_id, 'supervisor', v_row.id, 'supervisor.created',
    to_jsonb(v_row), p_actor_id, p_correlation_id
  );

  RETURN to_jsonb(v_row);
END;
$$;

-- ---------------------------------------------------------------------------
-- rpc_update_supervisor
-- p_patch keys: name, national_id, payment_type, monthly_salary_cost, phone,
--   email, address, bank_code, bank_branch, bank_account, bank_account_type,
--   flex_data, status.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION rpc_update_supervisor(
  p_organization_id  uuid,
  p_idempotency_key  text,
  p_correlation_id   text,
  p_actor_id         text,
  p_supervisor_id    uuid,
  p_expected_version integer,
  p_patch            jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cached_id text;
  v_row       supervisors;
  v_count     integer;
BEGIN
  PERFORM set_audit_context(p_actor_id, p_correlation_id);

  SELECT result_summary INTO v_cached_id
    FROM idempotency_log
   WHERE key = p_idempotency_key AND organization_id = p_organization_id;
  IF FOUND THEN
    SELECT * INTO v_row FROM supervisors
     WHERE id = v_cached_id::uuid AND organization_id = p_organization_id;
    RETURN to_jsonb(v_row);
  END IF;

  UPDATE supervisors SET
    name                = CASE WHEN p_patch ? 'name'                THEN p_patch ->>'name'                                      ELSE name                END,
    national_id         = CASE WHEN p_patch ? 'national_id'         THEN p_patch ->>'national_id'                               ELSE national_id         END,
    phone               = CASE WHEN p_patch ? 'phone'               THEN p_patch ->>'phone'                                     ELSE phone               END,
    email               = CASE WHEN p_patch ? 'email'               THEN p_patch ->>'email'                                     ELSE email               END,
    address             = CASE WHEN p_patch ? 'address'             THEN p_patch ->>'address'                                   ELSE address             END,
    payment_type        = CASE WHEN p_patch ? 'payment_type'        THEN (p_patch->>'payment_type')::payment_type_enum          ELSE payment_type        END,
    monthly_salary_cost = CASE WHEN p_patch ? 'monthly_salary_cost' THEN (p_patch->>'monthly_salary_cost')::numeric             ELSE monthly_salary_cost END,
    bank_code           = CASE WHEN p_patch ? 'bank_code'           THEN p_patch ->>'bank_code'                                 ELSE bank_code           END,
    bank_branch         = CASE WHEN p_patch ? 'bank_branch'         THEN p_patch ->>'bank_branch'                               ELSE bank_branch         END,
    bank_account        = CASE WHEN p_patch ? 'bank_account'        THEN p_patch ->>'bank_account'                              ELSE bank_account        END,
    bank_account_type   = CASE WHEN p_patch ? 'bank_account_type'   THEN p_patch ->>'bank_account_type'                        ELSE bank_account_type   END,
    status              = CASE WHEN p_patch ? 'status'              THEN (p_patch->>'status')::entity_status_enum               ELSE status              END,
    flex_data           = CASE WHEN p_patch ? 'flex_data'           THEN p_patch ->'flex_data'                                  ELSE flex_data           END
  WHERE id              = p_supervisor_id
    AND organization_id = p_organization_id
    AND version_number  = p_expected_version
    AND is_deleted      = false
  RETURNING * INTO v_row;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count = 0 THEN
    RAISE EXCEPTION 'OPTIMISTIC_LOCK_CONFLICT_OR_NOT_FOUND: supervisor %, expected version %',
      p_supervisor_id, p_expected_version
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO idempotency_log (key, organization_id, operation, result_summary)
  VALUES (p_idempotency_key, p_organization_id, 'update_supervisor', v_row.id::text);

  PERFORM emit_domain_event(
    p_organization_id, 'supervisor', v_row.id, 'supervisor.updated',
    jsonb_build_object('patch', p_patch, 'new_version', v_row.version_number),
    p_actor_id, p_correlation_id
  );

  RETURN to_jsonb(v_row);
END;
$$;

-- ---------------------------------------------------------------------------
-- rpc_archive_supervisor
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION rpc_archive_supervisor(
  p_organization_id  uuid,
  p_idempotency_key  text,
  p_correlation_id   text,
  p_actor_id         text,
  p_supervisor_id    uuid,
  p_expected_version integer,
  p_inactive_reason  text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cached_id   text;
  v_row         supervisors;
  v_count       integer;
  v_active_jobs integer;
BEGIN
  PERFORM set_audit_context(p_actor_id, p_correlation_id);

  SELECT result_summary INTO v_cached_id
    FROM idempotency_log
   WHERE key = p_idempotency_key AND organization_id = p_organization_id;
  IF FOUND THEN
    SELECT * INTO v_row FROM supervisors
     WHERE id = v_cached_id::uuid AND organization_id = p_organization_id;
    RETURN to_jsonb(v_row);
  END IF;

  SELECT COUNT(*) INTO v_active_jobs
    FROM jobs
   WHERE supervisor_id    = p_supervisor_id
     AND organization_id  = p_organization_id
     AND operational_status NOT IN ('Cancelled')
     AND accounting_status  NOT IN ('Paid', 'Closed');

  IF v_active_jobs > 0 THEN
    RAISE EXCEPTION 'PRECONDITION_FAILED: supervisor % has % unresolved job(s) — close or cancel them first',
      p_supervisor_id, v_active_jobs
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE supervisors SET
    is_deleted      = true,
    archived_at     = now(),
    inactive_reason = p_inactive_reason,
    status          = 'Inactive'
  WHERE id              = p_supervisor_id
    AND organization_id = p_organization_id
    AND version_number  = p_expected_version
    AND is_deleted      = false
  RETURNING * INTO v_row;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count = 0 THEN
    RAISE EXCEPTION 'OPTIMISTIC_LOCK_CONFLICT_OR_NOT_FOUND: supervisor %, expected version %',
      p_supervisor_id, p_expected_version
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO idempotency_log (key, organization_id, operation, result_summary)
  VALUES (p_idempotency_key, p_organization_id, 'archive_supervisor', v_row.id::text);

  PERFORM emit_domain_event(
    p_organization_id, 'supervisor', v_row.id, 'supervisor.archived',
    jsonb_build_object('inactive_reason', p_inactive_reason),
    p_actor_id, p_correlation_id
  );

  RETURN to_jsonb(v_row);
END;
$$;

-- =============================================================================
-- JOB RPCs
-- =============================================================================

-- ---------------------------------------------------------------------------
-- rpc_create_job
-- job_code is auto-generated: J{YYYYMM}-{6 random uppercase hex chars}.
-- Verifies that factory and supervisor are active and belong to this org.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION rpc_create_job(
  p_organization_id          uuid,
  p_idempotency_key          text,
  p_correlation_id           text,
  p_actor_id                 text,
  p_factory_id               uuid,
  p_supervisor_id            uuid,
  p_billing_month            smallint,
  p_billing_year             smallint,
  p_factory_charge_amount    numeric,
  p_supervisor_payout_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cached_id text;
  v_row       jobs;
  v_job_code  text;
BEGIN
  PERFORM set_audit_context(p_actor_id, p_correlation_id);

  SELECT result_summary INTO v_cached_id
    FROM idempotency_log
   WHERE key = p_idempotency_key AND organization_id = p_organization_id;
  IF FOUND THEN
    SELECT * INTO v_row FROM jobs
     WHERE id = v_cached_id::uuid AND organization_id = p_organization_id;
    RETURN to_jsonb(v_row);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM factories
     WHERE id = p_factory_id AND organization_id = p_organization_id
       AND is_deleted = false AND status = 'Active'
  ) THEN
    RAISE EXCEPTION 'NOT_FOUND_OR_INACTIVE: factory % in org %',
      p_factory_id, p_organization_id
      USING ERRCODE = 'P0001';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM supervisors
     WHERE id = p_supervisor_id AND organization_id = p_organization_id
       AND is_deleted = false AND status = 'Active'
  ) THEN
    RAISE EXCEPTION 'NOT_FOUND_OR_INACTIVE: supervisor % in org %',
      p_supervisor_id, p_organization_id
      USING ERRCODE = 'P0001';
  END IF;

  v_job_code := 'J'
    || LPAD(p_billing_year::text,  4, '0')
    || LPAD(p_billing_month::text, 2, '0')
    || '-'
    || upper(left(replace(gen_random_uuid()::text, '-', ''), 6));

  INSERT INTO jobs (
    organization_id, job_code, factory_id, supervisor_id,
    billing_month, billing_year,
    factory_charge_amount, supervisor_payout_amount
  ) VALUES (
    p_organization_id, v_job_code, p_factory_id, p_supervisor_id,
    p_billing_month, p_billing_year,
    p_factory_charge_amount, p_supervisor_payout_amount
  ) RETURNING * INTO v_row;

  INSERT INTO idempotency_log (key, organization_id, operation, result_summary)
  VALUES (p_idempotency_key, p_organization_id, 'create_job', v_row.id::text);

  PERFORM emit_domain_event(
    p_organization_id, 'job', v_row.id, 'job.created',
    to_jsonb(v_row), p_actor_id, p_correlation_id
  );

  RETURN to_jsonb(v_row);
END;
$$;

-- ---------------------------------------------------------------------------
-- rpc_advance_operational_status
-- The fn_enforce_job_state_machine trigger validates the transition.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION rpc_advance_operational_status(
  p_organization_id  uuid,
  p_idempotency_key  text,
  p_correlation_id   text,
  p_actor_id         text,
  p_job_id           uuid,
  p_expected_version integer,
  p_to_status        operational_status_enum
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cached_id text;
  v_row       jobs;
  v_count     integer;
BEGIN
  PERFORM set_audit_context(p_actor_id, p_correlation_id);

  SELECT result_summary INTO v_cached_id
    FROM idempotency_log
   WHERE key = p_idempotency_key AND organization_id = p_organization_id;
  IF FOUND THEN
    SELECT * INTO v_row FROM jobs
     WHERE id = v_cached_id::uuid AND organization_id = p_organization_id;
    RETURN to_jsonb(v_row);
  END IF;

  UPDATE jobs
     SET operational_status = p_to_status
   WHERE id              = p_job_id
     AND organization_id = p_organization_id
     AND version_number  = p_expected_version
  RETURNING * INTO v_row;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count = 0 THEN
    RAISE EXCEPTION 'OPTIMISTIC_LOCK_CONFLICT_OR_NOT_FOUND: job %, expected version %',
      p_job_id, p_expected_version
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO idempotency_log (key, organization_id, operation, result_summary)
  VALUES (p_idempotency_key, p_organization_id, 'advance_operational_status', v_row.id::text);

  PERFORM emit_domain_event(
    p_organization_id, 'job', v_row.id, 'job.operational_status_advanced',
    jsonb_build_object('to_status', p_to_status, 'new_version', v_row.version_number),
    p_actor_id, p_correlation_id
  );

  RETURN to_jsonb(v_row);
END;
$$;

-- ---------------------------------------------------------------------------
-- rpc_advance_accounting_status
-- Advisory lock on Queued_For_MASAV transition to serialize MASAV batch
-- creation per organization (rule #11).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION rpc_advance_accounting_status(
  p_organization_id  uuid,
  p_idempotency_key  text,
  p_correlation_id   text,
  p_actor_id         text,
  p_job_id           uuid,
  p_expected_version integer,
  p_to_status        accounting_status_enum
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cached_id text;
  v_row       jobs;
  v_count     integer;
BEGIN
  PERFORM set_audit_context(p_actor_id, p_correlation_id);

  SELECT result_summary INTO v_cached_id
    FROM idempotency_log
   WHERE key = p_idempotency_key AND organization_id = p_organization_id;
  IF FOUND THEN
    SELECT * INTO v_row FROM jobs
     WHERE id = v_cached_id::uuid AND organization_id = p_organization_id;
    RETURN to_jsonb(v_row);
  END IF;

  -- Serialize concurrent MASAV batch creation within this organization.
  IF p_to_status = 'Queued_For_MASAV' THEN
    PERFORM pg_advisory_xact_lock(hashtext('masav_batch:' || p_organization_id::text));
  END IF;

  UPDATE jobs
     SET accounting_status = p_to_status
   WHERE id              = p_job_id
     AND organization_id = p_organization_id
     AND version_number  = p_expected_version
  RETURNING * INTO v_row;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count = 0 THEN
    RAISE EXCEPTION 'OPTIMISTIC_LOCK_CONFLICT_OR_NOT_FOUND: job %, expected version %',
      p_job_id, p_expected_version
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO idempotency_log (key, organization_id, operation, result_summary)
  VALUES (p_idempotency_key, p_organization_id, 'advance_accounting_status', v_row.id::text);

  PERFORM emit_domain_event(
    p_organization_id, 'job', v_row.id, 'job.accounting_status_advanced',
    jsonb_build_object('to_status', p_to_status, 'new_version', v_row.version_number),
    p_actor_id, p_correlation_id
  );

  RETURN to_jsonb(v_row);
END;
$$;

-- =============================================================================
-- FINANCIAL EVENT RPCs
-- =============================================================================

-- ---------------------------------------------------------------------------
-- rpc_append_financial_event
-- Appends an immutable entry to the financial ledger (rule #9).
-- The UNIQUE constraint on financial_events.idempotency_key provides a
-- second layer of duplicate protection beyond idempotency_log.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION rpc_append_financial_event(
  p_organization_id uuid,
  p_idempotency_key text,
  p_correlation_id  text,
  p_actor_id        text,
  p_job_id          uuid,
  p_event_type      financial_event_type_enum,
  p_amount          numeric,
  p_description     text  DEFAULT NULL,
  p_metadata        jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cached_id text;
  v_row       financial_events;
BEGIN
  PERFORM set_audit_context(p_actor_id, p_correlation_id);

  SELECT result_summary INTO v_cached_id
    FROM idempotency_log
   WHERE key = p_idempotency_key AND organization_id = p_organization_id;
  IF FOUND THEN
    SELECT * INTO v_row FROM financial_events
     WHERE id = v_cached_id::uuid AND organization_id = p_organization_id;
    RETURN to_jsonb(v_row);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM jobs
     WHERE id = p_job_id AND organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'NOT_FOUND: job % in org %', p_job_id, p_organization_id
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO financial_events (
    organization_id, event_type, job_id, amount,
    description, idempotency_key, correlation_id, metadata
  ) VALUES (
    p_organization_id, p_event_type, p_job_id, p_amount,
    p_description, p_idempotency_key, p_correlation_id, p_metadata
  ) RETURNING * INTO v_row;

  INSERT INTO idempotency_log (key, organization_id, operation, result_summary)
  VALUES (p_idempotency_key, p_organization_id, 'append_financial_event', v_row.id::text);

  PERFORM emit_domain_event(
    p_organization_id, 'job', p_job_id, 'financial_event.appended',
    to_jsonb(v_row), p_actor_id, p_correlation_id
  );

  RETURN to_jsonb(v_row);
END;
$$;

-- =============================================================================
-- CONFIGURATION RPCs
-- =============================================================================

-- ---------------------------------------------------------------------------
-- rpc_upsert_flex_field_definition
-- Creates or updates a custom field definition for factory or supervisor.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION rpc_upsert_flex_field_definition(
  p_organization_id uuid,
  p_idempotency_key text,
  p_correlation_id  text,
  p_actor_id        text,
  p_entity_type     flex_field_entity_type_enum,
  p_field_key       text,
  p_label           text,
  p_field_type      flex_field_type_enum,
  p_display_order   integer DEFAULT 0,
  p_is_required     boolean DEFAULT false,
  p_enum_options    text[]  DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cached_id text;
  v_row       flex_field_definitions;
BEGIN
  PERFORM set_audit_context(p_actor_id, p_correlation_id);

  SELECT result_summary INTO v_cached_id
    FROM idempotency_log
   WHERE key = p_idempotency_key AND organization_id = p_organization_id;
  IF FOUND THEN
    SELECT * INTO v_row FROM flex_field_definitions
     WHERE id = v_cached_id::uuid AND organization_id = p_organization_id;
    RETURN to_jsonb(v_row);
  END IF;

  INSERT INTO flex_field_definitions (
    organization_id, entity_type, field_key, label, field_type,
    display_order, is_required, enum_options
  ) VALUES (
    p_organization_id, p_entity_type, p_field_key, p_label, p_field_type,
    p_display_order, p_is_required, p_enum_options
  )
  ON CONFLICT (organization_id, entity_type, field_key) DO UPDATE SET
    label         = EXCLUDED.label,
    field_type    = EXCLUDED.field_type,
    display_order = EXCLUDED.display_order,
    is_required   = EXCLUDED.is_required,
    enum_options  = EXCLUDED.enum_options
  RETURNING * INTO v_row;

  INSERT INTO idempotency_log (key, organization_id, operation, result_summary)
  VALUES (p_idempotency_key, p_organization_id, 'upsert_flex_field_definition', v_row.id::text);

  PERFORM emit_domain_event(
    p_organization_id, 'flex_field_definition', v_row.id, 'flex_field_definition.upserted',
    to_jsonb(v_row), p_actor_id, p_correlation_id
  );

  RETURN to_jsonb(v_row);
END;
$$;

-- ---------------------------------------------------------------------------
-- rpc_upsert_system_setting
-- Creates or updates a key-value configuration entry (rule #12).
-- No idempotency_key: settings are idempotent by (key, organization_id).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION rpc_upsert_system_setting(
  p_organization_id uuid,
  p_actor_id        text,
  p_key             text,
  p_value           jsonb,
  p_description     text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO system_settings (key, organization_id, value, description, updated_by)
  VALUES (p_key, p_organization_id, p_value, p_description, p_actor_id)
  ON CONFLICT (key, organization_id) DO UPDATE SET
    value       = EXCLUDED.value,
    description = COALESCE(EXCLUDED.description, system_settings.description),
    updated_at  = now(),
    updated_by  = EXCLUDED.updated_by;
END;
$$;
