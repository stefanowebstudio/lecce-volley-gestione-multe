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
import { isAdminApp } from './constants/appMode';

const Statistics = lazy(() => import('./pages/Statistics').then((module) => ({ default: module.Statistics })));

function Guard({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  const location = useLocation();
  if (!isAdminApp) return <Navigate to="/" replace />;
  if (loading) return <Loading label="Verifica accesso…" />;
  if (!user) return <Navigate to={ADMIN_PATH} state={{ from: location }} replace />;
  if (!isAdmin) return <Navigate to={ADMIN_PATH} replace />;
  return children;
}

function Protected({ children }: { children: ReactNode }) { return <Guard>{children}</Guard>; }

export default function App() {
  const adminRoutes = isAdminApp ? <>
    <Route path={ADMIN_PATH} element={<Login />} />
    <Route path="/login" element={<Navigate to={ADMIN_PATH} replace />} />
    <Route path="/admin" element={<Protected><Admin /></Protected>} />
    <Route path="/fines" element={<Protected><Fines /></Protected>} />
    <Route path="/payments" element={<Protected><Payments /></Protected>} />
    <Route path="/statistics" element={<Protected><Suspense fallback={<Loading label="Caricamento statistiche…" />}><Statistics /></Suspense></Protected>} />
  </> : null;
  return <AppShell><Routes>
    <Route path="/" element={<Dashboard />} />
    <Route path="/players" element={<Players />} />
    <Route path="/players/:id" element={<PlayerDetail />} />
    <Route path="/rules" element={<Rules />} />
    {adminRoutes}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></AppShell>;
}
