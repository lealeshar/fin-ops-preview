import { useState } from 'react';
import { Modal } from '../components/ui/modal';
import { ErrorBanner } from '../components/ui/error-banner';
import { SettingsTable, isFeatureFlag } from '../components/settings/settings-table';
import { FlexFieldDefinitionsTable } from '../components/flex-fields/flex-field-definitions-table';
import { FlexFieldDefinitionForm } from '../components/flex-fields/flex-field-definition-form';
import {
  CreateSettingForm,
  EditFlagForm,
  EditValueForm,
} from '../components/settings/setting-form';
import {
  useSystemSettingsList,
  useUpsertSystemSetting,
} from '../hooks/use-system-settings';
import {
  useFlexFieldDefinitionsList,
  useUpsertFlexFieldDefinition,
} from '../hooks/use-flex-field-definitions';
import { usePermission } from '../hooks/use-permission';
import type { SystemSetting, FlexFieldDefinition } from '../types/domain.types';
import type { CreateSettingFormValues, EditFlagFormValues, EditValueFormValues } from '../schemas/system-setting.schema';
import type { FlexFieldDefinitionFormValues } from '../schemas/flex-field-definition.schema';
import { FlexFieldEntityType } from '../types/enums';
import type { UpsertFlexFieldDefinitionInput } from '../lib/repositories';

type SettingsTab = 'system' | 'flex';

type SystemModal =
  | { type: 'create' }
  | { type: 'edit'; setting: SystemSetting }
  | null;

type FlexModal =
  | { type: 'create' }
  | { type: 'edit'; def: FlexFieldDefinition }
  | null;

// ─── System Settings section ──────────────────────────────────────────────────

interface SystemSettingsSectionProps {
  canManage: boolean;
}

function SystemSettingsSection({ canManage }: SystemSettingsSectionProps) {
  const [activeModal, setActiveModal] = useState<SystemModal>(null);
  const [typeFilter, setTypeFilter]   = useState('');
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
    const result = await upsertMut.execute(values.key, value, values.description ?? null);
    if (result.error === null) { closeModal(); upsertMut.reset(); reload(); }
  }

  async function handleEditFlag(setting: SystemSetting, values: EditFlagFormValues) {
    const result = await upsertMut.execute(setting.key, { enabled: values.enabled }, values.description ?? null);
    if (result.error === null) { closeModal(); upsertMut.reset(); reload(); }
  }

  async function handleEditValue(setting: SystemSetting, values: EditValueFormValues) {
    const result = await upsertMut.execute(setting.key, JSON.parse(values.value_json) as unknown, values.description ?? null);
    if (result.error === null) { closeModal(); upsertMut.reset(); reload(); }
  }

  async function handleToggle(setting: SystemSetting) {
    const flagData = isFeatureFlag(setting.value) ? setting.value : null;
    if (flagData === null) return;
    setTogglingKeys(prev => new Set([...prev, setting.key]));
    await upsertMut.execute(setting.key, { enabled: !flagData.enabled });
    setTogglingKeys(prev => { const n = new Set(prev); n.delete(setting.key); return n; });
    reload();
  }

  const submitting  = upsertMut.state.status === 'loading';
  const upsertError = upsertMut.state.status === 'error' ? upsertMut.state.error : null;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div className="filters" style={{ margin: 0 }}>
          <select className="filter-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">הכל</option>
            <option value="flag">Feature Flags בלבד</option>
            <option value="setting">הגדרות בלבד</option>
          </select>
          <span style={{ fontSize: 13, color: '#64748b' }}>{settings.length} רשומות</span>
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={() => { upsertMut.reset(); setActiveModal({ type: 'create' }); }}>
            + הגדרה חדשה
          </button>
        )}
      </div>

      {listState.status === 'error' && <ErrorBanner error={listState.error} />}

      <SettingsTable
        settings={settings}
        loading={loading}
        togglingKeys={togglingKeys}
        onEdit={canManage ? s => { upsertMut.reset(); setActiveModal({ type: 'edit', setting: s }); } : undefined}
        onToggle={canManage ? handleToggle : undefined}
      />

      {activeModal?.type === 'create' && (
        <Modal title="הגדרה חדשה" onClose={closeModal}>
          <CreateSettingForm onSubmit={handleCreate} onCancel={closeModal} submitting={submitting} error={upsertError} />
        </Modal>
      )}
      {activeModal?.type === 'edit' && isFeatureFlag(activeModal.setting.value) && (
        <Modal title={`ערוך: ${activeModal.setting.key}`} onClose={closeModal}>
          <EditFlagForm setting={activeModal.setting} onSubmit={v => handleEditFlag(activeModal.setting, v)} onCancel={closeModal} submitting={submitting} error={upsertError} />
        </Modal>
      )}
      {activeModal?.type === 'edit' && !isFeatureFlag(activeModal.setting.value) && (
        <Modal title={`ערוך: ${activeModal.setting.key}`} onClose={closeModal}>
          <EditValueForm setting={activeModal.setting} onSubmit={v => handleEditValue(activeModal.setting, v)} onCancel={closeModal} submitting={submitting} error={upsertError} />
        </Modal>
      )}
    </>
  );
}

