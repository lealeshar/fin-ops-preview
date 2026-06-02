import { useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import type { Supervisor } from '../../types/domain.types';
import { DataTable } from '../ui/table';
import { StatusBadge } from '../ui/status-badge';

const col = createColumnHelper<Supervisor>();

interface SupervisorsTableProps {
  supervisors: readonly Supervisor[];
  loading: boolean;
  onEdit?: ((supervisor: Supervisor) => void) | undefined;
  onArchive?: ((supervisor: Supervisor) => void) | undefined;
}

export function SupervisorsTable({ supervisors, loading, onEdit, onArchive }: SupervisorsTableProps) {
  const columns = useMemo(() => [
    col.accessor('name',                { header: 'שם' }),
    col.accessor('national_id',         { header: 'ת.ז' }),
    col.accessor('status',              { header: 'סטטוס',      cell: i => <StatusBadge value={i.getValue()} /> }),
    col.accessor('payment_type',        { header: 'סוג תשלום',  cell: i => <StatusBadge value={i.getValue()} /> }),
    col.accessor('monthly_salary_cost', {
      header: 'עלות חודשית',
      cell:   i => i.getValue().toLocaleString('he-IL', { style: 'currency', currency: 'ILS' }),
    }),
    col.accessor('phone',               { header: 'טלפון',      cell: i => i.getValue() ?? '—' }),
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
      data={supervisors as Supervisor[]}
      columns={columns}
      loading={loading}
      emptyMessage="אין מפקחים."
    />
  );
}
