import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormField } from '../ui/form-field';
import { ErrorBanner } from '../ui/error-banner';
import {
  createSupervisorSchema,
  updateSupervisorSchema,
  type CreateSupervisorFormValues,
  type UpdateSupervisorFormValues,
} from '../../schemas/supervisor.schema';
import { PaymentType } from '../../types/enums';
import type { Supervisor } from '../../types/domain.types';
import type { RpcError } from '../../types/async.types';

// ─── Create form ──────────────────────────────────────────────────────────────

interface CreateSupervisorFormProps {
  onSubmit: (values: CreateSupervisorFormValues) => Promise<void>;
  onCancel: () => void;
  submitting: boolean;
  error: RpcError | null;
}

export function CreateSupervisorForm({ onSubmit, onCancel, submitting, error }: CreateSupervisorFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<CreateSupervisorFormValues>({
    resolver: zodResolver(createSupervisorSchema),
  });

  return (
    <form className="form" onSubmit={handleSubmit(onSubmit)}>
      {error && <ErrorBanner error={error} />}
      <div className="form-row">
        <FormField label="שם" required error={errors.name?.message}>
          <input className="form-input" {...register('name')} />
        </FormField>
        <FormField label="ת.ז" required error={errors.national_id?.message}>
          <input className="form-input" {...register('national_id')} />
        </FormField>
      </div>
      <div className="form-row">
        <FormField label="סוג תשלום" required error={errors.payment_type?.message}>
          <select className="form-select" {...register('payment_type')}>
            <option value="">בחר…</option>
            {Object.values(PaymentType).map(v => (
              <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </FormField>
        <FormField label="עלות שכר חודשית" required error={errors.monthly_salary_cost?.message}>
          <input className="form-input" type="number" step="0.01" min="0" {...register('monthly_salary_cost', { valueAsNumber: true })} />
        </FormField>
      </div>
      <div className="form-row">
        <FormField label="טלפון" error={errors.phone?.message}>
          <input className="form-input" {...register('phone')} />
        </FormField>
        <FormField label="אימייל" error={errors.email?.message}>
          <input className="form-input" type="email" {...register('email')} />
        </FormField>
      </div>
      <div className="form-row">
        <FormField label="קוד בנק" error={errors.bank_code?.message}>
          <input className="form-input" {...register('bank_code')} />
        </FormField>
        <FormField label="סניף" error={errors.bank_branch?.message}>
          <input className="form-input" {...register('bank_branch')} />
        </FormField>
      </div>
      <div className="form-row">
        <FormField label="מספר חשבון" error={errors.bank_account?.message}>
          <input className="form-input" {...register('bank_account')} />
        </FormField>
        <FormField label="סוג חשבון" error={errors.bank_account_type?.message}>
          <input className="form-input" {...register('bank_account_type')} />
        </FormField>
      </div>
      <FormField label="כתובת" error={errors.address?.message}>
        <textarea className="form-textarea" rows={2} {...register('address')} />
      </FormField>
      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={submitting}>ביטול</button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'שומר…' : 'צור מפקח'}
        </button>
      </div>
    </form>
  );
}

// ─── Edit form ────────────────────────────────────────────────────────────────

interface EditSupervisorFormProps {
  supervisor: Supervisor;
  onSubmit: (values: UpdateSupervisorFormValues) => Promise<void>;
  onCancel: () => void;
  submitting: boolean;
  error: RpcError | null;
}

export function EditSupervisorForm({ supervisor, onSubmit, onCancel, submitting, error }: EditSupervisorFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<UpdateSupervisorFormValues>({
    resolver: zodResolver(updateSupervisorSchema),
    defaultValues: {
      name:                supervisor.name,
      national_id:         supervisor.national_id,
      payment_type:        supervisor.payment_type,
      monthly_salary_cost: supervisor.monthly_salary_cost,
      phone:               supervisor.phone ?? undefined,
      email:               supervisor.email ?? undefined,
      address:             supervisor.address ?? undefined,
      bank_code:           supervisor.bank_code ?? undefined,
      bank_branch:         supervisor.bank_branch ?? undefined,
      bank_account:        supervisor.bank_account ?? undefined,
      bank_account_type:   supervisor.bank_account_type ?? undefined,
    },
  });

  return (
    <form className="form" onSubmit={handleSubmit(onSubmit)}>
      {error && <ErrorBanner error={error} />}
      <div className="form-row">
        <FormField label="שם" error={errors.name?.message}>
          <input className="form-input" {...register('name')} />
        </FormField>
        <FormField label="ת.ז" error={errors.national_id?.message}>
          <input className="form-input" {...register('national_id')} />
        </FormField>
      </div>
      <div className="form-row">
        <FormField label="סוג תשלום" error={errors.payment_type?.message}>
          <select className="form-select" {...register('payment_type')}>
            {Object.values(PaymentType).map(v => (
              <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </FormField>
        <FormField label="עלות שכר חודשית" error={errors.monthly_salary_cost?.message}>
          <input className="form-input" type="number" step="0.01" min="0"
            {...register('monthly_salary_cost', { valueAsNumber: true })} />
        </FormField>
      </div>
      <div className="form-row">
        <FormField label="טלפון" error={errors.phone?.message}>
          <input className="form-input" {...register('phone')} />
        </FormField>
        <FormField label="אימייל" error={errors.email?.message}>
          <input className="form-input" type="email" {...register('email')} />
        </FormField>
      </div>
      <div className="form-row">
        <FormField label="קוד בנק" error={errors.bank_code?.message}>
          <input className="form-input" {...register('bank_code')} />
        </FormField>
        <FormField label="סניף" error={errors.bank_branch?.message}>
          <input className="form-input" {...register('bank_branch')} />
        </FormField>
      </div>
      <div className="form-row">
        <FormField label="מספר חשבון" error={errors.bank_account?.message}>
          <input className="form-input" {...register('bank_account')} />
        </FormField>
        <FormField label="סוג חשבון" error={errors.bank_account_type?.message}>
          <input className="form-input" {...register('bank_account_type')} />
        </FormField>
      </div>
      <FormField label="כתובת" error={errors.address?.message}>
        <textarea className="form-textarea" rows={2} {...register('address')} />
      </FormField>
      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={submitting}>ביטול</button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'שומר…' : 'שמור שינויים'}
        </button>
      </div>
    </form>
  );
}