// ─── Flex fields section ──────────────────────────────────────────────────────

interface FlexFieldsSectionProps {
  canManage: boolean;
}

function FlexFieldsSection({ canManage }: FlexFieldsSectionProps) {
  const [activeModal, setActiveModal] = useState<FlexModal>(null);
  const [entityFilter, setEntityFilter] = useState<FlexFieldEntityType | ''>('');

  const entityType = entityFilter !== '' ? entityFilter : undefined;
  const { state: defsState, reload } = useFlexFieldDefinitionsList(entityType);
  const upsertMut = useUpsertFlexFieldDefinition();

  const definitions = defsState.status === 'success' ? defsState.data : [];
  const loading      = defsState.status === 'idle' || defsState.status === 'loading';

  function closeModal() { setActiveModal(null); }

  async function handleUpsert(values: FlexFieldDefinitionFormValues) {
    const enumOpts = values.field_type === 'enum' && values.enum_options
      ? values.enum_options.split(',').map(s => s.trim()).filter(Boolean)
      : null;

    const input: UpsertFlexFieldDefinitionInput = {
      entity_type:   values.entity_type,
      field_key:     values.field_key,
      label:         values.label,
      field_type:    values.field_type,
      display_order: values.display_order,
      is_required:   values.is_required,
      enum_options:  enumOpts,
    };
    const result = await upsertMut.execute(input);
    if (result.error === null) { closeModal(); upsertMut.reset(); reload(); }
  }

  const submitting = upsertMut.state.status === 'loading';
  const upsertError = upsertMut.state.status === 'error' ? upsertMut.state.error : null;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div className="filters" style={{ margin: 0 }}>
          <select className="filter-select" value={entityFilter} onChange={e => setEntityFilter(e.target.value as FlexFieldEntityType | '')}>
            <option value="">כל הישויות</option>
            <option value={FlexFieldEntityType.Factory}>מפעלים</option>
            <option value={FlexFieldEntityType.Supervisor}>מפקחים</option>
          </select>
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={() => { upsertMut.reset(); setActiveModal({ type: 'create' }); }}>
            + שדה חדש
          </button>
        )}
      </div>

      {defsState.status === 'error' && <ErrorBanner error={defsState.error} />}

      <FlexFieldDefinitionsTable
        definitions={definitions}
        loading={loading}
        onEdit={canManage ? def => { upsertMut.reset(); setActiveModal({ type: 'edit', def }); } : undefined}
      />

      {activeModal?.type === 'create' && (
        <Modal title="שדה גמיש חדש" onClose={closeModal}>
          <FlexFieldDefinitionForm onSubmit={handleUpsert} onCancel={closeModal} submitting={submitting} error={upsertError} />
        </Modal>
      )}
      {activeModal?.type === 'edit' && (
        <Modal title={`ערוך שדה: ${activeModal.def.label}`} onClose={closeModal}>
          <FlexFieldDefinitionForm existing={activeModal.def} onSubmit={handleUpsert} onCancel={closeModal} submitting={submitting} error={upsertError} />
        </Modal>
      )}
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const { canManageSettings } = usePermission();
  const [tab, setTab] = useState<SettingsTab>('system');

  return (
    <div className="page">
      <div className="page-header">
        <h1>הגדרות</h1>
      </div>

      <div className="page-tabs">
        <button
          className={`page-tab${tab === 'system' ? ' active' : ''}`}
          onClick={() => setTab('system')}
        >
          הגדרות מערכת
        </button>
        <button
          className={`page-tab${tab === 'flex' ? ' active' : ''}`}
          onClick={() => setTab('flex')}
        >
          שדות גמישים
        </button>
      </div>

      {tab === 'system' && <SystemSettingsSection canManage={canManageSettings} />}
      {tab === 'flex'   && <FlexFieldsSection    canManage={canManageSettings} />}
    </div>
  );
}
