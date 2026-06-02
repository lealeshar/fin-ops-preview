import { useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import type { Factory } from '../../types/domain.types';
import { DataTable } from '../ui/table';
import { StatusBadge } from '../ui/status-badge';

const col = createColumnHelper<Factory>();

interface FactoriesTableProps {
  factories: readonly Factory[];
  loading: boolean;
  onEdit?: ((factory: Factory) => void) | undefined;
  onArchive?: ((factory: Factory) => void) | undefined;
}

export function FactoriesTable({ factories, loading, onEdit, onArchive }: FactoriesTableProps) {
  const columns = useMemo(() => [
    col.accessor('name',           { header: 'שם' }),
    col.accessor('tax_id',         { header: 'ח.פ / ע.מ' }),
    col.accessor('status',         { header: 'סטטוס',       cell: i => <StatusBadge value={i.getValue()} /> }),
    col.accessor('payment_terms',  { header: 'תנאי תשלום',  cell: i => <StatusBadge value={i.getValue()} /> }),
    col.accessor('payment_method', { header: 'אמצעי תשלום', cell: i => <StatusBadge value={i.getValue()} /> }),
    col.accessor('contact_name',   { header: 'איש קשר',     cell: i => i.getValue() ?? '—' }),
    col.display({
      id: 'actions',
      header: '',
      cell: i => (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
          {onEdit && (
            <button className="btn btn-ghost btn-sm" onClick={() => onEdit(i.row.original)}>עריכה</button>
          )}
          {onArchive && !i.row.original.is_deleted && (
            <button className="btn btn-danger btn-sm" onClick={() => onArchive(i.row.original)}>ארכיון</button>
          )}
        </div>
      ),
    }),
  ], [onEdit, onArchive]);

  return (
    <DataTable
      data={factories as Factory[]}
      columns={columns}
      loading={loading}
      emptyMessage="אין מפעלים."
    />
  );
}
