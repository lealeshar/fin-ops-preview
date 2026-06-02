import { BaseRepository } from './base.repository';
import type { DashboardStats, RpcResponse } from '../../types/domain.types';

export class DashboardRepository extends BaseRepository {
  async getStats(): Promise<RpcResponse<DashboardStats>> {
    return this.callReadRpc<DashboardStats>('rpc_dashboard_stats');
  }
}
