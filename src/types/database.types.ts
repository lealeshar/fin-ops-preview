// Manually typed for Phase D — regenerate with `npm run supabase:types` once
// migrations are applied to a running Supabase instance.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ─── Enums ────────────────────────────────────────────────────────────────────

export type PaymentTermsEnum =
  | 'Immediate' | 'Current' | 'Current+30' | 'Current+60'
  | 'Current+90' | 'Current+120' | 'Custom';

export type PaymentMethodEnum = 'Bank_Transfer' | 'Check' | 'Credit_Card' | 'Other';
export type PaymentTypeEnum   = 'MASAV' | 'Salary_Slip' | 'Other';
export type EntityStatusEnum  = 'Active' | 'Inactive';

export type OperationalStatusEnum =
  'Draft' | 'Waiting_Match' | 'Partial_Match' | 'Matched' | 'Cancelled';

export type AccountingStatusEnum =
  'Pending_Approval' | 'Approved' | 'Queued_For_MASAV' | 'Paid' | 'Closed';

export type FinancialEventTypeEnum =
  'Charge' | 'Credit' | 'Bounce_Check' | 'Adjustment' | 'Debt_Close' | 'MASAV' | 'Offset';

export type FlexFieldTypeEnum       = 'string' | 'date' | 'numeric' | 'enum';
export type FlexFieldEntityTypeEnum = 'factory' | 'supervisor';
export type AuditOperationEnum      = 'INSERT' | 'UPDATE' | 'DELETE';

// ─── Table Row types ──────────────────────────────────────────────────────────

export interface FactoryRow {
  id:                   string;
  organization_id:      string;
  created_at:           string;
  updated_at:           string;
  version_number:       number;
  name:                 string;
  tax_id:               string;
  address:              string | null;
  contact_name:         string | null;
  phone:                string | null;
  email:                string | null;
  external_customer_id: string | null;
  payment_terms:        PaymentTermsEnum;
  payment_method:       PaymentMethodEnum;
  status:               EntityStatusEnum;
  flex_data:            Json | null;
  is_deleted:           boolean;
  archived_at:          string | null;
  inactive_reason:      string | null;
}

export interface SupervisorRow {
  id:                   string;
  organization_id:      string;
  created_at:           string;
  updated_at:           string;
  version_number:       number;
  name:                 string;
  national_id:          string;
  phone:                string | null;
  email:                string | null;
  address:              string | null;
  payment_type:         PaymentTypeEnum;
  monthly_salary_cost:  number;
  bank_code:            string | null;
  bank_branch:          string | null;
  bank_account:         string | null;
  bank_account_type:    string | null;
  status:               EntityStatusEnum;
  flex_data:            Json | null;
  is_deleted:           boolean;
  archived_at:          string | null;
  inactive_reason:      string | null;
}

export interface JobRow {
  id:                       string;
  organization_id:          string;
  created_at:               string;
  updated_at:               string;
  version_number:           number;
  job_code:                 string;
  factory_id:               string;
  supervisor_id:            string;
  billing_month:            number;
  billing_year:             number;
  factory_charge_amount:    number;
  supervisor_payout_amount: number;
  operational_status:       OperationalStatusEnum;
  accounting_status:        AccountingStatusEnum;
}

export interface FinancialEventRow {
  id:              string;
  organization_id: string;
  created_at:      string;
  event_type:      FinancialEventTypeEnum;
  job_id:          string;
  amount:          number;
  description:     string | null;
  idempotency_key: string;
  correlation_id:  string;
  metadata:        Json | null;
}

export interface FlexFieldDefinitionRow {
  id:              string;
  organization_id: string;
  created_at:      string;
  updated_at:      string;
  version_number:  number;
  entity_type:     FlexFieldEntityTypeEnum;
  field_key:       string;
  label:           string;
  field_type:      FlexFieldTypeEnum;
  display_order:   number;
  is_required:     boolean;
  enum_options:    string[] | null;
}

export interface SystemSettingRow {
  key:             string;
  organization_id: string;
  value:           Json;
  description:     string | null;
  updated_at:      string;
  updated_by:      string;
}

// ─── RPC Function Signatures ──────────────────────────────────────────────────

type PaginatedResult = { items: Json[]; total_count: number };

