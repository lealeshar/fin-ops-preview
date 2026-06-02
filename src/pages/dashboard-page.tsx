import { useDashboardStats } from '../hooks/use-dashboard';
import { ErrorBanner } from '../components/ui/error-banner';
import { StatusBadge } from '../components/ui/status-badge';
import { OperationalStatus, AccountingStatus } from '../types/enums';

const ILS = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 });

const OP_ORDER: OperationalStatus[] = [
  OperationalStatus.Draft,
  OperationalStatus.WaitingMatch,
  OperationalStatus.PartialMatch,
  OperationalStatus.Matched,
  OperationalStatus.Cancelled,
];

const ACC_ORDER: AccountingStatus[] = [
  AccountingStatus.PendingApproval,
  AccountingStatus.Approved,
  AccountingStatus.QueuedForMASAV,
  AccountingStatus.Paid,
  AccountingStatus.Closed,
];

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
}

function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export function DashboardPage() {
  const { state, reload } = useDashboardStats();

  if (state.status === 'idle' || state.status === 'loading') {
    return (
      <div className="page">
        <div style={{ textAlign: 'center', color: '#94a3b8', padding: 60 }}>טוען נתונים…</div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="page">
        <ErrorBanner error={state.error} />
      </div>
    );
  }

  const s = state.data;
  const margin = s.total_factory_charges - s.total_supervisor_payouts;
  const marginPct = s.total_factory_charges > 0
    ? ((margin / s.total_factory_charges) * 100).toFixed(1)
    : '0.0';

  const opTotal  = OP_ORDER.reduce((sum, k) => sum + (s.jobs_by_operational_status[k]  ?? 0), 0) || 1;
  const accTotal = ACC_ORDER.reduce((sum, k) => sum + (s.jobs_by_accounting_status[k]  ?? 0), 0) || 1;

  return (
    <div className="page">
      <div className="page-header">
        <h1>לוח בקרה</h1>
        <button className="btn btn-ghost btn-sm" onClick={reload}>רענן</button>
      </div>

      {/* KPI cards row 1 */}
      <div className="stat-grid">
        <StatCard label="סה״כ עבודות" value={s.total_jobs} />
        <StatCard label="מפעלים פעילים" value={s.active_factories} />
        <StatCard label="מפקחים פעילים" value={s.active_supervisors} />
      </div>

      {/* KPI cards row 2 — financial */}
      <div className="stat-grid" style={{ marginTop: 16 }}>
        <StatCard
          label="חיובי מפעלים (סה״כ)"
          value={ILS.format(s.total_factory_charges)}
        />
        <StatCard
          label="תשלומי מפקחים (סה״כ)"
          value={ILS.format(s.total_supervisor_payouts)}
        />
        <StatCard
          label="מרווח גולמי"
          value={ILS.format(margin)}
          sub={`${marginPct}%`}
        />
      </div>

      {/* Operational status breakdown */}
      <div className="breakdown-section">
        <h2 className="breakdown-title">סטטוס תפעולי</h2>
        <div className="breakdown-list">
          {OP_ORDER.map(status => {
            const count = s.jobs_by_operational_status[status] ?? 0;
            const pct   = Math.round((count / opTotal) * 100);
            return (
              <div key={status} className="breakdown-row">
                <div className="breakdown-badge">
                  <StatusBadge value={status} />
                </div>
                <div className="breakdown-bar-wrap">
                  <div className="breakdown-bar" style={{ width: `${pct}%` }} />
                </div>
                <span className="breakdown-count">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Accounting status breakdown */}
      <div className="breakdown-section">
        <h2 className="breakdown-title">סטטוס חשבונאי</h2>
        <div className="breakdown-list">
          {ACC_ORDER.map(status => {
            const count = s.jobs_by_accounting_status[status] ?? 0;
            const pct   = Math.round((count / accTotal) * 100);
            return (
              <div key={status} className="breakdown-row">
                <div className="breakdown-badge">
                  <StatusBadge value={status} />
                </div>
                <div className="breakdown-bar-wrap">
                  <div className="breakdown-bar" style={{ width: `${pct}%` }} />
                </div>
                <span className="breakdown-count">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
