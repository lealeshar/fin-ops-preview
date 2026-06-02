import type { Repositories } from '../repositories/create-repositories';
import type {
  Factory,
  Supervisor,
  Job,
  FinancialEvent,
  DashboardStats,
  PaginatedResult,
  RpcResponse,
} from '../../types/domain.types';
import {
  EntityStatus,
  OperationalStatus,
  AccountingStatus,
  PaymentTerms,
  PaymentMethod,
  PaymentType,
  FinancialEventType,
} from '../../types/enums';

const ORG = 'demo-org-id';
const NOW = new Date().toISOString();

function ok<T>(data: T): RpcResponse<T> {
  return { data, error: null };
}

function paged<T>(items: T[]): RpcResponse<PaginatedResult<T>> {
  return ok({ items, total_count: items.length });
}

// ─── Seed data ────────────────────────────────────────────────────────────────

const FACTORIES: Factory[] = [
  {
    id: 'fac-1', organization_id: ORG, created_at: NOW, updated_at: NOW, version_number: 2,
    name: 'מפעל טקסטיל א.ב.ג ישראל', tax_id: '510123456',
    address: 'רחוב הרצל 12, תל אביב', contact_name: 'אבי גולדברג',
    phone: '03-1234567', email: 'avi@abg-textile.co.il',
    external_customer_id: 'CUST-001', payment_terms: PaymentTerms.Current30,
    payment_method: PaymentMethod.BankTransfer, status: EntityStatus.Active,
    flex_data: null, is_deleted: false, archived_at: null, inactive_reason: null,
  },
  {
    id: 'fac-2', organization_id: ORG, created_at: NOW, updated_at: NOW, version_number: 3,
    name: 'מפעל מזון תנובה צפון', tax_id: '520234567',
    address: 'אזור תעשייה, נשר', contact_name: 'דנה שמש',
    phone: '04-2345678', email: 'dana@tnuva-north.co.il',
    external_customer_id: 'CUST-002', payment_terms: PaymentTerms.Current60,
    payment_method: PaymentMethod.Check, status: EntityStatus.Active,
    flex_data: null, is_deleted: false, archived_at: null, inactive_reason: null,
  },
  {
    id: 'fac-3', organization_id: ORG, created_at: NOW, updated_at: NOW, version_number: 1,
    name: 'מפעל אלקטרוניקה סיסקום', tax_id: '530345678',
    address: 'פארק הייטק, חיפה', contact_name: 'יוסי ברק',
    phone: '04-3456789', email: null,
    external_customer_id: null, payment_terms: PaymentTerms.Immediate,
    payment_method: PaymentMethod.BankTransfer, status: EntityStatus.Inactive,
    flex_data: null, is_deleted: false, archived_at: '2026-03-01T00:00:00Z',
    inactive_reason: 'הפסקת פעילות',
  },
];

const SUPERVISORS: Supervisor[] = [
  {
    id: 'sup-1', organization_id: ORG, created_at: NOW, updated_at: NOW, version_number: 1,
    name: 'ישראל ישראלי', national_id: '012345678',
    phone: '050-1234567', email: 'israel@gmail.com',
    address: 'רחוב האורן 5, ראשון לציון',
    payment_type: PaymentType.MASAV, monthly_salary_cost: 12500,
    bank_code: '12', bank_branch: '045', bank_account: '123456789',
    bank_account_type: '1', status: EntityStatus.Active,
    flex_data: null, is_deleted: false, archived_at: null, inactive_reason: null,
  },
  {
    id: 'sup-2', organization_id: ORG, created_at: NOW, updated_at: NOW, version_number: 2,
    name: 'שרה כהן', national_id: '023456789',
    phone: '052-2345678', email: 'sarah.cohen@gmail.com',
    address: 'שדרות רוטשילד 22, תל אביב',
    payment_type: PaymentType.SalarySlip, monthly_salary_cost: 9800,
    bank_code: '11', bank_branch: '012', bank_account: '234567890',
    bank_account_type: '1', status: EntityStatus.Active,
    flex_data: null, is_deleted: false, archived_at: null, inactive_reason: null,
  },
  {
    id: 'sup-3', organization_id: ORG, created_at: NOW, updated_at: NOW, version_number: 1,
    name: 'מוחמד עלי', national_id: '034567890',
    phone: '054-3456789', email: null,
    address: 'רחוב הגליל 8, נצרת',
    payment_type: PaymentType.MASAV, monthly_salary_cost: 11000,
    bank_code: '20', bank_branch: '003', bank_account: '345678901',
    bank_account_type: '1', status: EntityStatus.Active,
    flex_data: null, is_deleted: false, archived_at: null, inactive_reason: null,
  },
];

