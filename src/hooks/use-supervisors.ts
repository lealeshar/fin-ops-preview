import { useCallback, useEffect, useState } from 'react';
import { useRepositories } from '../contexts/repository.context';
import type {
  Supervisor,
  CreateSupervisorInput,
  UpdateSupervisorInput,
  PaginatedResult,
} from '../types/domain.types';
import type { AsyncState } from '../types/async.types';
import type { ListSupervisorsParams } from '../lib/repositories';
import { generateIdempotencyKey } from '../utils/idempotency';

export function useSupervisorList(params: ListSupervisorsParams = {}) {
  const repos = useRepositories();
  const [state, setState] = useState<AsyncState<PaginatedResult<Supervisor>>>({ status: 'idle' });
  const [epoch, setEpoch] = useState(0);

  const { status, search, limit, offset } = params;

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    repos.supervisors.list({ status, search, limit, offset }).then(result => {
      if (cancelled) return;
      if (result.error !== null) setState({ status: 'error', error: result.error });
      else                        setState({ status: 'success', data: result.data });
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repos, status, search, limit, offset, epoch]);

  const reload = useCallback(() => setEpoch(e => e + 1), []);
  return { state, reload };
}

export function useSupervisorById(id: string) {
  const repos = useRepositories();
  const [state, setState] = useState<AsyncState<Supervisor | null>>({ status: 'idle' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    repos.supervisors.findById(id).then(result => {
      if (cancelled) return;
      if (result.error !== null) setState({ status: 'error', error: result.error });
      else                        setState({ status: 'success', data: result.data });
    });
    return () => { cancelled = true; };
  }, [repos, id]);

  return { state };
}

export function useCreateSupervisor() {
  const repos = useRepositories();
  const [state, setState] = useState<AsyncState<Supervisor>>({ status: 'idle' });

  const execute = useCallback(async (input: CreateSupervisorInput) => {
    setState({ status: 'loading' });
    const result = await repos.supervisors.create(
      input,
      generateIdempotencyKey('create_supervisor'),
    );
    if (result.error !== null) setState({ status: 'error',   error: result.error });
    else                        setState({ status: 'success', data:  result.data  });
    return result;
  }, [repos]);

  const reset = useCallback(() => setState({ status: 'idle' }), []);
  return { state, execute, reset };
}

export function useUpdateSupervisor() {
  const repos = useRepositories();
  const [state, setState] = useState<AsyncState<Supervisor>>({ status: 'idle' });

  const execute = useCallback(async (
    id: string,
    patch: UpdateSupervisorInput,
    expectedVersion: number,
  ) => {
    setState({ status: 'loading' });
    const result = await repos.supervisors.update(
      id, patch, expectedVersion,
      generateIdempotencyKey('update_supervisor'),
    );
    if (result.error !== null) setState({ status: 'error',   error: result.error });
    else                        setState({ status: 'success', data:  result.data  });
    return result;
  }, [repos]);

  const reset = useCallback(() => setState({ status: 'idle' }), []);
  return { state, execute, reset };
}

export function useArchiveSupervisor() {
  const repos = useRepositories();
  const [state, setState] = useState<AsyncState<Supervisor>>({ status: 'idle' });

  const execute = useCallback(async (
    id: string,
    expectedVersion: number,
    inactiveReason?: string,
  ) => {
    setState({ status: 'loading' });
    const result = await repos.supervisors.archive(
      id, expectedVersion,
      generateIdempotencyKey('archive_supervisor'),
      inactiveReason,
    );
    if (result.error !== null) setState({ status: 'error',   error: result.error });
    else                        setState({ status: 'success', data:  result.data  });
    return result;
  }, [repos]);

  const reset = useCallback(() => setState({ status: 'idle' }), []);
  return { state, execute, reset };
}
