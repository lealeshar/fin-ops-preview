import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormField } from '../ui/form-field';
import { ErrorBanner } from '../ui/error-banner';
import {
  createSettingSchema,
  editFlagSchema,
  editValueSchema,
} from '../../schemas/system-setting.schema';
import type {
  CreateSettingFormValues,
  EditFlagFormValues,
  EditValueFormValues,
} from '../../schemas/system-setting.schema';
import type { SystemSetting } from '../../types/domain.types';
import type { RpcError } from '../../types/async.types';
import { isFeatureFlag } from './settings-table';

// ─── Create ──────────────────────────────────────────────────────────────────

interface CreateSettingFormProps {
  onSubmit: (values: CreateSettingFormValues) => void;
  onCancel: () => void;
  submitting: boolean;
  error: RpcError | null;
}

export function CreateSettingForm({
  onSubmit,
  onCancel,
  submitting,
  error,
}: CreateSettingFormProps) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } =
    useForm<CreateSettingFormValues>({
      resolver: zodResolver(createSettingSchema),
      defaultValues: { is_flag: false },
    });

  const isFlag = watch('is_flag');

  return (
    <form className="form" onSubmit={handleSubmit(onSubmit)}>
      {error && <ErrorBanner error={error} />}

      <FormField label="מפתח" required error={errors.key?.message}>
        <input
          className="form-input"
          placeholder="my_setting_key"
          dir="ltr"
          autoFocus
          {...register('key')}
        />
      </FormField>

      <FormField label="סוג">
        <div style={{ display: 'flex', gap: 20, marginTop: 4 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input
              type="radio"
              checked={!isFlag}
              onChange={() => setValue('is_flag', false)}
            />
            הגדרה (ערך)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input
              type="radio"
              checked={isFlag}
              onChange={() => setValue('is_flag', true)}
            />
            Feature Flag
          </label>
        </div>
      </FormField>

      {!isFlag && (
        <FormField label="ערך (JSON)" required error={errors.value_json?.message}>
          <textarea
            className="form-textarea"
            rows={3}
            placeholder={'42\n"some text"\n{"threshold": 0.85}'}
            dir="ltr"
            {...register('value_json')}
          />
        </FormField>
      )}

      <FormField label="תיאור" error={errors.description?.message}>
        <input
          className="form-input"
          placeholder="תיאור קצר של ההגדרה"
          {...register('description')}
        />
      </FormField>

      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={submitting}>
          ביטול
        </button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'שומר…' : 'צור הגדרה'}
        </button>
      </div>
    </form>
  );
}

// ─── Edit Flag ────────────────────────────────────────────────────────────────

interface EditFlagFormProps {
  setting: SystemSetting;
  onSubmit: (values: EditFlagFormValues) => void;
  onCancel: () => void;
  submitting: boolean;
  error: RpcError | null;
}

export function EditFlagForm({
  setting,
  onSubmit,
  onCancel,
  submitting,
  error,
}: EditFlagFormProps) {
  const flagData = isFeatureFlag(setting.value) ? setting.value : { enabled: false };

  const { register, handleSubmit, watch, formState: { errors } } =
    useForm<EditFlagFormValues>({
      resolver: zodResolver(editFlagSchema),
      defaultValues: {
        enabled:     flagData.enabled,
        description: setting.description ?? undefined,
      },
    });

  const enabled = watch('enabled');

  return (
    <form className="form" onSubmit={handleSubmit(onSubmit)}>
      {error && <ErrorBanner error={error} />}

      <div style={{ marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500, textTransform: 'uppercase' }}>
          מפתח
        </span>
        <code
          dir="ltr"
          style={{ display: 'block', marginTop: 4, fontSize: 13, background: '#f1f5f9', padding: '6px 10px', borderRadius: 4 }}
        >
          {setting.key}
        </code>
      </div>

      <FormField label="מצב" error={errors.enabled?.message}>
        <label className="toggle-switch" style={{ marginTop: 4 }}>
          <input type="checkbox" checked={enabled} {...register('enabled')} />
          <span className={`toggle-track${enabled ? ' on' : ''}`}>
            <span className="toggle-thumb" />
          </span>
          <span className="toggle-label">{enabled ? 'מופעל' : 'כבוי'}</span>
        </label>
      </FormField>

      <FormField label="תיאור" error={errors.description?.message}>
        <input
          className="form-input"
          placeholder="תיאור קצר של ההגדרה"
          {...register('description')}
        />
      </FormField>

      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={submitting}>
          ביטול
        </button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'שומר…' : 'שמור'}
        </button>
      </div>
    </form>
  );
}

// ─── Edit Value ───────────────────────────────────────────────────────────────

interface EditValueFormProps {
  setting: SystemSetting;
  onSubmit: (values: EditValueFormValues) => void;
  onCancel: () => void;
  submitting: boolean;
  error: RpcError | null;
}

export function EditValueForm({
  setting,
  onSubmit,
  onCancel,
  submitting,
  error,
}: EditValueFormProps) {
  const { register, handleSubmit, formState: { errors } } =
    useForm<EditValueFormValues>({
      resolver: zodResolver(editValueSchema),
      defaultValues: {
        value_json:  JSON.stringify(setting.value, null, 2),
        description: setting.description ?? undefined,
      },
    });

  return (
    <form className="form" onSubmit={handleSubmit(onSubmit)}>
      {error && <ErrorBanner error={error} />}

      <div style={{ marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500, textTransform: 'uppercase' }}>
          מפתח
        </span>
        <code
          dir="ltr"
          style={{ display: 'block', marginTop: 4, fontSize: 13, background: '#f1f5f9', padding: '6px 10px', borderRadius: 4 }}
        >
          {setting.key}
        </code>
      </div>

      <FormField label="ערך (JSON)" required error={errors.value_json?.message}>
        <textarea
          className="form-textarea"
          rows={5}
          dir="ltr"
          {...register('value_json')}
        />
      </FormField>

      <FormField label="תיאור" error={errors.description?.message}>
        <input
          className="form-input"
          placeholder="תיאור קצר של ההגדרה"
          {...register('description')}
        />
      </FormField>

      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={submitting}>
          ביטול
        </button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'שומר…' : 'שמור'}
        </button>
      </div>
    </form>
  );
}