const JOBS: Job[] = [
  {
    id: 'job-1', organization_id: ORG, created_at: NOW, updated_at: NOW, version_number: 4,
    job_code: 'JOB-2026-0001',
    factory_id: 'fac-1', supervisor_id: 'sup-1',
    billing_month: 5, billing_year: 2026,
    factory_charge_amount: 15000, supervisor_payout_amount: 12500,
    operational_status: OperationalStatus.Matched,
    accounting_status: AccountingStatus.Approved,
  },
  {
    id: 'job-2', organization_id: ORG, created_at: NOW, updated_at: NOW, version_number: 2,
    job_code: 'JOB-2026-0002',
    factory_id: 'fac-2', supervisor_id: 'sup-2',
    billing_month: 5, billing_year: 2026,
    factory_charge_amount: 11760, supervisor_payout_amount: 9800,
    operational_status: OperationalStatus.PartialMatch,
    accounting_status: AccountingStatus.PendingApproval,
  },
  {
    id: 'job-3', organization_id: ORG, created_at: NOW, updated_at: NOW, version_number: 1,
    job_code: 'JOB-2026-0003',
    factory_id: 'fac-1', supervisor_id: 'sup-3',
    billing_month: 4, billing_year: 2026,
    factory_charge_amount: 13200, supervisor_payout_amount: 11000,
    operational_status: OperationalStatus.Draft,
    accounting_status: AccountingStatus.PendingApproval,
  },
  {
    id: 'job-4', organization_id: ORG, created_at: NOW, updated_at: NOW, version_number: 6,
    job_code: 'JOB-2026-0004',
    factory_id: 'fac-2', supervisor_id: 'sup-1',
    billing_month: 4, billing_year: 2026,
    factory_charge_amount: 15000, supervisor_payout_amount: 12500,
    operational_status: OperationalStatus.Matched,
    accounting_status: AccountingStatus.Paid,
  },
  {
    id: 'job-5', organization_id: ORG, created_at: NOW, updated_at: NOW, version_number: 2,
    job_code: 'JOB-2026-0005',
    factory_id: 'fac-1', supervisor_id: 'sup-2',
    billing_month: 5, billing_year: 2026,
    factory_charge_amount: 11760, supervisor_payout_amount: 9800,
    operational_status: OperationalStatus.WaitingMatch,
    accounting_status: AccountingStatus.PendingApproval,
  },
];

const FINANCIAL_EVENTS: FinancialEvent[] = [
  {
    id: 'evt-1', organization_id: ORG, created_at: NOW,
    event_type: FinancialEventType.Charge, job_id: 'job-1',
    amount: 15000, description: 'חיוב ראשוני — מאי 2026',
    idempotency_key: 'demo-evt-1', correlation_id: 'demo-session', metadata: null,
  },
  {
    id: 'evt-2', organization_id: ORG, created_at: NOW,
    event_type: FinancialEventType.Credit, job_id: 'job-1',
    amount: 500, description: 'זיכוי — תיקון חישוב',
    idempotency_key: 'demo-evt-2', correlation_id: 'demo-session', metadata: null,
  },
  {
    id: 'evt-3', organization_id: ORG, created_at: NOW,
    event_type: FinancialEventType.Charge, job_id: 'job-4',
    amount: 15000, description: 'חיוב — אפריל 2026',
    idempotency_key: 'demo-evt-3', correlation_id: 'demo-session', metadata: null,
  },
];

