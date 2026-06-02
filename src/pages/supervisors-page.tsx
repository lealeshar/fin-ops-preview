import { useState } from 'react';
import { Modal } from '../components/ui/modal';
import { ErrorBanner } from '../components/ui/error-banner';
import { CreateSupervisorForm, EditSupervisorForm } from '../components/supervisors/supervisor-form';
import { SupervisorsTable } from '../components/supervisors/supervisors-table';
import {
  useSupervisorList,
  useCreateSupervisor,
  useUpdateSupervisor,
  useArchiveSupervisor,
} from '../hooks/use-supervisors';
import type { Supervisor, CreateSupervisorInput, UpdateSupervisorInput } from '../types/domain.types';
import type { FlexData } from '../types/domain.types';
import type { CreateSupervisorFormValues, UpdateSupervisorFormValues } from '../schemas/supervisor.schema';
import { EntityStatus } from '../types/enums';
import { usePermission } from '../hooks/use-permission';

type ActiveModal =
  | { type: 'create' }
  | { type: 'edit'; supervisor: Supervisor }
  | null;

export function SupervisorsPage() {
  const { canCreate, canEdit, canArchive } = usePermission();
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const { state: listState, reload } = useSupervisorList({
    status: statusFilter ? (statusFilter as EntityStatus) : undefined,
    search: search || undefined,
  });

  const createMut = useCreateSupervisor();
  const updateMut = useUpdateSupervisor();
  const archiveMut = useArchiveSupervisor();

  const supervisors = listState.status === 'success' ? listState.data.items : [];
  const loading     = listState.status === 'idle' || listState.status === 'loading';

  function closeModal() { setActiveModal(null); }

  async function handleCreate(values: CreateSupervisorFormValues) {
    const input: CreateSupervisorInput = {
      name:                values.name,
      national_id:         values.national_id,
      payment_type:        values.payment_type,
      monthly_salary_cost: values.monthly_salary_cost,
      status:              EntityStatus.Active,
      phone:               values.phone ?? null,
      email:               values.email ?? null,
      address:             values.address ?? null,
      bank_code:           values.bank_code ?? null,
      bank_branch:         values.bank_branch ?? null,
      bank_account:        values.bank_account ?? null,
      bank_account_type:   values.bank_account_type ?? null,
      flex_data:           (values.flex_data as FlexData | null) ?? null,
    };
    const result = await createMut.execute(input);
    if (result.error === null) { closeModal(); createMut.reset(); reload(); }
  }

  async function handleUpdate(supervisor: Supervisor, values: UpdateSupervisorFormValues) {
    const patch: UpdateSupervisorInput = {
      ...(values.name                !== undefined && { name:                values.name }),
      ...(values.national_id         !== undefined && { national_id:         values.national_id }),
      ...(values.payment_type        !== undefined && { payment_type:        values.payment_type }),
      ...(values.monthly_salary_cost !== undefined && { monthly_salary_cost: values.monthly_salary_cost }),
      ...(values.phone               !== undefined && { phone:               values.phone               ?? null }),
      ...(values.email               !== undefined && { email:               values.email               ?? null }),
      ...(values.address             !== undefined && { address:             values.address             ?? null }),
      ...(values.bank_code           !== undefined && { bank_code:           values.bank_code           ?? null }),
      ...(values.bank_branch         !== undefined && { bank_branch:         values.bank_branch         ?? null }),
      ...(values.bank_account        !== undefined && { bank_account:        values.bank_account        ?? null }),
      ...(values.bank_account_type   !== undefined && { bank_account_type:   values.bank_account_type   ?? null }),
    };
    const result = await updateMut.execute(supervisor.id, patch, supervisor.version_number);
    if (result.error === null) { closeModal(); updateMut.reset(); reload(); }
  }

  async function handleArchive(supervisor: Supervisor) {
    if (!window.confirm(`ארכיון מפקח "${supervisor.name}"?`)) return;
    const result = await archiveMut.execute(supervisor.id, supervisor.version_number);
    if (result.error === null) reload();
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>מפקחים</h1>
        {canCreate && (
          <button
            className="btn btn-primary"
            onClick={() => { createMut.reset(); setActiveModal({ type: 'create' }); }}
          >
            + מפקח חדש
          </button>
        )}
      </div>

      {listState.status === 'error' && <ErrorBanner error={listState.error} />}
      {archiveMut.state.status === 'error' && <ErrorBanner error={archiveMut.state.error} />}

      <div className="filters">
        <select
          className="filter-select"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">כל הסטטוסים</option>
          <option value={EntityStatus.Active}>פעיל</option>
          <option value={EntityStatus.Inactive}>לא פעיל</option>
        </select>
        <input
          className="filter-input"
          style={{ width: 200 }}
          placeholder="חיפוש שם…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <SupervisorsTable
        supervisors={supervisors}
        loading={loading}
        onEdit={canEdit    ? supervisor => { updateMut.reset(); setActiveModal({ type: 'edit', supervisor }); } : undefined}
        onArchive={canArchive ? handleArchive : undefined}
      />

      {activeModal?.type === 'create' && (
        <Modal title="מפקח חדש" onClose={closeModal}>
          <CreateSupervisorForm
            onSubmit={handleCreate}
            onCancel={closeModal}
            submitting={createMut.state.status === 'loading'}
            error={createMut.state.status === 'error' ? createMut.state.error : null}
          />
        </Modal>
      )}

      {activeModal?.type === 'edit' && (
        <Modal title={`עריכת ${activeModal.supervisor.name}`} onClose={closeModal}>
          <EditSupervisorForm
            supervisor={activeModal.supervisor}
            onSubmit={values => handleUpdate(activeModal.supervisor, values)}
            onCancel={closeModal}
            submitting={updateMut.state.status === 'loading'}
            error={updateMut.state.status === 'error' ? updateMut.state.error : null}
          />
        </Modal>
      )}
    </div>
  );
}
