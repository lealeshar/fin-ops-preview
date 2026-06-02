-- ---------------------------------------------------------------------------
-- rpc_list_system_settings
-- Returns all system_settings rows for the calling organization, ordered by key.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION rpc_list_system_settings(
  p_organization_id uuid
)
RETURNS SETOF system_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT *
      FROM system_settings
     WHERE organization_id = p_organization_id
     ORDER BY key;
END;
$$;
