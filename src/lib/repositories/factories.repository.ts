import { BaseRepository } from './base.repository';
import type {
  Factory,
  CreateFactoryInput,
  UpdateFactoryInput,
  PaginatedResult,
  PaginationParams,
  RpcResponse,
} from '../../types/domain.types';
import type { EntityStatus } from '../../types/enums';

export interface ListFactoriesParams extends PaginationParams {
  readonly status?: EntityStatus | undefined;
  readonly search?: string | undefined;
}

export class FactoriesRepository extends BaseRepository {
  async findById(id: string): Promise<RpcResponse<Factory | null>> {
    return this.callReadRpc<Factory | null>('rpc_get_factory_by_id', {
      p_factory_id: id,
    });
  }

  async list(
    params: ListFactoriesParams = {},
  ): Promise<RpcResponse<PaginatedResult<Factory>>> {
    return this.callReadRpc<PaginatedResult<Factory>>('rpc_list_factories', {
      p_status:  params.status  ?? null,
      p_search:  params.search  ?? null,
      p_limit:   params.limit   ?? 50,
      p_offset:  params.offset  ?? 0,
    });
  }

  async create(
    input: CreateFactoryInput,
    idempotencyKey: string,
  ): Promise<RpcResponse<Factory>> {
    return this.callRpc<Factory>('rpc_create_factory', {
      p_idempotency_key:       idempotencyKey,
      p_name:                  input.name,
      p_tax_id:                input.tax_id,
      p_payment_terms:         input.payment_terms,
      p_payment_method:        input.payment_method,
      p_address:               input.address               ?? null,
      p_contact_name:          input.contact_name          ?? null,
      p_phone:                 input.phone                 ?? null,
      p_email:                 input.email                 ?? null,
      p_external_customer_id:  input.external_customer_id  ?? null,
      p_flex_data:             input.flex_data             ?? null,
    });
  }

  async update(
    id: string,
    patch: UpdateFactoryInput,
    expectedVersion: number,
    idempotencyKey: string,
  ): Promise<RpcResponse<Factory>> {
    return this.callRpc<Factory>('rpc_update_factory', {
      p_factory_id:       id,
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
  ): Promise<RpcResponse<Factory>> {
    return this.callRpc<Factory>('rpc_archive_factory', {
      p_factory_id:       id,
      p_expected_version: expectedVersion,
      p_idempotency_key:  idempotencyKey,
      p_inactive_reason:  inactiveReason ?? null,
    });
  }
}
