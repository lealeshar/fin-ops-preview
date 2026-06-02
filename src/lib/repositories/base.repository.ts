import type { SupabaseClient } from '../supabase/client';
import type { RpcResponse } from '../../types/domain.types';

export interface RepositoryContext {
  readonly organizationId: string;
  readonly correlationId:  string;
  readonly actorId:        string;
}

export abstract class BaseRepository {
  constructor(
    protected readonly client: SupabaseClient,
    protected readonly ctx: RepositoryContext,
  ) {}

  // For write RPCs — merges organization_id, correlation_id, actor_id from context.
  protected async callRpc<TResult>(
    fn: string,
    params: Record<string, unknown>,
  ): Promise<RpcResponse<TResult>> {
    const { data, error } = await this.client.rpc(fn as never, {
      ...params,
      p_organization_id: this.ctx.organizationId,
      p_correlation_id:  this.ctx.correlationId,
      p_actor_id:        this.ctx.actorId,
    } as never);

    if (error !== null) {
      return {
        data: null,
        error: {
          code:    error.code    ?? 'UNKNOWN_ERROR',
          message: error.message,
          details: error.details ?? undefined,
        },
      };
    }

    return { data: data as TResult, error: null };
  }

  // For read RPCs — only organization_id is injected (no audit context needed).
  protected async callReadRpc<TResult>(
    fn: string,
    params: Record<string, unknown> = {},
  ): Promise<RpcResponse<TResult>> {
    const { data, error } = await this.client.rpc(fn as never, {
      ...params,
      p_organization_id: this.ctx.organizationId,
    } as never);

    if (error !== null) {
      return {
        data: null,
        error: {
          code:    error.code    ?? 'UNKNOWN_ERROR',
          message: error.message,
          details: error.details ?? undefined,
        },
      };
    }

    return { data: data as TResult, error: null };
  }

  protected assertOrgMatch(recordOrgId: string): void {
    if (recordOrgId !== this.ctx.organizationId) {
      throw new Error(
        `[Security] Cross-tenant access denied. ` +
        `Record org=${recordOrgId}, context org=${this.ctx.organizationId}`,
      );
    }
  }
}
