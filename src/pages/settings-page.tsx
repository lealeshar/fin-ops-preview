import { useState } from 'react';
import { Modal } from '../components/ui/modal';
import { ErrorBanner } from '../components/ui/error-banner';
import { SettingsTable, isFeatureFlag } from '../components/settings/settings-table';
import {
  CreateSettingForm,
  EditFlagForm,
  EditValueForm,
} from '../components/settings/setting-form';
import {
  useSystemSettingsList,
  useUpsertSystemSetting,
} from '../hooks/use-system-settings';
import type { SystemSetting } from '../types/domain.types';
import type { CreateSettingFormValues, EditFlagFormValues, EditValueFormValues } from '../schemas/system-setting.schema';
import { usePermission } from '../hooks/use-permission';

type ActiveModal =
  | { type: 'create' }
  | { type: 'edit'; setting: SystemSetting }
  | null;

export function SettingsPage() {
  const { canManageSettings } = usePermission();
  const [activeModal, setActiveModal]   = useState<ActiveModal>(null);
  const [typeFilter, setTypeFilter]     = useState('');
  const [togglingKeys, setTogglingKeys] = useState<ReadonlySet<string>>(new Set<string>());

  const { state: listState, reload } = useSystemSettingsList();
  const upsertMut = useUpsertSystemSetting();

  const allSettings = listState.status === 'success' ? listState.data : [];
  const loading      = listState.status === 'idle' || listState.status === 'loading';

  const settings = typeFilter === 'flag'
    ? allSettings.filter(s => isFeatureFlag(s.value))
    : typeFilter === 'setting'
      ? allSettings.filter(s => !isFeatureFlag(s.value))
      : allSettings;

  function closeModal() { setActiveModal(null); }

  async function handleCreate(values: CreateSettingFormValues) {
    const value = values.is_flag
      ? { enabled: false }
      : JSON.parse(values.value_json ?? 'null') as unknown;
    const result = await upsertMut.execute(
      values.key,
      value,
      values.description ?? null,
    );
    if (result.error === null) { closeModal(); upsertMut.reset(); reload(); }
  }

  async function handleEditFlag(setting: SystemSetting, values: EditFlagFormValues) {
    const result = await upsertMut.execute(
      setting.key,
      { enabled: values.enabled },
      values.description ?? null,
    );
    if (result.error === null) { closeModal(); upsertMut.reset(); reload(); }
  }

  async function handleEditValue(setting: SystemSetting, values: EditValueFormValues) {
    const result = await upsertMut.execute(
      setting.key,
      JSON.parse(values.value_json) as unknown,
      values.description ?? null,
    );
    if (result.error === null) { closeModal(); upsertMut.reset(); reload(); }
  }

  async function handleToggle(setting: SystemSetting) {
    const flagData = isFeatureFlag(setting.value) ? setting.value : null;
    if (flagData === null) return;

    setTogglingKeys(prev => new Set([...prev, setting.key]));
    await upsertMut.execute(setting.key, { enabled: !flagData.enabled });
    setTogglingKeys(prev => {
      const next = new Set(prev);
      next.delete(setting.key);
      return next;
    });
    reload();
  }

  const submitting = upsertMut.state.status === 'loading';
  const upsertError = upsertMut.state.status === 'error' ? upsertMut.state.error : null;

  return (
    <div className="page">
      <div className="page-header">
        <h1>הגדרות מערכת</h1>
        {canManageSettings && (
          <button
            className="btn btn-primary"
            onClick={() => { upsertMut.reset(); setActiveModal({ type: 'create' }); }}
          >
            + הגדרה חדשה
          </button>
        )}
      </div>

      {listState.status === 'error' && <ErrorBanner error={listState.error} />}

      <div className="filters">
        <select
          className="filter-select"
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
        >
          <option value="">הכל</option>
          <option value="flag">Feature Flags בלבד</option>
          <option value="setting">הגדרות בלבד</option>
        </select>
        <span style={{ fontSize: 13, color: '#64748b' }}>
          {settings.length} רשומות
        </span>
      </div>

      <SettingsTable
        settings={settings}
        loading={loading}
        togglingKeys={togglingKeys}
        onEdit={canManageSettings ? s => { upsertMut.reset(); setActiveModal({ type: 'edit', setting: s }); } : undefined}
        onToggle={canManageSettings ? handleToggle : undefined}
      />

      {activeModal?.type === 'create' && (
        <Modal title="הגדרה חדשה" onClose={closeModal}>
          <CreateSettingForm
            onSubmit={handleCreate}
            onCancel={closeModal}
            submitting={submitting}
            error={upsertError}
          />
        </Modal>
      )}

      {activeModal?.type === 'edit' && isFeatureFlag(activeModal.setting.value) && (
        <Modal title={`ערוך: ${activeModal.setting.key}`} onClose={closeModal}>
          <EditFlagForm
            setting={activeModal.setting}
            onSubmit={v => handleEditFlag(activeModal.setting, v)}
            onCancel={closeModal}
            submitting={submitting}
            error={upsertError}
          />
        </Modal>
      )}

      {activeModal?.type === 'edit' && !isFeatureFlag(activeModal.setting.value) && (
        <Modal title={`ערוך: ${activeModal.setting.key}`} onClose={closeModal}>
          <EditValueForm
            setting={activeModal.setting}
            onSubmit={v => handleEditValue(activeModal.setting, v)}
            onCancel={closeModal}
            submitting={submitting}
            error={upsertError}
          />
        </Modal>
      )}
    </div>
  );
}
