import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { supabase } from '../lib/supabase/client';
import { createRepositories, type Repositories } from '../lib/repositories';
import { createMockRepositories } from '../lib/demo/mock-repositories';
import { generateCorrelationId } from '../utils/idempotency';
import { useAuth } from './auth.context';

const DEMO_MODE = import.meta.env['VITE_DEMO_MODE'] === 'true';

// One correlation ID per browser session — ties all user actions in this session
// together in domain_events and audit_logs.
const SESSION_CORRELATION_ID = generateCorrelationId();

const RepositoryContext = createContext<Repositories | null>(null);

function LiveRepositoryProvider({ children }: { children: ReactNode }) {
  const { user, organizationId } = useAuth();

  const repositories = useMemo((): Repositories | null => {
    if (user === null || organizationId === null) return null;
    return createRepositories(supabase, {
      organizationId,
      actorId:       user.id,
      correlationId: SESSION_CORRELATION_ID,
    });
  }, [user, organizationId]);

  return (
    <RepositoryContext.Provider value={repositories}>
      {children}
    </RepositoryContext.Provider>
  );
}

export function RepositoryProvider({ children }: { children: ReactNode }) {
  if (DEMO_MODE) {
    return (
      <RepositoryContext.Provider value={createMockRepositories()}>
        {children}
      </RepositoryContext.Provider>
    );
  }
  return <LiveRepositoryProvider>{children}</LiveRepositoryProvider>;
}

export function useRepositories(): Repositories {
  const ctx = useContext(RepositoryContext);
  if (ctx === null) {
    throw new Error(
      'useRepositories: no active session. ' +
      'Ensure the component is rendered inside RepositoryProvider with an authenticated user.',
    );
  }
  return ctx;
}
