import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormField } from '../ui/form-field';
import { ErrorBanner } from '../ui/error-banner';
import {
  flexFieldDefinitionSchema,
  type FlexFieldDefinitionFormValues,
} from '../../schemas/flex-field-definition.schema';
import { FlexFieldEntityType, FlexFieldType } from '../../types/enums';
import type { FlexFieldDefinition } from '../../types/domain.types';
import type { RpcError } from '../../types/async.types';

const ENTITY_OPTIONS = [
  { value: FlexFieldEntityType.Factory,    label: 'מפעל' },
  { value: FlexFieldEntityType.Supervisor, label: 'מפקח' },
];

const TYPE_OPTIONS = [
  { value: FlexFieldType.String,  label: 'טקסט' },
  { value: FlexFieldType.Date,    label: 'תאריך' },
  { value: FlexFieldType.Numeric, label: 'מספר' },
  { value: FlexFieldType.Enum,    label: 'רשימת ערכים' },
];

interface FlexFieldDefinitionFormProps {
  existing?: FlexFieldDefinition;
  onSubmit: (values: FlexFieldDefinitionFormValues) => Promise<void>;
  onCancel: () => void;
  submitting: boolean;
  error: RpcError | null;
}

export function FlexFieldDefinitionForm({
  existing,
  onSubmit,
  onCancel,
  submitting,
  error,
}: FlexFieldDefinitionFormProps) {
  const { register, handleSubmit, control, formState: { errors } } =
    useForm<FlexFieldDefinitionFormValues>({
      resolver: zodResolver(flexFieldDefinitionSchema),
      defaultValues: existing ? {
        entity_type:   existing.entity_type,
        field_key:     existing.field_key,
        label:         existing.label,
        field_type:    existing.field_type,
        display_order: existing.display_order,
        is_required:   existing.is_required,
        enum_options:  existing.enum_options?.join(', ') ?? undefined,
      } : {
        display_order: 0,
        is_required:   false,
      },
    });

  const fieldType = useWatch({ control, name: 'field_type' });

  return (
    <form className="form" onSubmit={handleSubmit(onSubmit)}>
      {error && <ErrorBanner error={error} />}

      <div className="form-row">
        <FormField label="ישות" required error={errors.entity_type?.message}>
          <select className="form-select" {...register('entity_type')} disabled={!!existing}>
            <option value="">בחר…</option>
            {ENTITY_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </FormField>
        <FormField label="מפתח שדה" required error={errors.field_key?.message}>
          <input
            className="form-input"
            placeholder="לדוגמה: website_url"
            {...register('field_key')}
            disabled={!!existing}
          />
        </FormField>
      </div>

      <div className="form-row">
        <FormField label="תווית (לתצוגה)" required error={errors.label?.message}>
          <input className="form-input" placeholder="לדוגמה: כתובת אתר" {...register('label')} />
        </FormField>
        <FormField label="סוג שדה" required error={errors.field_type?.message}>
          <select className="form-select" {...register('field_type')}>
            <option value="">בחר…</option>
            {TYPE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </FormField>
      </div>

      {fieldType === FlexFieldType.Enum && (
        <FormField
          label="ערכי רשימה (מופרדים בפסיק)"
          error={errors.enum_options?.message}
        >
          <input
            className="form-input"
            placeholder="לדוגמה: ערך א, ערך ב, ערך ג"
            {...register('enum_options')}
          />
        </FormField>
      )}

      <div className="form-row">
        <FormField label="סדר תצוגה" error={errors.display_order?.message}>
          <input className="form-input" type="number" min="0" {...register('display_order')} />
        </FormField>
        <FormField label="שדה חובה">
          <label className="toggle-switch" style={{ marginTop: 8 }}>
            <input type="checkbox" {...register('is_required')} />
            <span className={`toggle-track`}>
              <span className="toggle-thumb" />
            </span>
            <span className="toggle-label">חובה</span>
          </label>
        </FormField>
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={submitting}>
          ביטול
        </button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'שומר…' : existing ? 'שמור שינויים' : 'צור שדה'}
        </button>
      </div>
    </form>
  );
}
