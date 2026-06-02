import { BaseRepository } from './base.repository';
import type { SystemSetting, RpcResponse } from '../../types/domain.types';

export class SystemSettingsRepository extends BaseRepository {
  async list(): Promise<RpcResponse<readonly SystemSetting[]>> {
    return this.callReadRpc<readonly SystemSetting[]>('rpc_list_system_settings');
  }

  async get(key: string): Promise<RpcResponse<SystemSetting | null>> {
    return this.callReadRpc<SystemSetting | null>('rpc_get_system_setting', {
      p_key: key,
    });
  }

  async upsert(
    key: string,
    value: unknown,
    description?: string,
  ): Promise<RpcResponse<void>> {
    // rpc_upsert_system_setting takes actor_id but not correlation_id or
    // idempotency_key, so callReadRpc is used with p_actor_id passed explicitly.
    return this.callReadRpc<void>('rpc_upsert_system_setting', {
      p_actor_id:    this.ctx.actorId,
      p_key:         key,
      p_value:       value,
      p_description: description ?? null,
    });
  }
}
