-- =============================================================================
-- Auth trigger: auto-assign organization_id + role on every new user
-- Single-org deployment: all users belong to the same organization.
-- Role defaults to 'viewer' — admin must update via Supabase dashboard or
-- a future admin UI.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $func$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = raw_app_meta_data ||
    jsonb_build_object(
      'organization_id', 'a3cb8d18-bcf7-43cb-86ef-7e6d13eeb29d',
      'role', 'viewer'
    )
  WHERE id = NEW.id;
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
