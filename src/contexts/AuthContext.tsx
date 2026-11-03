import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth, hasActiveAdminDocument, isConfiguredAdmin } from '../lib/firebase';
import { isAdminApp } from '../constants/appMode';

type AuthValue = { user: User | null; isAdmin: boolean; loading: boolean; logout: () => Promise<void> };
const AuthContext = createContext<AuthValue>({ user: null, isAdmin: false, loading: true, logout: async () => undefined });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!isAdminApp || !auth) { setLoading(false); setIsAdmin(false); return; }
    const authInstance = auth;
    let cancelled = false;
    const unsubscribe = onAuthStateChanged(authInstance, (next) => {
      if (cancelled) return;
      setUser(next);
      if (!next) { setIsAdmin(false); setLoading(false); return; }
      setLoading(true);
      void (async () => {
        const active = isConfiguredAdmin(next.uid) && await hasActiveAdminDocument(next.uid);
        if (!cancelled && authInstance.currentUser?.uid === next.uid) { setIsAdmin(active); setLoading(false); }
      })();
    });
    return () => { cancelled = true; unsubscribe(); };
  }, []);
  const value = useMemo<AuthValue>(() => ({
    user, isAdmin, loading,
    logout: async () => { if (auth) await signOut(auth); },
  }), [user, isAdmin, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() { return useContext(AuthContext); }
