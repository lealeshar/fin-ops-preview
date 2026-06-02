import { useCallback, useEffect, useState } from 'react';
import { useRepositories } from '../contexts/repository.context';
import type { SystemSetting, RpcResponse } from '../types/domain.types';
import type { AsyncState } from '../types/async.types';

export function useSystemSettingsList() {
  const repos = useRepositories();
  const [state, setState] = useState<AsyncState<readonly SystemSetting[]>>({ status: 'idle' });
  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    repos.systemSettings.list().then(result => {
      if (cancelled) return;
      if (result.error !== null) setState({ status: 'error', error: result.error });
      else                        setState({ status: 'success', data: result.data });
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repos, epoch]);

  const reload = useCallback(() => setEpoch(e => e + 1), []);
  return { state, reload };
}

export function useUpsertSystemSetting() {
  const repos = useRepositories();
  const [state, setState] = useState<AsyncState<undefined>>({ status: 'idle' });

  const execute = useCallback(async (
    key: string,
    value: unknown,
    description?: string | null,
  ): Promise<RpcResponse<void>> => {
    setState({ status: 'loading' });
    const result = await repos.systemSettings.upsert(
      key,
      value,
      description ?? undefined,
    );
    if (result.error !== null) setState({ status: 'error',   error: result.error });
    else                        setState({ status: 'success', data: undefined });
    return result;
  }, [repos]);

  const reset = useCallback(() => setState({ status: 'idle' }), []);
  return { state, execute, reset };
}
