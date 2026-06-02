import type {
  AccountingStatus,
  EntityStatus,
  FinancialEventType,
  FlexFieldEntityType,
  FlexFieldType,
  OperationalStatus,
  PaymentMethod,
  PaymentTerms,
  PaymentType,
} from './enums';

// ─── Base ─────────────────────────────────────────────────────────────────────

export interface BaseEntity {
  readonly id: string;
  readonly organization_id: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly version_number: number;
}

export interface SoftDeletable {
  readonly is_deleted: boolean;
  readonly archived_at: string | null;
  readonly inactive_reason: string | null;
}

// ─── Flex Fields ──────────────────────────────────────────────────────────────

export interface FlexData {
  readonly string_fields?: Readonly<Record<string, string>>;
  readonly date_fields?: Readonly<Record<string, string>>;
  readonly numeric_fields?: Readonly<Record<string, number>>;
  readonly enum_fields?: Readonly<Record<string, readonly string[]>>;
}

export interface FlexFieldDefinition extends BaseEntity {
  readonly entity_type: FlexFieldEntityType;
  readonly field_key: string;
  readonly label: string;
  readonly field_type: FlexFieldType;
  readonly display_order: number;
  readonly is_required: boolean;
  readonly enum_options: readonly string[] | null;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export interface Factory extends BaseEntity, SoftDeletable {
  readonly name: string;
  readonly tax_id: string;
  readonly address: string | null;
  readonly contact_name: string | null;
  readonly phone: string | null;
  readonly email: string | null;
  readonly external_customer_id: string | null;
  readonly payment_terms: PaymentTerms;
  readonly payment_method: PaymentMethod;
  readonly status: EntityStatus;
  readonly flex_data: FlexData | null;
}

export type CreateFactoryInput = Omit<
  Factory,
  keyof BaseEntity | keyof SoftDeletable
>;

export type UpdateFactoryInput = Partial<CreateFactoryInput>;

// ─── Supervisor ───────────────────────────────────────────────────────────────

export interface Supervisor extends BaseEntity, SoftDeletable {
  readonly name: string;
  readonly national_id: string;
  readonly phone: string | null;
  readonly email: string | null;
  readonly address: string | null;
  readonly payment_type: PaymentType;
  readonly monthly_salary_cost: number;
  readonly bank_code: string | null;
  readonly bank_branch: string | null;
  readonly bank_account: string | null;
  readonly bank_account_type: string | null;
  readonly status: EntityStatus;
  readonly flex_data: FlexData | null;
}

export type CreateSupervisorInput = Omit<
  Supervisor,
  keyof BaseEntity | keyof SoftDeletable
>;

export type UpdateSupervisorInput = Partial<CreateSupervisorInput>;

// ─── Job ──────────────────────────────────────────────────────────────────────

export interface Job extends BaseEntity {
  readonly job_code: string;
  readonly factory_id: string;
  readonly supervisor_id: string;
  readonly billing_month: number;
  readonly billing_year: number;
  readonly factory_charge_amount: number;
  readonly supervisor_payout_amount: number;
  readonly operational_status: OperationalStatus;
  readonly accounting_status: AccountingStatus;
}

export type CreateJobInput = Omit<Job, keyof BaseEntity | 'job_code'>;

// ─── Financial Event Ledger (Append-Only) ─────────────────────────────────────

export interface FinancialEvent {
  readonly id: string;
  readonly organization_id: string;
  readonly created_at: string;
  readonly event_type: FinancialEventType;
  readonly job_id: string;
  readonly amount: number;
  readonly description: string | null;
  readonly idempotency_key: string;
  readonly correlation_id: string;
  readonly metadata: Readonly<Record<string, unknown>> | null;
}

// ─── System Settings & Feature Flags ─────────────────────────────────────────

export interface SystemSetting {
  readonly key: string;
  readonly organization_id: string;
  readonly value: unknown;
  readonly description: string | null;
  readonly updated_at: string;
  readonly updated_by: string;
}

export interface FeatureFlag {
  readonly flag_key: string;
  readonly organization_id: string;
  readonly is_enabled: boolean;
  readonly description: string | null;
}

// ─── Idempotency ──────────────────────────────────────────────────────────────

export interface IdempotencyRecord {
  readonly key: string;
  readonly operation: string;
  readonly organization_id: string;
  readonly created_at: string;
  readonly result_summary: string | null;
}

// ─── RPC Response Envelope ────────────────────────────────────────────────────

export interface RpcSuccess<T> {
  readonly data: T;
  readonly error: null;
}

export interface RpcFailure {
  readonly data: null;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: unknown;
  };
}

export type RpcResponse<T> = RpcSuccess<T> | RpcFailure;

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationParams {
  readonly limit?: number | undefined;
  readonly offset?: number | undefined;
}

export interface PaginatedResult<T> {
  readonly items: readonly T[];
  readonly total_count: number;
}

// ─── Audit ────────────────────────────────────────────────────────────────────

export interface AuditLog {
  readonly id: string;
  readonly organization_id: string;
  readonly created_at: string;
  readonly table_name: string;
  readonly record_id: string;
  readonly operation: 'INSERT' | 'UPDATE' | 'DELETE';
  readonly old_values: Readonly<Record<string, unknown>> | null;
  readonly new_values: Readonly<Record<string, unknown>> | null;
  readonly actor_id: string;
  readonly correlation_id: string;
}