interface DbFunctions {
  // ── Writes ──
  rpc_provision_organization: {
    Args:    { p_organization_id: string };
    Returns: undefined;
  };
  rpc_create_factory: {
    Args: {
      p_organization_id:      string;
      p_idempotency_key:      string;
      p_correlation_id:       string;
      p_actor_id:             string;
      p_name:                 string;
      p_tax_id:               string;
      p_payment_terms:        PaymentTermsEnum;
      p_payment_method:       PaymentMethodEnum;
      p_address?:             string | null;
      p_contact_name?:        string | null;
      p_phone?:               string | null;
      p_email?:               string | null;
      p_external_customer_id?: string | null;
      p_flex_data?:           Json | null;
    };
    Returns: Json;
  };
  rpc_update_factory: {
    Args: {
      p_organization_id:  string;
      p_idempotency_key:  string;
      p_correlation_id:   string;
      p_actor_id:         string;
      p_factory_id:       string;
      p_expected_version: number;
      p_patch:            Json;
    };
    Returns: Json;
  };
  rpc_archive_factory: {
    Args: {
      p_organization_id:  string;
      p_idempotency_key:  string;
      p_correlation_id:   string;
      p_actor_id:         string;
      p_factory_id:       string;
      p_expected_version: number;
      p_inactive_reason?: string | null;
    };
    Returns: Json;
  };
  rpc_create_supervisor: {
    Args: {
      p_organization_id:     string;
      p_idempotency_key:     string;
      p_correlation_id:      string;
      p_actor_id:            string;
      p_name:                string;
      p_national_id:         string;
      p_payment_type:        PaymentTypeEnum;
      p_monthly_salary_cost: number;
      p_phone?:              string | null;
      p_email?:              string | null;
      p_address?:            string | null;
      p_bank_code?:          string | null;
      p_bank_branch?:        string | null;
      p_bank_account?:       string | null;
      p_bank_account_type?:  string | null;
      p_flex_data?:          Json | null;
    };
    Returns: Json;
  };
  rpc_update_supervisor: {
    Args: {
      p_organization_id:  string;
      p_idempotency_key:  string;
      p_correlation_id:   string;
      p_actor_id:         string;
      p_supervisor_id:    string;
      p_expected_version: number;
      p_patch:            Json;
    };
    Returns: Json;
  };
  rpc_archive_supervisor: {
    Args: {
      p_organization_id:  string;
      p_idempotency_key:  string;
      p_correlation_id:   string;
      p_actor_id:         string;
      p_supervisor_id:    string;
      p_expected_version: number;
      p_inactive_reason?: string | null;
    };
    Returns: Json;
  };
  rpc_create_job: {
    Args: {
      p_organization_id:          string;
      p_idempotency_key:          string;
      p_correlation_id:           string;
      p_actor_id:                 string;
      p_factory_id:               string;
      p_supervisor_id:            string;
      p_billing_month:            number;
      p_billing_year:             number;
      p_factory_charge_amount:    number;
      p_supervisor_payout_amount: number;
    };
    Returns: Json;
  };
  rpc_advance_operational_status: {
    Args: {
      p_organization_id:  string;
      p_idempotency_key:  string;
      p_correlation_id:   string;
      p_actor_id:         string;
      p_job_id:           string;
      p_expected_version: number;
      p_to_status:        OperationalStatusEnum;
    };
    Returns: Json;
  };
  rpc_advance_accounting_status: {
    Args: {
      p_organization_id:  string;
      p_idempotency_key:  string;
      p_correlation_id:   string;
      p_actor_id:         string;
      p_job_id:           string;
      p_expected_version: number;
      p_to_status:        AccountingStatusEnum;
    };
    Returns: Json;
  };
  rpc_append_financial_event: {
    Args: {
      p_organization_id: string;
      p_idempotency_key: string;
      p_correlation_id:  string;
      p_actor_id:        string;
      p_job_id:          string;
      p_event_type:      FinancialEventTypeEnum;
      p_amount:          number;
      p_description?:    string | null;
      p_metadata?:       Json | null;
    };
    Returns: Json;
  };
  rpc_upsert_flex_field_definition: {
    Args: {
      p_organization_id: string;
      p_idempotency_key: string;
      p_correlation_id:  string;
      p_actor_id:        string;
      p_entity_type:     FlexFieldEntityTypeEnum;
      p_field_key:       string;
      p_label:           string;
      p_field_type:      FlexFieldTypeEnum;
      p_display_order?:  number;
      p_is_required?:    boolean;
      p_enum_options?:   string[] | null;
    };
    Returns: Json;
  };
  rpc_upsert_system_setting: {
    Args: {
      p_organization_id: string;
      p_actor_id:        string;
      p_key:             string;
      p_value:           Json;
      p_description?:    string | null;
    };
    Returns: undefined;
  };
  // ── Reads ──
  rpc_get_factory_by_id: {
    Args:    { p_organization_id: string; p_factory_id: string };
    Returns: Json | null;
  };
  rpc_list_factories: {
    Args: {
      p_organization_id: string;
      p_status?:  EntityStatusEnum | null;
      p_search?:  string | null;
      p_limit?:   number;
      p_offset?:  number;
    };
    Returns: PaginatedResult;
  };
  rpc_get_supervisor_by_id: {
    Args:    { p_organization_id: string; p_supervisor_id: string };
    Returns: Json | null;
  };
  rpc_list_supervisors: {
    Args: {
      p_organization_id: string;
      p_status?:  EntityStatusEnum | null;
      p_search?:  string | null;
      p_limit?:   number;
      p_offset?:  number;
    };
    Returns: PaginatedResult;
  };
  rpc_get_job_by_id: {
    Args:    { p_organization_id: string; p_job_id: string };
    Returns: Json | null;
  };
  rpc_list_jobs: {
    Args: {
      p_organization_id:    string;
      p_operational_status?: OperationalStatusEnum | null;
      p_accounting_status?:  AccountingStatusEnum  | null;
      p_factory_id?:         string | null;
      p_supervisor_id?:      string | null;
      p_billing_month?:      number | null;
      p_billing_year?:       number | null;
      p_limit?:              number;
      p_offset?:             number;
    };
    Returns: PaginatedResult;
  };
  rpc_list_financial_events_by_job: {
    Args: {
      p_organization_id: string;
      p_job_id:          string;
      p_limit?:          number;
      p_offset?:         number;
    };
    Returns: PaginatedResult;
  };
  rpc_list_flex_field_definitions: {
    Args: {
      p_organization_id: string;
      p_entity_type?:    FlexFieldEntityTypeEnum | null;
    };
    Returns: Json[];
  };
  rpc_get_system_setting: {
    Args:    { p_organization_id: string; p_key: string };
    Returns: Json | null;
  };
}

