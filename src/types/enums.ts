// ─── Payment ─────────────────────────────────────────────────────────────────

export const PaymentTerms = {
  Immediate: 'Immediate',
  Current: 'Current',
  Current30: 'Current+30',
  Current60: 'Current+60',
  Current90: 'Current+90',
  Current120: 'Current+120',
  Custom: 'Custom',
} as const;
export type PaymentTerms = (typeof PaymentTerms)[keyof typeof PaymentTerms];

export const PaymentMethod = {
  BankTransfer: 'Bank_Transfer',
  Check: 'Check',
  CreditCard: 'Credit_Card',
  Other: 'Other',
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const PaymentType = {
  MASAV: 'MASAV',
  SalarySlip: 'Salary_Slip',
  Other: 'Other',
} as const;
export type PaymentType = (typeof PaymentType)[keyof typeof PaymentType];

// ─── Entity Status ────────────────────────────────────────────────────────────

export const EntityStatus = {
  Active: 'Active',
  Inactive: 'Inactive',
} as const;
export type EntityStatus = (typeof EntityStatus)[keyof typeof EntityStatus];

// ─── Job State Machine ────────────────────────────────────────────────────────

export const OperationalStatus = {
  Draft: 'Draft',
  WaitingMatch: 'Waiting_Match',
  PartialMatch: 'Partial_Match',
  Matched: 'Matched',
  Cancelled: 'Cancelled',
} as const;
export type OperationalStatus =
  (typeof OperationalStatus)[keyof typeof OperationalStatus];

export const AccountingStatus = {
  PendingApproval: 'Pending_Approval',
  Approved: 'Approved',
  QueuedForMASAV: 'Queued_For_MASAV',
  Paid: 'Paid',
  Closed: 'Closed',
} as const;
export type AccountingStatus =
  (typeof AccountingStatus)[keyof typeof AccountingStatus];

// ─── Financial Ledger ─────────────────────────────────────────────────────────

export const FinancialEventType = {
  Charge: 'Charge',
  Credit: 'Credit',
  BounceCheck: 'Bounce_Check',
  Adjustment: 'Adjustment',
  DebtClose: 'Debt_Close',
  MASAV: 'MASAV',
  Offset: 'Offset',
} as const;
export type FinancialEventType =
  (typeof FinancialEventType)[keyof typeof FinancialEventType];

// ─── Permissions ──────────────────────────────────────────────────────────────

export const UserRole = {
  Admin: 'Admin',
  Finance: 'Finance',
  Ops: 'Ops',
  Viewer: 'Viewer',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

// ─── Flex Fields ──────────────────────────────────────────────────────────────

export const FlexFieldType = {
  String: 'string',
  Date: 'date',
  Numeric: 'numeric',
  Enum: 'enum',
} as const;
export type FlexFieldType = (typeof FlexFieldType)[keyof typeof FlexFieldType];

export const FlexFieldEntityType = {
  Factory: 'factory',
  Supervisor: 'supervisor',
} as const;
export type FlexFieldEntityType =
  (typeof FlexFieldEntityType)[keyof typeof FlexFieldEntityType];

// ─── Immutable Accounting Statuses (records become read-only at these states) ─

export const IMMUTABLE_ACCOUNTING_STATUSES: ReadonlySet<AccountingStatus> =
  new Set([
    AccountingStatus.QueuedForMASAV,
    AccountingStatus.Paid,
    AccountingStatus.Closed,
  ]);

// ─── Terminal Operational Statuses (required before accounting can advance) ───

export const TERMINAL_OPERATIONAL_STATUSES: ReadonlySet<OperationalStatus> =
  new Set([OperationalStatus.Matched]);