// ─── Mock repository objects ──────────────────────────────────────────────────

const mockFactories = {
  findById: async (id: string) => ok(FACTORIES.find(f => f.id === id) ?? null),
  list: async () => paged(FACTORIES),
  create: async (input: unknown) => ok({ ...FACTORIES[0]!, id: `fac-new-${Date.now()}`, ...(input as object) } as Factory),
  update: async (id: string, patch: unknown) => ok({ ...FACTORIES.find(f => f.id === id)!, ...(patch as object) } as Factory),
  archive: async (id: string) => ok({ ...FACTORIES.find(f => f.id === id)!, status: EntityStatus.Inactive, archived_at: NOW } as Factory),
};

const mockSupervisors = {
  findById: async (id: string) => ok(SUPERVISORS.find(s => s.id === id) ?? null),
  list: async () => paged(SUPERVISORS),
  create: async (input: unknown) => ok({ ...SUPERVISORS[0]!, id: `sup-new-${Date.now()}`, ...(input as object) } as Supervisor),
  update: async (id: string, patch: unknown) => ok({ ...SUPERVISORS.find(s => s.id === id)!, ...(patch as object) } as Supervisor),
  archive: async (id: string) => ok({ ...SUPERVISORS.find(s => s.id === id)!, status: EntityStatus.Inactive, archived_at: NOW } as Supervisor),
};

const mockJobs = {
  findById: async (id: string) => ok(JOBS.find(j => j.id === id) ?? null),
  list: async () => paged(JOBS),
  create: async (input: unknown) => ok({ ...JOBS[0]!, id: `job-new-${Date.now()}`, ...(input as object) } as Job),
  advanceOperationalStatus: async (id: string, toStatus: OperationalStatus) =>
    ok({ ...JOBS.find(j => j.id === id)!, operational_status: toStatus } as Job),
  advanceAccountingStatus: async (id: string, toStatus: AccountingStatus) =>
    ok({ ...JOBS.find(j => j.id === id)!, accounting_status: toStatus } as Job),
};

const mockFinancialEvents = {
  listByJob: async (jobId: string) => paged(FINANCIAL_EVENTS.filter(e => e.job_id === jobId)),
  append: async (jobId: string, eventType: FinancialEventType, amount: number, _key: string, description?: string) =>
    ok({
      id: `evt-new-${Date.now()}`, organization_id: ORG, created_at: new Date().toISOString(),
      event_type: eventType, job_id: jobId, amount, description: description ?? null,
      idempotency_key: _key, correlation_id: 'demo-session', metadata: null,
    } as FinancialEvent),
};

const mockFlexFieldDefinitions = {
  list: async () => ok([] as ReturnType<typeof Array>[]),
  upsert: async () => ok(null as unknown),
};

const mockSystemSettings = {
  get: async () => ok(null),
  upsert: async () => ok(undefined as void),
};

const mockDashboard = {
  getStats: async (): Promise<RpcResponse<DashboardStats>> => ok({
    jobs_by_operational_status:  { Draft: 1, Waiting_Match: 1, Partial_Match: 1, Matched: 2 },
    jobs_by_accounting_status:   { Pending_Approval: 3, Approved: 1, Paid: 1 },
    active_factories:            2,
    active_supervisors:          3,
    total_jobs:                  5,
    total_factory_charges:       66720,
    total_supervisor_payouts:    55600,
  }),
};

// ─── Export ───────────────────────────────────────────────────────────────────

export function createMockRepositories(): Repositories {
  return {
    factories:            mockFactories,
    supervisors:          mockSupervisors,
    jobs:                 mockJobs,
    financialEvents:      mockFinancialEvents,
    flexFieldDefinitions: mockFlexFieldDefinitions,
    systemSettings:       mockSystemSettings,
    dashboard:            mockDashboard,
  } as unknown as Repositories;
}
