import { useState } from 'react';
import { Chrome, ShieldCheck } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { auth, firebaseReady, hasActiveAdminDocument, isConfiguredAdmin } from '../lib/firebase';
import { userFacingError } from '../lib/utils';
import { ADMIN_PATH } from '../constants/access';

export function Login() {
  const { user, isAdmin, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const adminAllowlistConfigured = Boolean((import.meta.env.VITE_ADMIN_UIDS ?? '').trim());

  if (!loading && user && isAdmin) return <Navigate to={location.state?.from?.pathname ?? '/admin'} replace />;

  const submit = async () => {
    if (!auth) { toast('Firebase non configurato. Controlla le variabili VITE_FIREBASE_*.', 'error'); return; }
    setBusy(true);
    try {
      if (user && !isAdmin) await signOut(auth);
      const credential = await signInWithPopup(auth, new GoogleAuthProvider());
      const uid = credential.user.uid;
      if (!isConfiguredAdmin(uid)) {
        await signOut(auth);
        toast('Account Google non autorizzato: il suo UID non è presente in VITE_ADMIN_UIDS.', 'error');
        return;
      }
      if (!await hasActiveAdminDocument(uid)) {
        await signOut(auth);
        toast('Account non autorizzato: manca admins/{uid} con active=true in Firestore.', 'error');
        return;
      }
      toast('Accesso amministratore effettuato.');
      navigate(location.state?.from?.pathname ?? '/admin', { replace: true });
    } catch (cause) {
      const code = (cause as { code?: string }).code;
      const message = code === 'auth/popup-blocked'
        ? 'Il browser ha bloccato la finestra Google. Abilita i popup e riprova.'
        : code === 'auth/popup-closed-by-user'
          ? 'Accesso annullato.'
          : code === 'auth/unauthorized-domain'
            ? 'Questo dominio non è autorizzato in Firebase Authentication.'
            : userFacingError(cause, 'Accesso non riuscito.');
      toast(message, 'error');
    } finally { setBusy(false); }
  };

  return <div className="login-wrap"><section className="login-card"><div className="login-mark"><ShieldCheck size={23} /></div><div className="eyebrow">LECCE VOLLEY · 26/27</div><h1>Area Amministratore</h1><p>Accedi per gestire giocatori, multe, pagamenti e riepiloghi.</p>{!firebaseReady && <div className="login-warning">Firebase non è configurato. Completa le variabili <code>VITE_FIREBASE_*</code> prima del deploy.</div>}{firebaseReady && !adminAllowlistConfigured && <div className="login-warning">Manca <code>VITE_ADMIN_UIDS</code>: nessun account potrà essere autorizzato.</div>}{!loading && user && !isAdmin && <div className="login-warning">L’account Google attuale non è autorizzato. Premi il pulsante per scegliere un altro account.</div>}<button type="button" className="button button-primary login-submit" onClick={() => void submit()} disabled={busy || !firebaseReady}><Chrome size={17} />{busy ? 'Accesso in corso…' : 'Accedi con Google'}</button><small className="login-footnote">L’accesso richiede Google Authentication, un UID presente nella allowlist e un documento Firestore <code>admins/{'{uid}'}</code> attivo.</small><small className="login-footnote">Percorso admin: <code>{ADMIN_PATH}</code></small></section></div>;
}
