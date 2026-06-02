import { useCallback, useEffect, useState } from 'react';
import { useRepositories } from '../contexts/repository.context';
import type { FlexFieldDefinition } from '../types/domain.types';
import type { AsyncState } from '../types/async.types';
import type { FlexFieldEntityType } from '../types/enums';
import type { UpsertFlexFieldDefinitionInput } from '../lib/repositories';
import { generateIdempotencyKey } from '../utils/idempotency';

export function useFlexFieldDefinitionsList(entityType?: FlexFieldEntityType) {
  const repos = useRepositories();
  const [state, setState] = useState<AsyncState<FlexFieldDefinition[]>>({ status: 'idle' });
  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    repos.flexFieldDefinitions.list(entityType).then(result => {
      if (cancelled) return;
      if (result.error !== null) setState({ status: 'error', error: result.error });
      else                        setState({ status: 'success', data: result.data });
    });
    return () => { cancelled = true; };
  }, [repos, entityType, epoch]);

  const reload = useCallback(() => setEpoch(e => e + 1), []);
  return { state, reload };
}

export function useUpsertFlexFieldDefinition() {
  const repos = useRepositories();
  const [state, setState] = useState<AsyncState<FlexFieldDefinition>>({ status: 'idle' });

  const execute = useCallback(async (input: UpsertFlexFieldDefinitionInput) => {
    setState({ status: 'loading' });
    const result = await repos.flexFieldDefinitions.upsert(
      input,
      generateIdempotencyKey('upsert_flex_field'),
    );
    if (result.error !== null) setState({ status: 'error',   error: result.error });
    else                        setState({ status: 'success', data:  result.data  });
    return result;
  }, [repos]);

  const reset = useCallback(() => setState({ status: 'idle' }), []);
  return { state, execute, reset };
}
