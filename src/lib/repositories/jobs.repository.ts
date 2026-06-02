import { BaseRepository } from './base.repository';
import type {
  Job,
  CreateJobInput,
  PaginatedResult,
  PaginationParams,
  RpcResponse,
} from '../../types/domain.types';
import type { AccountingStatus, OperationalStatus } from '../../types/enums';

export interface ListJobsParams extends PaginationParams {
  readonly operationalStatus?: OperationalStatus | undefined;
  readonly accountingStatus?:  AccountingStatus | undefined;
  readonly billingMonth?:      number | undefined;
  readonly billingYear?:       number | undefined;
  readonly factoryId?:         string | undefined;
  readonly supervisorId?:      string | undefined;
}

export class JobsRepository extends BaseRepository {
  async findById(id: string): Promise<RpcResponse<Job | null>> {
    return this.callReadRpc<Job | null>('rpc_get_job_by_id', {
      p_job_id: id,
    });
  }

  async list(
    params: ListJobsParams = {},
  ): Promise<RpcResponse<PaginatedResult<Job>>> {
    return this.callReadRpc<PaginatedResult<Job>>('rpc_list_jobs', {
      p_operational_status: params.operationalStatus ?? null,
      p_accounting_status:  params.accountingStatus  ?? null,
      p_factory_id:         params.factoryId         ?? null,
      p_supervisor_id:      params.supervisorId      ?? null,
      p_billing_month:      params.billingMonth      ?? null,
      p_billing_year:       params.billingYear       ?? null,
      p_limit:              params.limit             ?? 50,
      p_offset:             params.offset            ?? 0,
    });
  }

  async create(
    input: CreateJobInput,
    idempotencyKey: string,
  ): Promise<RpcResponse<Job>> {
    return this.callRpc<Job>('rpc_create_job', {
      p_idempotency_key:          idempotencyKey,
      p_factory_id:               input.factory_id,
      p_supervisor_id:            input.supervisor_id,
      p_billing_month:            input.billing_month,
      p_billing_year:             input.billing_year,
      p_factory_charge_amount:    input.factory_charge_amount,
      p_supervisor_payout_amount: input.supervisor_payout_amount,
    });
  }

  // The DB trigger validates the transition — the repository just routes the call.
  async advanceOperationalStatus(
    id: string,
    toStatus: OperationalStatus,
    expectedVersion: number,
    idempotencyKey: string,
  ): Promise<RpcResponse<Job>> {
    return this.callRpc<Job>('rpc_advance_operational_status', {
      p_job_id:           id,
      p_to_status:        toStatus,
      p_expected_version: expectedVersion,
      p_idempotency_key:  idempotencyKey,
    });
  }

  async advanceAccountingStatus(
    id: string,
    toStatus: AccountingStatus,
    expectedVersion: number,
    idempotencyKey: string,
  ): Promise<RpcResponse<Job>> {
    return this.callRpc<Job>('rpc_advance_accounting_status', {
      p_job_id:           id,
      p_to_status:        toStatus,
      p_expected_version: expectedVersion,
      p_idempotency_key:  idempotencyKey,
    });
  }
}
