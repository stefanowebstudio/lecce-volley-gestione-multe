import { useEffect, useState } from 'react';
import { ArrowLeft, Chrome, ShieldCheck } from 'lucide-react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { auth, firebaseReady, isConfiguredAdmin } from '../lib/firebase';
import { userFacingError } from '../lib/utils';
import { ADMIN_PATH } from '../constants/access';

export function Login() {
  const { user, isAdmin, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (user && !isAdmin && auth) void signOut(auth);
  }, [user, isAdmin]);
  if (!loading && user && isAdmin) return <Navigate to={location.state?.from?.pathname ?? '/admin'} replace />;
  const submit = async () => {
    if (!auth) { toast('Firebase non configurato.', 'error'); return; }
    setBusy(true);
    try {
      const credential = await signInWithPopup(auth, new GoogleAuthProvider());
      if (!isConfiguredAdmin(credential.user.uid)) {
        await signOut(auth);
        toast('Questo account Google non è autorizzato come amministratore.', 'error');
        return;
      }
      toast('Accesso amministratore effettuato.');
      navigate(location.state?.from?.pathname ?? '/admin', { replace: true });
    } catch (cause) {
      const code = (cause as { code?: string }).code;
      toast(code === 'auth/popup-blocked' ? 'Il browser ha bloccato la finestra Google. Abilita i popup e riprova.' : userFacingError(cause, 'Accesso non riuscito.'), 'error');
    } finally { setBusy(false); }
  };
  return <div className="login-wrap"><div className="login-back"><Link to="/"><ArrowLeft size={16} /> Torna alla situazione pubblica</Link></div><section className="login-card"><div className="login-mark"><ShieldCheck size={23} /></div><div className="eyebrow">LECCE VOLLEY · AREA RISERVATA</div><h1>Accesso admin</h1><p>Questa area è riservata al tuo account Google autorizzato.</p>{!firebaseReady && <div className="login-warning">Completa la configurazione Firebase descritta nel README per attivare l’accesso.</div>}<button type="button" className="button button-primary login-submit" onClick={() => void submit()} disabled={busy || !firebaseReady}><Chrome size={17} />{busy ? 'Apertura Google…' : 'Continua con Google'}</button><small className="login-footnote">Il sito pubblico resta consultabile da tutti. Le modifiche richiedono il tuo account autorizzato e le regole Firestore.</small><small className="login-footnote">Ingresso riservato: <code>{ADMIN_PATH}</code></small></section></div>;
}
