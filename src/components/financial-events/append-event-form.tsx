import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormField } from '../ui/form-field';
import { ErrorBanner } from '../ui/error-banner';
import {
  appendFinancialEventSchema,
  type AppendFinancialEventFormValues,
} from '../../schemas/financial-event.schema';
import { FinancialEventType } from '../../types/enums';
import type { RpcError } from '../../types/async.types';

interface AppendEventFormProps {
  onSubmit: (values: AppendFinancialEventFormValues) => Promise<void>;
  onCancel: () => void;
  submitting: boolean;
  error: RpcError | null;
}

export function AppendEventForm({ onSubmit, onCancel, submitting, error }: AppendEventFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<AppendFinancialEventFormValues>({
    resolver: zodResolver(appendFinancialEventSchema),
  });

  return (
    <form className="form" onSubmit={handleSubmit(onSubmit)}>
      {error && <ErrorBanner error={error} />}
      <div className="form-row">
        <FormField label="סוג אירוע" required error={errors.event_type?.message}>
          <select className="form-select" {...register('event_type')}>
            <option value="">בחר סוג…</option>
            {Object.values(FinancialEventType).map(v => (
              <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </FormField>
        <FormField label="סכום (₪)" required error={errors.amount?.message}>
          <input className="form-input" type="number" step="0.01" min="0.01"
            {...register('amount', { valueAsNumber: true })} />
        </FormField>
      </div>
      <FormField label="תיאור" error={errors.description?.message}>
        <textarea className="form-textarea" rows={2} {...register('description')} />
      </FormField>
      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={submitting}>ביטול</button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'שומר…' : 'הוסף אירוע'}
        </button>
      </div>
    </form>
  );
}
