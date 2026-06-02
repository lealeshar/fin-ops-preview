import { useState } from 'react';
import { Modal } from '../components/ui/modal';
import { ErrorBanner } from '../components/ui/error-banner';
import { CreateFactoryForm, EditFactoryForm } from '../components/factories/factory-form';
import { FactoriesTable } from '../components/factories/factories-table';
import {
  useFactoryList,
  useCreateFactory,
  useUpdateFactory,
  useArchiveFactory,
} from '../hooks/use-factories';
import type { Factory, CreateFactoryInput, UpdateFactoryInput } from '../types/domain.types';
import type { FlexData } from '../types/domain.types';
import type { CreateFactoryFormValues, UpdateFactoryFormValues } from '../schemas/factory.schema';
import { EntityStatus } from '../types/enums';

type ActiveModal =
  | { type: 'create' }
  | { type: 'edit'; factory: Factory }
  | null;

export function FactoriesPage() {
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const { state: listState, reload } = useFactoryList({
    status: statusFilter ? (statusFilter as EntityStatus) : undefined,
    search: search || undefined,
  });

  const createMut = useCreateFactory();
  const updateMut = useUpdateFactory();
  const archiveMut = useArchiveFactory();

  const factories = listState.status === 'success' ? listState.data.items : [];
  const loading    = listState.status === 'idle' || listState.status === 'loading';

  function closeModal() { setActiveModal(null); }

  async function handleCreate(values: CreateFactoryFormValues) {
    const input: CreateFactoryInput = {
      name:                 values.name,
      tax_id:               values.tax_id,
      payment_terms:        values.payment_terms,
      payment_method:       values.payment_method,
      status:               EntityStatus.Active,
      address:              values.address ?? null,
      contact_name:         values.contact_name ?? null,
      phone:                values.phone ?? null,
      email:                values.email ?? null,
      external_customer_id: values.external_customer_id ?? null,
      flex_data:            (values.flex_data as FlexData | null) ?? null,
    };
    const result = await createMut.execute(input);
    if (result.error === null) { closeModal(); createMut.reset(); reload(); }
  }

  async function handleUpdate(factory: Factory, values: UpdateFactoryFormValues) {
    const patch: UpdateFactoryInput = {
      ...(values.name                 !== undefined && { name:                 values.name }),
      ...(values.tax_id               !== undefined && { tax_id:               values.tax_id }),
      ...(values.payment_terms        !== undefined && { payment_terms:        values.payment_terms }),
      ...(values.payment_method       !== undefined && { payment_method:       values.payment_method }),
      ...(values.address              !== undefined && { address:              values.address              ?? null }),
      ...(values.contact_name         !== undefined && { contact_name:         values.contact_name         ?? null }),
      ...(values.phone                !== undefined && { phone:                values.phone                ?? null }),
      ...(values.email                !== undefined && { email:                values.email                ?? null }),
      ...(values.external_customer_id !== undefined && { external_customer_id: values.external_customer_id ?? null }),
    };
    const result = await updateMut.execute(factory.id, patch, factory.version_number);
    if (result.error === null) { closeModal(); updateMut.reset(); reload(); }
  }

  async function handleArchive(factory: Factory) {
    if (!window.confirm(`ארכיון מפעל "${factory.name}"?`)) return;
    const result = await archiveMut.execute(factory.id, factory.version_number);
    if (result.error === null) reload();
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>מפעלים</h1>
        <button
          className="btn btn-primary"
          onClick={() => { createMut.reset(); setActiveModal({ type: 'create' }); }}
        >
          + מפעל חדש
        </button>
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

      <FactoriesTable
        factories={factories}
        loading={loading}
        onEdit={factory => { updateMut.reset(); setActiveModal({ type: 'edit', factory }); }}
        onArchive={handleArchive}
      />

      {activeModal?.type === 'create' && (
        <Modal title="מפעל חדש" onClose={closeModal}>
          <CreateFactoryForm
            onSubmit={handleCreate}
            onCancel={closeModal}
            submitting={createMut.state.status === 'loading'}
            error={createMut.state.status === 'error' ? createMut.state.error : null}
          />
        </Modal>
      )}

      {activeModal?.type === 'edit' && (
        <Modal title={`עריכת ${activeModal.factory.name}`} onClose={closeModal}>
          <EditFactoryForm
            factory={activeModal.factory}
            onSubmit={values => handleUpdate(activeModal.factory, values)}
            onCancel={closeModal}
            submitting={updateMut.state.status === 'loading'}
            error={updateMut.state.status === 'error' ? updateMut.state.error : null}
          />
        </Modal>
      )}
    </div>
  );
}
