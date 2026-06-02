import { BaseRepository } from './base.repository';
import type {
  FinancialEvent,
  PaginatedResult,
  PaginationParams,
  RpcResponse,
} from '../../types/domain.types';
import type { FinancialEventType } from '../../types/enums';

export class FinancialEventsRepository extends BaseRepository {
  async listByJob(
    jobId: string,
    params: PaginationParams = {},
  ): Promise<RpcResponse<PaginatedResult<FinancialEvent>>> {
    return this.callReadRpc<PaginatedResult<FinancialEvent>>(
      'rpc_list_financial_events_by_job',
      {
        p_job_id: jobId,
        p_limit:  params.limit  ?? 100,
        p_offset: params.offset ?? 0,
      },
    );
  }

  async append(
    jobId: string,
    eventType: FinancialEventType,
    amount: number,
    idempotencyKey: string,
    description?: string,
    metadata?: Record<string, unknown>,
  ): Promise<RpcResponse<FinancialEvent>> {
    return this.callRpc<FinancialEvent>('rpc_append_financial_event', {
      p_idempotency_key: idempotencyKey,
      p_job_id:          jobId,
      p_event_type:      eventType,
      p_amount:          amount,
      p_description:     description ?? null,
      p_metadata:        metadata    ?? null,
    });
  }
}
