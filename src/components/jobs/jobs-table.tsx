import { useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import type { Job } from '../../types/domain.types';
import { DataTable } from '../ui/table';
import { StatusBadge } from '../ui/status-badge';

const col = createColumnHelper<Job>();

const ILS = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' });

interface JobsTableProps {
  jobs: readonly Job[];
  loading: boolean;
  selectedJobId: string | null;
  onSelect: (job: Job) => void;
}

export function JobsTable({ jobs, loading, selectedJobId, onSelect }: JobsTableProps) {
  const columns = useMemo(() => [
    col.accessor('job_code',     { header: 'קוד עבודה' }),
    col.accessor(row => `${row.billing_month}/${row.billing_year}`, {
      id:     'billing_period',
      header: 'תקופה',
    }),
    col.accessor('factory_id',   { header: 'מפעל',  cell: i => <code style={{ fontSize: 11 }}>{i.getValue().slice(0, 8)}</code> }),
    col.accessor('supervisor_id',{ header: 'מפקח',  cell: i => <code style={{ fontSize: 11 }}>{i.getValue().slice(0, 8)}</code> }),
    col.accessor('factory_charge_amount',    { header: 'חיוב מפעל',    cell: i => ILS.format(i.getValue()) }),
    col.accessor('supervisor_payout_amount', { header: 'תשלום מפקח', cell: i => ILS.format(i.getValue()) }),
    col.accessor('operational_status', { header: 'סטטוס תפעולי',  cell: i => <StatusBadge value={i.getValue()} /> }),
    col.accessor('accounting_status',  { header: 'סטטוס חשבונאי', cell: i => <StatusBadge value={i.getValue()} /> }),
    col.display({
      id: 'actions',
      header: '',
      cell: i => (
        <button
          className={`btn btn-ghost btn-sm${i.row.original.id === selectedJobId ? ' active' : ''}`}
          onClick={() => onSelect(i.row.original)}
        >
          פרטים
        </button>
      ),
    }),
  ], [selectedJobId, onSelect]);

  return (
    <DataTable
      data={jobs as Job[]}
      columns={columns}
      loading={loading}
      emptyMessage="אין עבודות."
    />
  );
}
