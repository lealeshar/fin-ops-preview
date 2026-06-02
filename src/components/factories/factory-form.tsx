import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormField } from '../ui/form-field';
import { ErrorBanner } from '../ui/error-banner';
import { FlexDataInput } from '../flex-fields/flex-data-input';
import {
  createFactorySchema,
  updateFactorySchema,
  type CreateFactoryFormValues,
  type UpdateFactoryFormValues,
} from '../../schemas/factory.schema';
import { PaymentTerms, PaymentMethod } from '../../types/enums';
import type { Factory, FlexData, FlexFieldDefinition } from '../../types/domain.types';
import type { RpcError } from '../../types/async.types';

// ─── Create form ──────────────────────────────────────────────────────────────

interface CreateFactoryFormProps {
  definitions: readonly FlexFieldDefinition[];
  onSubmit: (values: CreateFactoryFormValues) => Promise<void>;
  onCancel: () => void;
  submitting: boolean;
  error: RpcError | null;
}

export function CreateFactoryForm({ definitions, onSubmit, onCancel, submitting, error }: CreateFactoryFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<CreateFactoryFormValues>({
    resolver: zodResolver(createFactorySchema),
  });
  const [flexData, setFlexData] = useState<FlexData>({});

  return (
    <form className="form" onSubmit={handleSubmit(v => onSubmit({ ...v, flex_data: flexData as Record<string, unknown> }))}>
      {error && <ErrorBanner error={error} />}
      <div className="form-row">
        <FormField label="שם מפעל" required error={errors.name?.message}>
          <input className="form-input" {...register('name')} />
        </FormField>
        <FormField label="ח.פ / ע.מ" required error={errors.tax_id?.message}>
          <input className="form-input" {...register('tax_id')} />
        </FormField>
      </div>
      <div className="form-row">
        <FormField label="תנאי תשלום" required error={errors.payment_terms?.message}>
          <select className="form-select" {...register('payment_terms')}>
            <option value="">בחר…</option>
            {Object.values(PaymentTerms).map(v => (
              <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </FormField>
        <FormField label="אמצעי תשלום" required error={errors.payment_method?.message}>
          <select className="form-select" {...register('payment_method')}>
            <option value="">בחר…</option>
            {Object.values(PaymentMethod).map(v => (
              <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </FormField>
      </div>
      <div className="form-row">
        <FormField label="איש קשר" error={errors.contact_name?.message}>
          <input className="form-input" {...register('contact_name')} />
        </FormField>
        <FormField label="טלפון" error={errors.phone?.message}>
          <input className="form-input" {...register('phone')} />
        </FormField>
      </div>
      <div className="form-row">
        <FormField label="אימייל" error={errors.email?.message}>
          <input className="form-input" type="email" {...register('email')} />
        </FormField>
        <FormField label="מזהה לקוח חיצוני" error={errors.external_customer_id?.message}>
          <input className="form-input" {...register('external_customer_id')} />
        </FormField>
      </div>
      <FormField label="כתובת" error={errors.address?.message}>
        <textarea className="form-textarea" rows={2} {...register('address')} />
      </FormField>
      <FlexDataInput definitions={definitions} initialData={null} onChange={setFlexData} />
      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={submitting}>ביטול</button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'שומר…' : 'צור מפעל'}
        </button>
      </div>
    </form>
  );
}

// ─── Edit form ────────────────────────────────────────────────────────────────

interface EditFactoryFormProps {
  factory: Factory;
  definitions: readonly FlexFieldDefinition[];
  onSubmit: (values: UpdateFactoryFormValues) => Promise<void>;
  onCancel: () => void;
  submitting: boolean;
  error: RpcError | null;
}

export function EditFactoryForm({ factory, definitions, onSubmit, onCancel, submitting, error }: EditFactoryFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<UpdateFactoryFormValues>({
    resolver: zodResolver(updateFactorySchema),
    defaultValues: {
      name:                 factory.name,
      tax_id:               factory.tax_id,
      payment_terms:        factory.payment_terms,
      payment_method:       factory.payment_method,
      address:              factory.address ?? undefined,
      contact_name:         factory.contact_name ?? undefined,
      phone:                factory.phone ?? undefined,
      email:                factory.email ?? undefined,
      external_customer_id: factory.external_customer_id ?? undefined,
    },
  });
  const [flexData, setFlexData] = useState<FlexData>(factory.flex_data ?? {});

  return (
    <form className="form" onSubmit={handleSubmit(v => onSubmit({ ...v, flex_data: flexData as Record<string, unknown> }))}>
      {error && <ErrorBanner error={error} />}
      <div className="form-row">
        <FormField label="שם מפעל" error={errors.name?.message}>
          <input className="form-input" {...register('name')} />
        </FormField>
        <FormField label="ח.פ / ע.מ" error={errors.tax_id?.message}>
          <input className="form-input" {...register('tax_id')} />
        </FormField>
      </div>
      <div className="form-row">
        <FormField label="תנאי תשלום" error={errors.payment_terms?.message}>
          <select className="form-select" {...register('payment_terms')}>
            {Object.values(PaymentTerms).map(v => (
              <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </FormField>
        <FormField label="אמצעי תשלום" error={errors.payment_method?.message}>
          <select className="form-select" {...register('payment_method')}>
            {Object.values(PaymentMethod).map(v => (
              <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </FormField>
      </div>
      <div className="form-row">
        <FormField label="איש קשר" error={errors.contact_name?.message}>
          <input className="form-input" {...register('contact_name')} />
        </FormField>
        <FormField label="טלפון" error={errors.phone?.message}>
          <input className="form-input" {...register('phone')} />
        </FormField>
      </div>
      <div className="form-row">
        <FormField label="אימייל" error={errors.email?.message}>
          <input className="form-input" type="email" {...register('email')} />
        </FormField>
        <FormField label="מזהה לקוח חיצוני" error={errors.external_customer_id?.message}>
          <input className="form-input" {...register('external_customer_id')} />
        </FormField>
      </div>
      <FormField label="כתובת" error={errors.address?.message}>
        <textarea className="form-textarea" rows={2} {...register('address')} />
      </FormField>
      <FlexDataInput definitions={definitions} initialData={factory.flex_data} onChange={setFlexData} />
      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={submitting}>ביטול</button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'שומר…' : 'שמור שינויים'}
        </button>
      </div>
    </form>
  );
}
