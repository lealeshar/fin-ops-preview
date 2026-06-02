import { useCallback, useEffect, useState } from 'react';
import { useRepositories } from '../contexts/repository.context';
import type { FinancialEvent, PaginatedResult } from '../types/domain.types';
import type { AsyncState } from '../types/async.types';
import type { FinancialEventType } from '../types/enums';
import { generateIdempotencyKey } from '../utils/idempotency';

export function useFinancialEventsByJob(
  jobId: string,
  params: { limit?: number; offset?: number } = {},
) {
  const repos = useRepositories();
  const [state, setState] = useState<AsyncState<PaginatedResult<FinancialEvent>>>({ status: 'idle' });
  const [epoch, setEpoch] = useState(0);

  const { limit, offset } = params;

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    repos.financialEvents.listByJob(jobId, { limit, offset }).then(result => {
      if (cancelled) return;
      if (result.error !== null) setState({ status: 'error', error: result.error });
      else                        setState({ status: 'success', data: result.data });
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repos, jobId, limit, offset, epoch]);

  const reload = useCallback(() => setEpoch(e => e + 1), []);
  return { state, reload };
}

export function useAppendFinancialEvent() {
  const repos = useRepositories();
  const [state, setState] = useState<AsyncState<FinancialEvent>>({ status: 'idle' });

  const execute = useCallback(async (
    jobId: string,
    eventType: FinancialEventType,
    amount: number,
    description?: string,
    metadata?: Record<string, unknown>,
  ) => {
    setState({ status: 'loading' });
    const result = await repos.financialEvents.append(
      jobId, eventType, amount,
      generateIdempotencyKey('financial_event'),
      description,
      metadata,
    );
    if (result.error !== null) setState({ status: 'error',   error: result.error });
    else                        setState({ status: 'success', data:  result.data  });
    return result;
  }, [repos]);

  const reset = useCallback(() => setState({ status: 'idle' }), []);
  return { state, execute, reset };
}
