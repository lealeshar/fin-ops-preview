import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/auth.context';
import { RepositoryProvider } from './contexts/repository.context';
import { JobsPage }        from './pages/jobs-page';
import { FactoriesPage }   from './pages/factories-page';
import { SupervisorsPage } from './pages/supervisors-page';
import { SettingsPage }    from './pages/settings-page';
import { LoginPage }       from './pages/login-page';

type Tab = 'jobs' | 'factories' | 'supervisors' | 'settings';

// ─── Authenticated shell ──────────────────────────────────────────────────────

function AuthenticatedApp() {
  const { signOut } = useAuth();
  const [tab, setTab] = useState<Tab>('jobs');

  return (
    <RepositoryProvider>
      <div className="app">
        <nav className="nav">
          <span className="nav-title">Enterprise Fin-Ops</span>
          <button
            className={`nav-btn${tab === 'jobs'        ? ' active' : ''}`}
            onClick={() => setTab('jobs')}
          >
            עבודות
          </button>
          <button
            className={`nav-btn${tab === 'factories'   ? ' active' : ''}`}
            onClick={() => setTab('factories')}
          >
            מפעלים
          </button>
          <button
            className={`nav-btn${tab === 'supervisors' ? ' active' : ''}`}
            onClick={() => setTab('supervisors')}
          >
            מפקחים
          </button>
          <button
            className={`nav-btn${tab === 'settings' ? ' active' : ''}`}
            onClick={() => setTab('settings')}
          >
            הגדרות
          </button>
          <span className="nav-spacer" />
          <button className="nav-btn" onClick={() => void signOut()}>יציאה</button>
        </nav>

        {tab === 'jobs'        && <JobsPage />}
        {tab === 'factories'   && <FactoriesPage />}
        {tab === 'supervisors' && <SupervisorsPage />}
        {tab === 'settings'    && <SettingsPage />}
      </div>
    </RepositoryProvider>
  );
}

// ─── Root gate ────────────────────────────────────────────────────────────────

function AppGate() {
  const { loading, user, organizationId } = useAuth();

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>טוען…</div>;
  }

  if (user === null || organizationId === null) {
    return <LoginPage />;
  }

  return <AuthenticatedApp />;
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <AuthProvider>
      <AppGate />
    </AuthProvider>
  );
}
