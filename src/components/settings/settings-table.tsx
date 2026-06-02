import type { SystemSetting } from '../../types/domain.types';

export function isFeatureFlag(value: unknown): value is { readonly enabled: boolean } {
  if (typeof value !== 'object' || value === null) return false;
  const rec = value as Record<string, unknown>;
  return (
    Object.keys(rec).length === 1 &&
    'enabled' in rec &&
    typeof rec['enabled'] === 'boolean'
  );
}

function valuePreview(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  const s = JSON.stringify(value);
  return s.length > 60 ? s.slice(0, 57) + '…' : s;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' });
}

interface SettingsTableProps {
  settings: readonly SystemSetting[];
  loading: boolean;
  togglingKeys: ReadonlySet<string>;
  onEdit: (setting: SystemSetting) => void;
  onToggle: (setting: SystemSetting) => void;
}

export function SettingsTable({
  settings,
  loading,
  togglingKeys,
  onEdit,
  onToggle,
}: SettingsTableProps) {
  if (loading) return <div className="table-loading">טוען…</div>;

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>מפתח</th>
          <th>סוג</th>
          <th>ערך</th>
          <th>תיאור</th>
          <th>עודכן ע&quot;י</th>
          <th>עודכן</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {settings.length === 0 && (
          <tr>
            <td colSpan={7} className="table-empty">אין הגדרות מערכת</td>
          </tr>
        )}
        {settings.map(s => {
          const flagData = isFeatureFlag(s.value) ? s.value : null;
          const isToggling = togglingKeys.has(s.key);
          return (
            <tr key={s.key}>
              <td>
                <code style={{ fontSize: 12, background: '#f1f5f9', padding: '2px 6px', borderRadius: 3 }}>
                  {s.key}
                </code>
              </td>
              <td>
                {flagData !== null
                  ? <span className="badge badge-blue">Feature Flag</span>
                  : <span className="badge badge-gray">הגדרה</span>
                }
              </td>
              <td>
                {flagData !== null ? (
                  <label className="toggle-switch" title={isToggling ? 'שומר…' : undefined}>
                    <input
                      type="checkbox"
                      checked={flagData.enabled}
                      disabled={isToggling}
                      onChange={() => onToggle(s)}
                    />
                    <span className={`toggle-track${flagData.enabled ? ' on' : ''}`}>
                      <span className="toggle-thumb" />
                    </span>
                    <span className="toggle-label">{flagData.enabled ? 'מופעל' : 'כבוי'}</span>
                  </label>
                ) : (
                  <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#475569' }}>
                    {valuePreview(s.value)}
                  </span>
                )}
              </td>
              <td style={{ color: '#64748b', maxWidth: 240 }}>
                {s.description ?? <span style={{ color: '#cbd5e1' }}>—</span>}
              </td>
              <td style={{ color: '#64748b', fontSize: 12 }}>{s.updated_by}</td>
              <td style={{ color: '#64748b', fontSize: 12, whiteSpace: 'nowrap' }}>
                {formatDate(s.updated_at)}
              </td>
              <td>
                <button className="btn btn-ghost btn-sm" onClick={() => onEdit(s)}>
                  ערוך
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
