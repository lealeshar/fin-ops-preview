import { useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Modal } from '../ui/modal';
import { DataTable } from '../ui/table';
import { StatusBadge } from '../ui/status-badge';
import { ErrorBanner } from '../ui/error-banner';
import { AppendEventForm } from '../financial-events/append-event-form';
import { useJobById, useAdvanceOperationalStatus, useAdvanceAccountingStatus } from '../../hooks/use-jobs';
import { useFinancialEventsByJob, useAppendFinancialEvent } from '../../hooks/use-financial-events';
import { NEXT_OPERATIONAL, NEXT_ACCOUNTING, STATUS_LABELS } from '../../utils/transitions';
import { IMMUTABLE_ACCOUNTING_STATUSES } from '../../types/enums';
import type { FinancialEvent } from '../../types/domain.types';
import type { AccountingStatus, OperationalStatus } from '../../types/enums';
import type { AppendFinancialEventFormValues } from '../../schemas/financial-event.schema';
import { useState } from 'react';

const col = createColumnHelper<FinancialEvent>();
const ILS = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' });
const DATE_FMT = new Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeStyle: 'short' });

const evtColumns = [
  col.accessor('created_at',  { header: 'תאריך',       cell: i => DATE_FMT.format(new Date(i.getValue())) }),
  col.accessor('event_type',  { header: 'סוג',          cell: i => <StatusBadge value={i.getValue()} /> }),
  col.accessor('amount',      { header: 'סכום',         cell: i => ILS.format(i.getValue()) }),
  col.accessor('description', { header: 'תיאור',        cell: i => i.getValue() ?? '—' }),
];

interface JobDetailProps {
  jobId: string;
  onClose: () => void;
}

export function JobDetail({ jobId, onClose }: JobDetailProps) {
  const [showAppendModal, setShowAppendModal] = useState(false);

  const { state: jobState, reload: reloadJob } = useJobById(jobId);
  const { state: eventsState, reload: reloadEvents } = useFinancialEventsByJob(jobId);

  const advanceOp  = useAdvanceOperationalStatus();
  const advanceAcc = useAdvanceAccountingStatus();
  const appendEvt  = useAppendFinancialEvent();

  const job    = jobState.status    === 'success' ? jobState.data    : null;
  const events = eventsState.status === 'success' ? eventsState.data.items : [];

  const nextOpStatuses  = useMemo(() => job ? NEXT_OPERATIONAL[job.operational_status]  : [], [job]);
  const nextAccStatuses = useMemo(() => job ? NEXT_ACCOUNTING[job.accounting_status]     : [], [job]);
  const isImmutable     = useMemo(() => job ? IMMUTABLE_ACCOUNTING_STATUSES.has(job.accounting_status) : false, [job]);

  async function handleAdvanceOp(toStatus: OperationalStatus) {
    if (!job) return;
    const result = await advanceOp.execute(job.id, toStatus, job.version_number);
    if (result.error === null) { advanceOp.reset(); reloadJob(); }
  }

  async function handleAdvanceAcc(toStatus: AccountingStatus) {
    if (!job) return;
    const result = await advanceAcc.execute(job.id, toStatus, job.version_number);
    if (result.error === null) { advanceAcc.reset(); reloadJob(); }
  }

  async function handleAppendEvent(values: AppendFinancialEventFormValues) {
    const result = await appendEvt.execute(
      jobId,
      values.event_type,
      values.amount,
      values.description ?? undefined,
    );
    if (result.error === null) {
      setShowAppendModal(false);
      appendEvt.reset();
      reloadEvents();
    }
  }

  if (jobState.status === 'loading' || jobState.status === 'idle') {
    return <div className="detail-panel" style={{ textAlign: 'center', color: '#94a3b8' }}>טוען…</div>;
  }

  if (jobState.status === 'error') {
    return <div className="detail-panel"><ErrorBanner error={jobState.error} /></div>;
  }

  if (job === null) {
    return <div className="detail-panel">העבודה לא נמצאה.</div>;
  }

  return (
    <div className="detail-panel">
      <div className="detail-section-header">
        <h2>פרטי עבודה — {job.job_code}</h2>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>סגור</button>
      </div>

      <div className="detail-grid">
        <div className="detail-field"><label>קוד עבודה</label><span>{job.job_code}</span></div>
        <div className="detail-field"><label>תקופה</label><span>{job.billing_month}/{job.billing_year}</span></div>
        <div className="detail-field"><label>חיוב מפעל</label><span>{ILS.format(job.factory_charge_amount)}</span></div>
        <div className="detail-field"><label>תשלום מפקח</label><span>{ILS.format(job.supervisor_payout_amount)}</span></div>
        <div className="detail-field"><label>סטטוס תפעולי</label><span><StatusBadge value={job.operational_status} /></span></div>
        <div className="detail-field"><label>סטטוס חשבונאי</label><span><StatusBadge value={job.accounting_status} /></span></div>
        <div className="detail-field"><label>גרסה</label><span>{job.version_number}</span></div>
        <div className="detail-field"><label>נוצר</label><span>{DATE_FMT.format(new Date(job.created_at))}</span></div>
      </div>

      {advanceOp.state.status  === 'error' && <ErrorBanner error={advanceOp.state.error}  />}
      {advanceAcc.state.status === 'error' && <ErrorBanner error={advanceAcc.state.error} />}

      {!isImmutable && (nextOpStatuses.length > 0 || nextAccStatuses.length > 0) && (
        <div className="detail-actions">
          {nextOpStatuses.map(s => (
            <button
              key={s}
              className="btn btn-ghost btn-sm"
              disabled={advanceOp.state.status === 'loading'}
              onClick={() => handleAdvanceOp(s)}
            >
              → {STATUS_LABELS[s] ?? s}
            </button>
          ))}
          {nextAccStatuses.map(s => (
            <button
              key={s}
              className="btn btn-primary btn-sm"
              disabled={
                advanceAcc.state.status === 'loading' ||
                (s === 'Approved' && job.operational_status !== 'Matched')
              }
              onClick={() => handleAdvanceAcc(s)}
            >
              ✓ {STATUS_LABELS[s] ?? s}
            </button>
          ))}
        </div>
      )}

      <div className="detail-section-header" style={{ marginTop: 20 }}>
        <h2>אירועים פיננסיים ({eventsState.status === 'success' ? eventsState.data.total_count : '…'})</h2>
        {!isImmutable && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => { appendEvt.reset(); setShowAppendModal(true); }}
          >
            + אירוע
          </button>
        )}
      </div>

      <DataTable
        data={events as FinancialEvent[]}
        columns={evtColumns}
        loading={eventsState.status === 'idle' || eventsState.status === 'loading'}
        emptyMessage="אין אירועים פיננסיים."
      />

      {showAppendModal && (
        <Modal title="הוסף אירוע פיננסי" onClose={() => setShowAppendModal(false)}>
          <AppendEventForm
            onSubmit={handleAppendEvent}
            onCancel={() => setShowAppendModal(false)}
            submitting={appendEvt.state.status === 'loading'}
            error={appendEvt.state.status === 'error' ? appendEvt.state.error : null}
          />
        </Modal>
      )}
    </div>
  );
}
