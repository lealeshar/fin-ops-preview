import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/auth.context';
import { RepositoryProvider } from './contexts/repository.context';
import { DashboardPage }    from './pages/dashboard-page';
import { JobsPage }         from './pages/jobs-page';
import { FactoriesPage }    from './pages/factories-page';
import { SupervisorsPage }  from './pages/supervisors-page';
import { SettingsPage }     from './pages/settings-page';
import { LoginPage }        from './pages/login-page';
import { UserRole }         from './types/enums';

type Tab = 'dashboard' | 'jobs' | 'factories' | 'supervisors' | 'settings';

const ROLE_LABELS: Record<string, string> = {
  [UserRole.Admin]:   'מנהל',
  [UserRole.Finance]: 'כספים',
  [UserRole.Ops]:     'תפעול',
  [UserRole.Viewer]:  'צפייה',
};

const ROLE_CLASS: Record<string, string> = {
  [UserRole.Admin]:   'role-badge-purple',
  [UserRole.Finance]: 'role-badge-blue',
  [UserRole.Ops]:     'role-badge-green',
  [UserRole.Viewer]:  'role-badge-gray',
};

// ─── Authenticated shell ──────────────────────────────────────────────────────

function AuthenticatedApp() {
  const { user, role, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>('dashboard');

  const email      = user?.email ?? '';
  const roleLabel  = role ? (ROLE_LABELS[role] ?? role) : null;
  const roleClass  = role ? (ROLE_CLASS[role]  ?? 'role-badge-gray') : 'role-badge-gray';

  return (
    <RepositoryProvider>
      <div className="app">
        <nav className="nav">
          <span className="nav-title">Enterprise Fin-Ops</span>
          <button
            className={`nav-btn${tab === 'dashboard'   ? ' active' : ''}`}
            onClick={() => setTab('dashboard')}
          >
            לוח בקרה
          </button>
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
            className={`nav-btn${tab === 'settings'    ? ' active' : ''}`}
            onClick={() => setTab('settings')}
          >
            הגדרות
          </button>

          <span className="nav-spacer" />

          <div className="nav-user">
            <span className="nav-email" title={email}>{email}</span>
            {roleLabel && (
              <span className={`role-badge ${roleClass}`}>{roleLabel}</span>
            )}
          </div>

          <button className="nav-btn" onClick={() => void signOut()}>יציאה</button>
        </nav>

        {tab === 'dashboard'   && <DashboardPage />}
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
