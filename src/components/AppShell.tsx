import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Banknote, ClipboardList, Home, LogOut, Menu, Moon, Plus, Settings2, ShieldCheck, Sun, Users, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { firebaseReady } from '../lib/firebase';
import { useToast } from '../contexts/ToastContext';
import { FineForm } from '../pages/Fines';

const items = [
  { to: '/', label: 'Situazione', icon: Home, public: true },
  { to: '/players', label: 'Giocatori', icon: Users, public: true },
  { to: '/fines', label: 'Multe', icon: ClipboardList, admin: true },
  { to: '/payments', label: 'Cassa', icon: Banknote, admin: true },
];

function Navigation({ mobile = false, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const { isAdmin } = useAuth();
  return <nav className={mobile ? 'nav-links mobile-nav-links' : 'nav-links'}>
    {items.filter((item) => item.public || isAdmin).map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === '/'} onClick={onNavigate} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><Icon size={19} /><span>{label}</span></NavLink>)}
    <NavLink to="/rules" onClick={onNavigate} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><ClipboardList size={19} /><span>{mobile ? 'Altro' : 'Regolamento'}</span></NavLink>
    {isAdmin && <NavLink to="/statistics" onClick={onNavigate} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><ShieldCheck size={19} /><span>Statistiche</span></NavLink>}
    {isAdmin && <NavLink to="/admin" onClick={onNavigate} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><Settings2 size={19} /><span>Pannello admin</span></NavLink>}
  </nav>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const [dark, setDark] = useState(() => localStorage.getItem('lecce-volley-theme') === 'dark');
  const [menuOpen, setMenuOpen] = useState(false);
  const [fineOpen, setFineOpen] = useState(false);
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => { document.documentElement.classList.toggle('dark', dark); localStorage.setItem('lecce-volley-theme', dark ? 'dark' : 'light'); }, [dark]);
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);
  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline); window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);
  return <div className="app-shell">
    <aside className="sidebar">
      <NavLink to="/" className="brand"><span className="brand-mark">LV</span><span><strong>LECCE VOLLEY</strong><small>GESTIONE MULTE · 26/27</small></span></NavLink>
      <div className="nav-caption">MENU</div><Navigation />
      <div className="sidebar-spacer" />
      <div className="season-card"><span className="season-dot" />Stagione 2026 / 27</div>
      <button className="nav-link theme-toggle" onClick={() => setDark(!dark)}>{dark ? <Sun size={19} /> : <Moon size={19} />}<span>{dark ? 'Tema chiaro' : 'Tema scuro'}</span></button>
      {user && <button className="nav-link logout-link" onClick={() => void logout().then(() => toast('Disconnessione completata.')).catch(() => toast('Errore durante la disconnessione.', 'error'))}><LogOut size={19} /><span>Esci</span></button>}
      {!firebaseReady && <div className="sidebar-note">Configura Firebase per attivare i dati.</div>}
    </aside>
    {menuOpen && <div className="mobile-menu-backdrop" onClick={() => setMenuOpen(false)} />}
    <aside className={`mobile-drawer ${menuOpen ? 'open' : ''}`}><div className="drawer-head"><span className="brand-mark">LV</span><button className="icon-button" onClick={() => setMenuOpen(false)}><X /></button></div><Navigation mobile onNavigate={() => setMenuOpen(false)} /><button className="nav-link theme-toggle" onClick={() => setDark(!dark)}>{dark ? <Sun size={19} /> : <Moon size={19} />}<span>{dark ? 'Tema chiaro' : 'Tema scuro'}</span></button>{user && <button className="nav-link logout-link" onClick={() => void logout().then(() => toast('Disconnessione completata.')).catch(() => toast('Errore durante la disconnessione.', 'error'))}><LogOut size={19} /><span>Esci</span></button>}</aside>
    <div className="main-column">
      <header className="topbar"><button className="icon-button menu-trigger" onClick={() => setMenuOpen(true)} aria-label="Apri menu"><Menu /></button><div className="topbar-breadcrumb">LECCE VOLLEY <span>/</span> 2026—27</div><div className="topbar-actions"><span className="connection-dot" title={firebaseReady ? 'Firebase configurato' : 'Firebase non configurato'} />{isAdmin && <span className="admin-chip"><ShieldCheck size={14} />Admin</span>}<button className="icon-button top-theme" onClick={() => setDark(!dark)} aria-label="Cambia tema">{dark ? <Sun size={18} /> : <Moon size={18} />}</button>{isAdmin && <button className="button button-primary top-add" onClick={() => setFineOpen(true)}><Plus size={17} /> Nuova multa</button>}</div></header>
      {!firebaseReady && <div className="config-banner"><span><strong>Collegamento Firebase da configurare.</strong> I dati non sono ancora persistenti. Aggiungi le variabili indicate in <code>.env.example</code> e configura Firestore seguendo <code>README.md</code>.</span><button className="icon-button" onClick={(event) => event.currentTarget.parentElement?.remove()} aria-label="Chiudi"><X size={16} /></button></div>}
      {!online && <div className="config-banner offline-banner"><span><strong>Connessione assente.</strong> Le registrazioni richiedono una connessione attiva a Firebase; riprova quando torni online.</span></div>}
      <main className="main-content">{children}</main>
      <footer className="footer">Lecce Volley <span>·</span> Stagione 2026/27</footer>
    </div>
    <div className="mobile-bottom-nav"><Navigation mobile /></div>
    {isAdmin && <button className="mobile-fab" onClick={() => setFineOpen(true)} aria-label="Nuova multa"><Plus size={23} /></button>}
    {fineOpen && <FineForm onClose={() => setFineOpen(false)} onSaved={() => { setFineOpen(false); navigate('/fines'); }} />}
  </div>;
}
