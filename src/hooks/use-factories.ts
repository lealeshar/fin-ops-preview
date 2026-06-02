import { useCallback, useEffect, useState } from 'react';
import { useRepositories } from '../contexts/repository.context';
import type {
  Factory,
  CreateFactoryInput,
  UpdateFactoryInput,
  PaginatedResult,
} from '../types/domain.types';
import type { AsyncState } from '../types/async.types';
import type { ListFactoriesParams } from '../lib/repositories';
import { generateIdempotencyKey } from '../utils/idempotency';

export function useFactoryList(params: ListFactoriesParams = {}) {
  const repos = useRepositories();
  const [state, setState] = useState<AsyncState<PaginatedResult<Factory>>>({ status: 'idle' });
  const [epoch, setEpoch] = useState(0);

  const { status, search, limit, offset } = params;

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    repos.factories.list({ status, search, limit, offset }).then(result => {
      if (cancelled) return;
      if (result.error !== null) setState({ status: 'error', error: result.error });
      else                        setState({ status: 'success', data: result.data });
    });
    return () => { cancelled = true; };
  // epoch is included so callers can trigger a manual reload via reload().
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repos, status, search, limit, offset, epoch]);

  const reload = useCallback(() => setEpoch(e => e + 1), []);
  return { state, reload };
}

export function useFactoryById(id: string) {
  const repos = useRepositories();
  const [state, setState] = useState<AsyncState<Factory | null>>({ status: 'idle' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    repos.factories.findById(id).then(result => {
      if (cancelled) return;
      if (result.error !== null) setState({ status: 'error', error: result.error });
      else                        setState({ status: 'success', data: result.data });
    });
    return () => { cancelled = true; };
  }, [repos, id]);

  return { state };
}

export function useCreateFactory() {
  const repos = useRepositories();
  const [state, setState] = useState<AsyncState<Factory>>({ status: 'idle' });

  const execute = useCallback(async (input: CreateFactoryInput) => {
    setState({ status: 'loading' });
    const result = await repos.factories.create(
      input,
      generateIdempotencyKey('create_factory'),
    );
    if (result.error !== null) setState({ status: 'error',   error: result.error });
    else                        setState({ status: 'success', data:  result.data  });
    return result;
  }, [repos]);

  const reset = useCallback(() => setState({ status: 'idle' }), []);
  return { state, execute, reset };
}

export function useUpdateFactory() {
  const repos = useRepositories();
  const [state, setState] = useState<AsyncState<Factory>>({ status: 'idle' });

  const execute = useCallback(async (
    id: string,
    patch: UpdateFactoryInput,
    expectedVersion: number,
  ) => {
    setState({ status: 'loading' });
    const result = await repos.factories.update(
      id, patch, expectedVersion,
      generateIdempotencyKey('update_factory'),
    );
    if (result.error !== null) setState({ status: 'error',   error: result.error });
    else                        setState({ status: 'success', data:  result.data  });
    return result;
  }, [repos]);

  const reset = useCallback(() => setState({ status: 'idle' }), []);
  return { state, execute, reset };
}

export function useArchiveFactory() {
  const repos = useRepositories();
  const [state, setState] = useState<AsyncState<Factory>>({ status: 'idle' });

  const execute = useCallback(async (
    id: string,
    expectedVersion: number,
    inactiveReason?: string,
  ) => {
    setState({ status: 'loading' });
    const result = await repos.factories.archive(
      id, expectedVersion,
      generateIdempotencyKey('archive_factory'),
      inactiveReason,
    );
    if (result.error !== null) setState({ status: 'error',   error: result.error });
    else                        setState({ status: 'success', data:  result.data  });
    return result;
  }, [repos]);

  const reset = useCallback(() => setState({ status: 'idle' }), []);
  return { state, execute, reset };
}
