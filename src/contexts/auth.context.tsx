import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase/client';

interface AuthState {
  readonly session:        Session | null;
  readonly user:           User    | null;
  readonly organizationId: string  | null;
  readonly loading:        boolean;
}

interface AuthContextValue extends AuthState {
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const DEMO_MODE = import.meta.env['VITE_DEMO_MODE'] === 'true';

const DEMO_AUTH: AuthContextValue = {
  session:        null,
  user:           { id: 'demo-user-id', app_metadata: { organization_id: 'demo-org-id' } } as unknown as User,
  organizationId: 'demo-org-id',
  loading:        false,
  signOut:        async () => { /* no-op in demo */ },
};

function LiveAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null, user: null, organizationId: null, loading: true,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState(derive(session));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(derive(session));
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  if (DEMO_MODE) {
    return <AuthContext.Provider value={DEMO_AUTH}>{children}</AuthContext.Provider>;
  }
  return <LiveAuthProvider>{children}</LiveAuthProvider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === null) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

function derive(session: Session | null): AuthState {
  return {
    session,
    user:           session?.user ?? null,
    // organization_id is stamped into app_metadata by the auth server on signup.
    organizationId: (session?.user?.app_metadata?.['organization_id'] as string | undefined) ?? null,
    loading:        false,
  };
}

async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
