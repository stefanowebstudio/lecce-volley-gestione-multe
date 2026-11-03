import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { useAuth } from './contexts/AuthContext';
import { Admin } from './pages/Admin';
import { Dashboard } from './pages/Dashboard';
import { Fines } from './pages/Fines';
import { Login } from './pages/Login';
import { Payments } from './pages/Payments';
import { PlayerDetail, Players } from './pages/Players';
import { Rules } from './pages/Rules';
import { Loading } from './components/ui';
import { ADMIN_PATH } from './constants/access';
import { APP_MODE, isAdminApp, isPublicApp } from './constants/appMode';

const Statistics = lazy(() => import('./pages/Statistics').then((module) => ({ default: module.Statistics })));

function Guard({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading label="Verifica accesso…" />;
  if (!user || !isAdmin) return <Navigate to={ADMIN_PATH} state={{ from: location }} replace />;
  return children;
}

function Protected({ children }: { children: ReactNode }) { return <Guard>{children}</Guard>; }

function PublicRoutes() {
  return <Routes>
    <Route path="/" element={<Dashboard />} />
    <Route path="/players" element={<Players />} />
    <Route path="/players/:id" element={<PlayerDetail />} />
    <Route path="/rules" element={<Rules />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}

function AdminRoutes() {
  return <Routes>
    <Route path={ADMIN_PATH} element={<Login />} />
    <Route path="/login" element={<Navigate to={ADMIN_PATH} replace />} />
    <Route path="/" element={<Protected><Dashboard /></Protected>} />
    <Route path="/players" element={<Protected><Players /></Protected>} />
    <Route path="/players/:id" element={<Protected><PlayerDetail /></Protected>} />
    <Route path="/rules" element={<Protected><Rules /></Protected>} />
    <Route path="/admin" element={<Protected><Admin /></Protected>} />
    <Route path="/fines" element={<Protected><Fines /></Protected>} />
    <Route path="/payments" element={<Protected><Payments /></Protected>} />
    <Route path="/statistics" element={<Protected><Suspense fallback={<Loading label="Caricamento statistiche…" />}><Statistics /></Suspense></Protected>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}

function ModeConfigurationError() {
  const configured = String(import.meta.env.VITE_APP_MODE ?? '').trim() || '(mancante)';
  return <div className="mode-error-page"><div className="mode-error-card"><span className="brand-mark">LV</span><div className="eyebrow">LECCE VOLLEY · CONFIGURAZIONE</div><h1>Modalità di pubblicazione non valida</h1><p>Il sito non può avviarsi perché <code>VITE_APP_MODE</code> è assente o non riconosciuta.</p><div className="mode-error-value">Valore ricevuto: <code>{configured}</code></div><small>Imposta esattamente <code>public</code> per il sito condiviso oppure <code>admin</code> per il sito amministratore, quindi esegui un nuovo deploy.</small></div></div>;
}

export default function App() {
  if (APP_MODE === 'invalid') return <ModeConfigurationError />;
  if (isAdminApp) return <AppShell><AdminRoutes /></AppShell>;
  if (isPublicApp) return <AppShell><PublicRoutes /></AppShell>;
  return <ModeConfigurationError />;
}
