import { useState } from 'react';
import { Modal } from '../components/ui/modal';
import { ErrorBanner } from '../components/ui/error-banner';
import { JobForm } from '../components/jobs/job-form';
import { JobsTable } from '../components/jobs/jobs-table';
import { JobDetail } from '../components/jobs/job-detail';
import { useJobList, useCreateJob } from '../hooks/use-jobs';
import type { Job, CreateJobInput } from '../types/domain.types';
import type { CreateJobFormValues } from '../schemas/job.schema';
import { OperationalStatus, AccountingStatus } from '../types/enums';
import { usePermission } from '../hooks/use-permission';

const MONTHS_SHORT = ['ינו','פבר','מרץ','אפר','מאי','יוני','יולי','אוג','ספט','אוק','נוב','דצמ'];
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - 2 + i);

export function JobsPage() {
  const { canCreate } = usePermission();
  const [showCreate, setShowCreate]     = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [opFilter,  setOpFilter]  = useState('');
  const [accFilter, setAccFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter,  setYearFilter]  = useState('');

  const { state: listState, reload } = useJobList({
    operationalStatus: opFilter  ? (opFilter  as OperationalStatus)  : undefined,
    accountingStatus:  accFilter ? (accFilter as AccountingStatus) : undefined,
    billingMonth:      monthFilter ? parseInt(monthFilter, 10) : undefined,
    billingYear:       yearFilter  ? parseInt(yearFilter,  10) : undefined,
  });

  const createMut = useCreateJob();

  const jobs    = listState.status === 'success' ? listState.data.items : [];
  const loading = listState.status === 'idle' || listState.status === 'loading';

  async function handleCreate(values: CreateJobFormValues) {
    const input: CreateJobInput = {
      factory_id:               values.factory_id,
      supervisor_id:            values.supervisor_id,
      billing_month:            values.billing_month,
      billing_year:             values.billing_year,
      factory_charge_amount:    values.factory_charge_amount,
      supervisor_payout_amount: values.supervisor_payout_amount,
      operational_status:       OperationalStatus.Draft,
      accounting_status:        AccountingStatus.PendingApproval,
    };
    const result = await createMut.execute(input);
    if (result.error === null) { setShowCreate(false); createMut.reset(); reload(); }
  }

  function handleSelect(job: Job) {
    setSelectedJobId(prev => (prev === job.id ? null : job.id));
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>עבודות</h1>
        {canCreate && (
          <button
            className="btn btn-primary"
            onClick={() => { createMut.reset(); setShowCreate(true); }}
          >
            + עבודה חדשה
          </button>
        )}
      </div>

      {listState.status === 'error' && <ErrorBanner error={listState.error} />}

      <div className="filters">
        <select className="filter-select" value={opFilter} onChange={e => setOpFilter(e.target.value)}>
          <option value="">כל הסטטוסים התפעוליים</option>
          {Object.values(OperationalStatus).map(s => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <select className="filter-select" value={accFilter} onChange={e => setAccFilter(e.target.value)}>
          <option value="">כל הסטטוסים החשבונאיים</option>
          {Object.values(AccountingStatus).map(s => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <select className="filter-select" value={monthFilter} onChange={e => setMonthFilter(e.target.value)}>
          <option value="">כל החודשים</option>
          {MONTHS_SHORT.map((name, idx) => (
            <option key={idx + 1} value={String(idx + 1)}>{name}</option>
          ))}
        </select>
        <select className="filter-select" value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
          <option value="">כל השנים</option>
          {YEAR_OPTIONS.map(y => (
            <option key={y} value={String(y)}>{y}</option>
          ))}
        </select>
      </div>

      <JobsTable
        jobs={jobs}
        loading={loading}
        selectedJobId={selectedJobId}
        onSelect={handleSelect}
      />

      {selectedJobId !== null && (
        <JobDetail
          jobId={selectedJobId}
          onClose={() => setSelectedJobId(null)}
        />
      )}

      {showCreate && (
        <Modal title="עבודה חדשה" onClose={() => setShowCreate(false)}>
          <JobForm
            onSubmit={handleCreate}
            onCancel={() => setShowCreate(false)}
            submitting={createMut.state.status === 'loading'}
            error={createMut.state.status === 'error' ? createMut.state.error : null}
          />
        </Modal>
      )}
    </div>
  );
}
