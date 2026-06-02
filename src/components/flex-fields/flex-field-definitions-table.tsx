import type { FlexFieldDefinition } from '../../types/domain.types';

const ENTITY_LABEL: Record<string, string> = {
  factory:    'מפעל',
  supervisor: 'מפקח',
};

const TYPE_LABEL: Record<string, string> = {
  string:  'טקסט',
  date:    'תאריך',
  numeric: 'מספר',
  enum:    'רשימה',
};

interface FlexFieldDefinitionsTableProps {
  definitions: readonly FlexFieldDefinition[];
  loading: boolean;
  onEdit?: ((def: FlexFieldDefinition) => void) | undefined;
}

export function FlexFieldDefinitionsTable({ definitions, loading, onEdit }: FlexFieldDefinitionsTableProps) {
  if (loading) return <div className="table-loading">טוען…</div>;

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>ישות</th>
          <th>מפתח</th>
          <th>תווית</th>
          <th>סוג</th>
          <th>אפשרויות</th>
          <th>סדר</th>
          <th>חובה</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {definitions.length === 0 && (
          <tr>
            <td colSpan={8} className="table-empty">אין שדות גמישים מוגדרים</td>
          </tr>
        )}
        {definitions.map(d => (
          <tr key={`${d.entity_type}-${d.field_key}`}>
            <td>
              <span className="badge badge-blue">{ENTITY_LABEL[d.entity_type] ?? d.entity_type}</span>
            </td>
            <td>
              <code style={{ fontSize: 12, background: '#f1f5f9', padding: '2px 6px', borderRadius: 3 }}>
                {d.field_key}
              </code>
            </td>
            <td>{d.label}</td>
            <td>
              <span className="badge badge-gray">{TYPE_LABEL[d.field_type] ?? d.field_type}</span>
            </td>
            <td style={{ fontSize: 12, color: '#64748b', maxWidth: 200 }}>
              {d.enum_options ? d.enum_options.join(', ') : <span style={{ color: '#cbd5e1' }}>—</span>}
            </td>
            <td style={{ textAlign: 'center', color: '#64748b' }}>{d.display_order}</td>
            <td style={{ textAlign: 'center' }}>{d.is_required ? '✓' : '—'}</td>
            <td>
              {onEdit && (
                <button className="btn btn-ghost btn-sm" onClick={() => onEdit(d)}>ערוך</button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
