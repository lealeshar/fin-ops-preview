import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormField } from '../ui/form-field';
import { ErrorBanner } from '../ui/error-banner';
import { createJobSchema, type CreateJobFormValues } from '../../schemas/job.schema';
import { useFactoryList } from '../../hooks/use-factories';
import { useSupervisorList } from '../../hooks/use-supervisors';
import { EntityStatus } from '../../types/enums';
import type { RpcError } from '../../types/async.types';

const MONTHS = [
  'ינואר','פברואר','מרץ','אפריל','מאי','יוני',
  'יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר',
];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - 2 + i);

interface JobFormProps {
  onSubmit: (values: CreateJobFormValues) => Promise<void>;
  onCancel: () => void;
  submitting: boolean;
  error: RpcError | null;
}

export function JobForm({ onSubmit, onCancel, submitting, error }: JobFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<CreateJobFormValues>({
    resolver: zodResolver(createJobSchema),
    defaultValues: {
      billing_month: new Date().getMonth() + 1,
      billing_year:  CURRENT_YEAR,
    },
  });

  const { state: factoriesState } = useFactoryList({ status: EntityStatus.Active, limit: 1000 });
  const { state: supervisorsState } = useSupervisorList({ status: EntityStatus.Active, limit: 1000 });

  const factories   = factoriesState.status   === 'success' ? factoriesState.data.items   : [];
  const supervisors = supervisorsState.status === 'success' ? supervisorsState.data.items : [];

  return (
    <form className="form" onSubmit={handleSubmit(onSubmit)}>
      {error && <ErrorBanner error={error} />}

      <FormField label="מפעל" required error={errors.factory_id?.message}>
        <select className="form-select" {...register('factory_id')}>
          <option value="">בחר מפעל…</option>
          {factories.map(f => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </FormField>

      <FormField label="מפקח" required error={errors.supervisor_id?.message}>
        <select className="form-select" {...register('supervisor_id')}>
          <option value="">בחר מפקח…</option>
          {supervisors.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </FormField>

      <div className="form-row">
        <FormField label="חודש חיוב" required error={errors.billing_month?.message}>
          <select className="form-select" {...register('billing_month', { valueAsNumber: true })}>
            {MONTHS.map((name, idx) => (
              <option key={idx + 1} value={idx + 1}>{name}</option>
            ))}
          </select>
        </FormField>
        <FormField label="שנת חיוב" required error={errors.billing_year?.message}>
          <select className="form-select" {...register('billing_year', { valueAsNumber: true })}>
            {YEAR_OPTIONS.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </FormField>
      </div>

      <div className="form-row">
        <FormField label="סכום חיוב מפעל (₪)" required error={errors.factory_charge_amount?.message}>
          <input className="form-input" type="number" step="0.01" min="0"
            {...register('factory_charge_amount', { valueAsNumber: true })} />
        </FormField>
        <FormField label="תשלום למפקח (₪)" required error={errors.supervisor_payout_amount?.message}>
          <input className="form-input" type="number" step="0.01" min="0"
            {...register('supervisor_payout_amount', { valueAsNumber: true })} />
        </FormField>
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={submitting}>ביטול</button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'שומר…' : 'צור עבודה'}
        </button>
      </div>
    </form>
  );
}