// ─── Database interface (consumed by createClient<Database>) ─────────────────

export interface Database {
  public: {
    Tables: {
      factories:              { Row: FactoryRow;              Insert: Partial<FactoryRow>;              Update: Partial<FactoryRow>              };
      supervisors:            { Row: SupervisorRow;           Insert: Partial<SupervisorRow>;           Update: Partial<SupervisorRow>           };
      jobs:                   { Row: JobRow;                  Insert: Partial<JobRow>;                  Update: Partial<JobRow>                  };
      financial_events:       { Row: FinancialEventRow;       Insert: Partial<FinancialEventRow>;       Update: Partial<FinancialEventRow>       };
      flex_field_definitions: { Row: FlexFieldDefinitionRow;  Insert: Partial<FlexFieldDefinitionRow>;  Update: Partial<FlexFieldDefinitionRow>  };
      system_settings:        { Row: SystemSettingRow;        Insert: Partial<SystemSettingRow>;        Update: Partial<SystemSettingRow>        };
    };
    Views:     Record<string, never>;
    Functions: DbFunctions;
    Enums: {
      payment_terms_enum:          PaymentTermsEnum;
      payment_method_enum:         PaymentMethodEnum;
      payment_type_enum:           PaymentTypeEnum;
      entity_status_enum:          EntityStatusEnum;
      operational_status_enum:     OperationalStatusEnum;
      accounting_status_enum:      AccountingStatusEnum;
      financial_event_type_enum:   FinancialEventTypeEnum;
      flex_field_type_enum:        FlexFieldTypeEnum;
      flex_field_entity_type_enum: FlexFieldEntityTypeEnum;
      audit_operation_enum:        AuditOperationEnum;
    };
    CompositeTypes: Record<string, never>;
  };
  reporting: {
    Tables:         Record<string, never>;
    Views:          Record<string, never>;
    Functions:      Record<string, never>;
    Enums:          Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
