import { useCallback, useEffect, useState } from 'react';
import { useRepositories } from '../contexts/repository.context';
import type { Job, CreateJobInput, PaginatedResult } from '../types/domain.types';
import type { AsyncState } from '../types/async.types';
import type { ListJobsParams } from '../lib/repositories';
import type { AccountingStatus, OperationalStatus } from '../types/enums';
import { generateIdempotencyKey } from '../utils/idempotency';

export function useJobList(params: ListJobsParams = {}) {
  const repos = useRepositories();
  const [state, setState] = useState<AsyncState<PaginatedResult<Job>>>({ status: 'idle' });
  const [epoch, setEpoch] = useState(0);

  const {
    operationalStatus, accountingStatus,
    factoryId, supervisorId,
    billingMonth, billingYear,
    limit, offset,
  } = params;

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    repos.jobs.list({
      operationalStatus, accountingStatus,
      factoryId, supervisorId,
      billingMonth, billingYear,
      limit, offset,
    }).then(result => {
      if (cancelled) return;
      if (result.error !== null) setState({ status: 'error', error: result.error });
      else                        setState({ status: 'success', data: result.data });
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    repos,
    operationalStatus, accountingStatus,
    factoryId, supervisorId,
    billingMonth, billingYear,
    limit, offset,
    epoch,
  ]);

  const reload = useCallback(() => setEpoch(e => e + 1), []);
  return { state, reload };
}

export function useJobById(id: string) {
  const repos = useRepositories();
  const [state, setState] = useState<AsyncState<Job | null>>({ status: 'idle' });
  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    repos.jobs.findById(id).then(result => {
      if (cancelled) return;
      if (result.error !== null) setState({ status: 'error', error: result.error });
      else                        setState({ status: 'success', data: result.data });
    });
    return () => { cancelled = true; };
  }, [repos, id, epoch]);

  const reload = useCallback(() => setEpoch(e => e + 1), []);
  return { state, reload };
}

export function useCreateJob() {
  const repos = useRepositories();
  const [state, setState] = useState<AsyncState<Job>>({ status: 'idle' });

  const execute = useCallback(async (input: CreateJobInput) => {
    setState({ status: 'loading' });
    const result = await repos.jobs.create(
      input,
      generateIdempotencyKey('create_job'),
    );
    if (result.error !== null) setState({ status: 'error',   error: result.error });
    else                        setState({ status: 'success', data:  result.data  });
    return result;
  }, [repos]);

  const reset = useCallback(() => setState({ status: 'idle' }), []);
  return { state, execute, reset };
}

export function useAdvanceOperationalStatus() {
  const repos = useRepositories();
  const [state, setState] = useState<AsyncState<Job>>({ status: 'idle' });

  const execute = useCallback(async (
    id: string,
    toStatus: OperationalStatus,
    expectedVersion: number,
  ) => {
    setState({ status: 'loading' });
    const result = await repos.jobs.advanceOperationalStatus(
      id, toStatus, expectedVersion,
      generateIdempotencyKey('advance_op_status'),
    );
    if (result.error !== null) setState({ status: 'error',   error: result.error });
    else                        setState({ status: 'success', data:  result.data  });
    return result;
  }, [repos]);

  const reset = useCallback(() => setState({ status: 'idle' }), []);
  return { state, execute, reset };
}

export function useAdvanceAccountingStatus() {
  const repos = useRepositories();
  const [state, setState] = useState<AsyncState<Job>>({ status: 'idle' });

  const execute = useCallback(async (
    id: string,
    toStatus: AccountingStatus,
    expectedVersion: number,
  ) => {
    setState({ status: 'loading' });
    const result = await repos.jobs.advanceAccountingStatus(
      id, toStatus, expectedVersion,
      generateIdempotencyKey('advance_acc_status'),
    );
    if (result.error !== null) setState({ status: 'error',   error: result.error });
    else                        setState({ status: 'success', data:  result.data  });
    return result;
  }, [repos]);

  const reset = useCallback(() => setState({ status: 'idle' }), []);
  return { state, execute, reset };
}
