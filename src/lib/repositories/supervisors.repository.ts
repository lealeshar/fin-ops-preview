import { BaseRepository } from './base.repository';
import type {
  Supervisor,
  CreateSupervisorInput,
  UpdateSupervisorInput,
  PaginatedResult,
  PaginationParams,
  RpcResponse,
} from '../../types/domain.types';
import type { EntityStatus } from '../../types/enums';

export interface ListSupervisorsParams extends PaginationParams {
  readonly status?: EntityStatus | undefined;
  readonly search?: string | undefined;
}

export class SupervisorsRepository extends BaseRepository {
  async findById(id: string): Promise<RpcResponse<Supervisor | null>> {
    return this.callReadRpc<Supervisor | null>('rpc_get_supervisor_by_id', {
      p_supervisor_id: id,
    });
  }

  async list(
    params: ListSupervisorsParams = {},
  ): Promise<RpcResponse<PaginatedResult<Supervisor>>> {
    return this.callReadRpc<PaginatedResult<Supervisor>>('rpc_list_supervisors', {
      p_status:  params.status  ?? null,
      p_search:  params.search  ?? null,
      p_limit:   params.limit   ?? 50,
      p_offset:  params.offset  ?? 0,
    });
  }

  async create(
    input: CreateSupervisorInput,
    idempotencyKey: string,
  ): Promise<RpcResponse<Supervisor>> {
    return this.callRpc<Supervisor>('rpc_create_supervisor', {
      p_idempotency_key:      idempotencyKey,
      p_name:                 input.name,
      p_national_id:          input.national_id,
      p_payment_type:         input.payment_type,
      p_monthly_salary_cost:  input.monthly_salary_cost,
      p_phone:                input.phone              ?? null,
      p_email:                input.email              ?? null,
      p_address:              input.address            ?? null,
      p_bank_code:            input.bank_code          ?? null,
      p_bank_branch:          input.bank_branch        ?? null,
      p_bank_account:         input.bank_account       ?? null,
      p_bank_account_type:    input.bank_account_type  ?? null,
      p_flex_data:            input.flex_data          ?? null,
    });
  }

  async update(
    id: string,
    patch: UpdateSupervisorInput,
    expectedVersion: number,
    idempotencyKey: string,
  ): Promise<RpcResponse<Supervisor>> {
    return this.callRpc<Supervisor>('rpc_update_supervisor', {
      p_supervisor_id:    id,
      p_expected_version: expectedVersion,
      p_idempotency_key:  idempotencyKey,
      p_patch:            patch,
    });
  }

  async archive(
    id: string,
    expectedVersion: number,
    idempotencyKey: string,
    inactiveReason?: string,
  ): Promise<RpcResponse<Supervisor>> {
    return this.callRpc<Supervisor>('rpc_archive_supervisor', {
      p_supervisor_id:    id,
      p_expected_version: expectedVersion,
      p_idempotency_key:  idempotencyKey,
      p_inactive_reason:  inactiveReason ?? null,
    });
  }
}
