import { useCallback, useEffect, useState } from 'react';
import { useRepositories } from '../contexts/repository.context';
import type { DashboardStats } from '../types/domain.types';
import type { AsyncState } from '../types/async.types';

export function useDashboardStats() {
  const repos = useRepositories();
  const [state, setState] = useState<AsyncState<DashboardStats>>({ status: 'idle' });
  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    repos.dashboard.getStats().then(result => {
      if (cancelled) return;
      if (result.error !== null) setState({ status: 'error', error: result.error });
      else                        setState({ status: 'success', data: result.data });
    });
    return () => { cancelled = true; };
  }, [repos, epoch]);

  const reload = useCallback(() => setEpoch(e => e + 1), []);
  return { state, reload };
}
