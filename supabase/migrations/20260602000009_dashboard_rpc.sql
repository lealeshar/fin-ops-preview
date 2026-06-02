-- =============================================================================
-- Dashboard stats RPC — single call returns all KPIs for the dashboard page.
-- Read-only; no audit context required.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_dashboard_stats(
  p_organization_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $func$
DECLARE
  v_op_counts               jsonb;
  v_acc_counts              jsonb;
  v_active_factories        bigint;
  v_active_supervisors      bigint;
  v_total_jobs              bigint;
  v_total_factory_charges   numeric;
  v_total_supervisor_payouts numeric;
BEGIN
  -- Jobs by operational status
  SELECT COALESCE(jsonb_object_agg(operational_status, cnt), '{}'::jsonb)
  INTO v_op_counts
  FROM (
    SELECT operational_status, COUNT(*) AS cnt
    FROM jobs
    WHERE organization_id = p_organization_id
    GROUP BY operational_status
  ) t;

  -- Jobs by accounting status
  SELECT COALESCE(jsonb_object_agg(accounting_status, cnt), '{}'::jsonb)
  INTO v_acc_counts
  FROM (
    SELECT accounting_status, COUNT(*) AS cnt
    FROM jobs
    WHERE organization_id = p_organization_id
    GROUP BY accounting_status
  ) t;

  -- Active factories
  SELECT COUNT(*) INTO v_active_factories
  FROM factories
  WHERE organization_id = p_organization_id
    AND is_deleted = false
    AND status = 'Active';

  -- Active supervisors
  SELECT COUNT(*) INTO v_active_supervisors
  FROM supervisors
  WHERE organization_id = p_organization_id
    AND is_deleted = false
    AND status = 'Active';

  -- Job totals + financial sums
  SELECT
    COUNT(*),
    COALESCE(SUM(factory_charge_amount),    0),
    COALESCE(SUM(supervisor_payout_amount), 0)
  INTO v_total_jobs, v_total_factory_charges, v_total_supervisor_payouts
  FROM jobs
  WHERE organization_id = p_organization_id;

  RETURN jsonb_build_object(
    'jobs_by_operational_status',  v_op_counts,
    'jobs_by_accounting_status',   v_acc_counts,
    'active_factories',            v_active_factories,
    'active_supervisors',          v_active_supervisors,
    'total_jobs',                  v_total_jobs,
    'total_factory_charges',       v_total_factory_charges,
    'total_supervisor_payouts',    v_total_supervisor_payouts
  );
END;
$func$;

REVOKE ALL ON FUNCTION public.rpc_dashboard_stats(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_dashboard_stats(uuid) TO authenticated;
