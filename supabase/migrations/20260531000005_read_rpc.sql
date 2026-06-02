-- =============================================================================
-- Phase D: Read RPCs
-- All read access also goes through RPC so there are no direct supabase.from()
-- calls outside the Repository layer. SECURITY DEFINER ensures consistent
-- filtering — organization_id is always applied explicitly.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- rpc_get_factory_by_id
-- Returns NULL (not an exception) when not found; repositories handle the
-- "not found" case uniformly.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION rpc_get_factory_by_id(
  p_organization_id uuid,
  p_factory_id      uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row factories;
BEGIN
  SELECT * INTO v_row
    FROM factories
   WHERE id = p_factory_id AND organization_id = p_organization_id;
  RETURN CASE WHEN FOUND THEN to_jsonb(v_row) ELSE NULL END;
END;
$$;

-- ---------------------------------------------------------------------------
-- rpc_list_factories
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION rpc_list_factories(
  p_organization_id uuid,
  p_status          entity_status_enum DEFAULT NULL,
  p_search          text               DEFAULT NULL,
  p_limit           integer            DEFAULT 50,
  p_offset          integer            DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer;
  v_items jsonb;
BEGIN
  SELECT COUNT(*) INTO v_total
    FROM factories
   WHERE organization_id = p_organization_id
     AND is_deleted      = false
     AND (p_status IS NULL OR status  = p_status)
     AND (p_search IS NULL OR name ILIKE '%' || p_search || '%');

  SELECT COALESCE(jsonb_agg(to_jsonb(f.*) ORDER BY f.name), '[]'::jsonb)
    INTO v_items
    FROM (
      SELECT *
        FROM factories
       WHERE organization_id = p_organization_id
         AND is_deleted      = false
         AND (p_status IS NULL OR status  = p_status)
         AND (p_search IS NULL OR name ILIKE '%' || p_search || '%')
       ORDER BY name
       LIMIT  p_limit
       OFFSET p_offset
    ) f;

  RETURN jsonb_build_object('items', v_items, 'total_count', v_total);
END;
$$;

-- ---------------------------------------------------------------------------
-- rpc_get_supervisor_by_id
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION rpc_get_supervisor_by_id(
  p_organization_id uuid,
  p_supervisor_id   uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row supervisors;
BEGIN
  SELECT * INTO v_row
    FROM supervisors
   WHERE id = p_supervisor_id AND organization_id = p_organization_id;
  RETURN CASE WHEN FOUND THEN to_jsonb(v_row) ELSE NULL END;
END;
$$;

-- ---------------------------------------------------------------------------
-- rpc_list_supervisors
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION rpc_list_supervisors(
  p_organization_id uuid,
  p_status          entity_status_enum DEFAULT NULL,
  p_search          text               DEFAULT NULL,
  p_limit           integer            DEFAULT 50,
  p_offset          integer            DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer;
  v_items jsonb;
BEGIN
  SELECT COUNT(*) INTO v_total
    FROM supervisors
   WHERE organization_id = p_organization_id
     AND is_deleted      = false
     AND (p_status IS NULL OR status  = p_status)
     AND (p_search IS NULL OR name ILIKE '%' || p_search || '%');

  SELECT COALESCE(jsonb_agg(to_jsonb(s.*) ORDER BY s.name), '[]'::jsonb)
    INTO v_items
    FROM (
      SELECT *
        FROM supervisors
       WHERE organization_id = p_organization_id
         AND is_deleted      = false
         AND (p_status IS NULL OR status  = p_status)
         AND (p_search IS NULL OR name ILIKE '%' || p_search || '%')
       ORDER BY name
       LIMIT  p_limit
       OFFSET p_offset
    ) s;

  RETURN jsonb_build_object('items', v_items, 'total_count', v_total);
END;
$$;

-- ---------------------------------------------------------------------------
-- rpc_get_job_by_id
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION rpc_get_job_by_id(
  p_organization_id uuid,
  p_job_id          uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row jobs;
BEGIN
  SELECT * INTO v_row
    FROM jobs
   WHERE id = p_job_id AND organization_id = p_organization_id;
  RETURN CASE WHEN FOUND THEN to_jsonb(v_row) ELSE NULL END;
END;
$$;

-- ---------------------------------------------------------------------------
-- rpc_list_jobs
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION rpc_list_jobs(
  p_organization_id    uuid,
  p_operational_status operational_status_enum DEFAULT NULL,
  p_accounting_status  accounting_status_enum  DEFAULT NULL,
  p_factory_id         uuid                    DEFAULT NULL,
  p_supervisor_id      uuid                    DEFAULT NULL,
  p_billing_month      smallint                DEFAULT NULL,
  p_billing_year       smallint                DEFAULT NULL,
  p_limit              integer                 DEFAULT 50,
  p_offset             integer                 DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer;
  v_items jsonb;
BEGIN
  SELECT COUNT(*) INTO v_total
    FROM jobs
   WHERE organization_id   = p_organization_id
     AND (p_operational_status IS NULL OR operational_status = p_operational_status)
     AND (p_accounting_status  IS NULL OR accounting_status  = p_accounting_status)
     AND (p_factory_id         IS NULL OR factory_id         = p_factory_id)
     AND (p_supervisor_id      IS NULL OR supervisor_id      = p_supervisor_id)
     AND (p_billing_month      IS NULL OR billing_month      = p_billing_month)
     AND (p_billing_year       IS NULL OR billing_year       = p_billing_year);

  SELECT COALESCE(jsonb_agg(to_jsonb(j.*) ORDER BY j.billing_year DESC, j.billing_month DESC, j.created_at DESC), '[]'::jsonb)
    INTO v_items
    FROM (
      SELECT *
        FROM jobs
       WHERE organization_id   = p_organization_id
         AND (p_operational_status IS NULL OR operational_status = p_operational_status)
         AND (p_accounting_status  IS NULL OR accounting_status  = p_accounting_status)
         AND (p_factory_id         IS NULL OR factory_id         = p_factory_id)
         AND (p_supervisor_id      IS NULL OR supervisor_id      = p_supervisor_id)
         AND (p_billing_month      IS NULL OR billing_month      = p_billing_month)
         AND (p_billing_year       IS NULL OR billing_year       = p_billing_year)
       ORDER BY billing_year DESC, billing_month DESC, created_at DESC
       LIMIT  p_limit
       OFFSET p_offset
    ) j;

  RETURN jsonb_build_object('items', v_items, 'total_count', v_total);
END;
$$;

-- ---------------------------------------------------------------------------
-- rpc_list_financial_events_by_job
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION rpc_list_financial_events_by_job(
  p_organization_id uuid,
  p_job_id          uuid,
  p_limit           integer DEFAULT 100,
  p_offset          integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer;
  v_items jsonb;
BEGIN
  SELECT COUNT(*) INTO v_total
    FROM financial_events
   WHERE organization_id = p_organization_id
     AND job_id          = p_job_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(fe.*) ORDER BY fe.created_at DESC), '[]'::jsonb)
    INTO v_items
    FROM (
      SELECT *
        FROM financial_events
       WHERE organization_id = p_organization_id
         AND job_id          = p_job_id
       ORDER BY created_at DESC
       LIMIT  p_limit
       OFFSET p_offset
    ) fe;

  RETURN jsonb_build_object('items', v_items, 'total_count', v_total);
END;
$$;

-- ---------------------------------------------------------------------------
-- rpc_list_flex_field_definitions
-- Returns all definitions for the org (not paginated — typically < 50 rows).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION rpc_list_flex_field_definitions(
  p_organization_id uuid,
  p_entity_type     flex_field_entity_type_enum DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_items jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(to_jsonb(d.*) ORDER BY d.entity_type, d.display_order), '[]'::jsonb)
    INTO v_items
    FROM flex_field_definitions d
   WHERE organization_id = p_organization_id
     AND (p_entity_type IS NULL OR entity_type = p_entity_type);

  RETURN v_items;
END;
$$;

-- ---------------------------------------------------------------------------
-- rpc_get_system_setting
-- Returns the value jsonb, or NULL if the key does not exist.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION rpc_get_system_setting(
  p_organization_id uuid,
  p_key             text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row system_settings;
BEGIN
  SELECT * INTO v_row
    FROM system_settings
   WHERE key = p_key AND organization_id = p_organization_id;
  RETURN CASE WHEN FOUND THEN to_jsonb(v_row) ELSE NULL END;
END;
$$;
