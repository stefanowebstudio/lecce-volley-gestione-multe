import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth, isConfiguredAdmin } from '../lib/firebase';
import { isAdminApp } from '../constants/appMode';

type AuthValue = { user: User | null; isAdmin: boolean; loading: boolean; logout: () => Promise<void> };
const AuthContext = createContext<AuthValue>({ user: null, isAdmin: false, loading: true, logout: async () => undefined });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!isAdminApp || !auth) { setLoading(false); return; }
    return onAuthStateChanged(auth, (next) => { setUser(next); setLoading(false); });
  }, []);
  const value = useMemo<AuthValue>(() => ({
    user, isAdmin: isConfiguredAdmin(user?.uid), loading,
    logout: async () => { if (auth) await signOut(auth); },
  }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() { return useContext(AuthContext); }
