// client/src/App.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { api, setToken, onUnauthorized, downloadBlob } from './utils/api.js';
import { T } from './utils/theme.js';
import { Ic, Btn, toast, registerToast } from './components/ui/index.jsx';
import LoginScreen from './components/LoginScreen.jsx';
import ChangePasswordScreen from './components/ChangePasswordScreen.jsx';
import DashboardView from './components/views/DashboardView.jsx';
import StockView from './components/views/StockView.jsx';
import UsersView from './components/views/UsersView.jsx';
import HistoryView from './components/views/HistoryView.jsx';
import AlertsView from './components/views/AlertsView.jsx';
import SettingsView from './components/views/SettingsView.jsx';
import BasesView from './components/views/BasesView.jsx';
import InventaireView from './components/views/InventaireView.jsx';
import MouvementsView from './components/views/MouvementsView.jsx';
import RapportsView from './components/views/RapportsView.jsx';
import ActivationScreen from './components/ActivationScreen.jsx';
import ClientStockView from './components/views/ClientStockView.jsx';
import GlobalSearchView from './components/views/GlobalSearchView.jsx';
import LabelsView from './components/views/LabelsView.jsx';
import ExcelView from './components/views/ExcelView.jsx';
import BonTransportView from './components/views/BonTransportView.jsx';

// ─── Toast global ─────────────────────────────────────────────────────────────
let _toastFn = null;
function Toast({ msg, type }) {
  if (!msg) return null;
  const bg = type === 'error' ? T.redBg : T.greenBg;
  const color = type === 'error' ? T.red : T.green;
  const bdr = type === 'error' ? T.redBdr : T.greenBdr;
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, background: bg, border: `1px solid ${bdr}`, color, borderRadius: 12, padding: '12px 20px', fontSize: 13, fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,.3)', display: 'flex', alignItems: 'center', gap: 10, maxWidth: 360 }}>
      <Ic n={type === 'error' ? 'alert' : 'check'} s={16} c={color} />
      {msg}
    </div>
  );
}

// ─── Sidebar nav item ─────────────────────────────────────────────────────────
function NavItem({ icon, label, active, onClick, badge }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: active ? 600 : 500, background: active ? T.greenBg : 'transparent', color: active ? '#fff' : 'rgba(255,255,255,.5)', borderLeft: active ? `3px solid ${T.brand}` : '3px solid transparent', transition: 'all .15s', position: 'relative' }}>
      <Ic n={icon} s={16} c={active ? T.brand : 'rgba(255,255,255,.4)'} />
      <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
      {badge > 0 && <span style={{ background: T.red, color: '#fff', borderRadius: 20, fontSize: 10, fontWeight: 700, padding: '1px 6px', minWidth: 18, textAlign: 'center' }}>{badge}</span>}
    </button>
  );
}

// ─── App principale ───────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [mustChangePwd, setMustChangePwd] = useState(false);
  const [view, setView] = useState('dashboard');
  const [activeBaseId, setActiveBaseId] = useState(null);
  const [bases, setBases] = useState([]);
  const [settings, setSettings] = useState({});
  const [alertCount, setAlertCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [toast_, setToast_] = useState(null);

  // Register toast globally
  useEffect(() => {
    registerToast((msg, type = 'success') => {
      setToast_({ msg, type });
      setTimeout(() => setToast_(null), 3500);
    });
  }, []);

  // Handle 401
  useEffect(() => {
    onUnauthorized(() => {
      setUser(null);
      setToken(null);
      localStorage.removeItem('mrdp_token');
    });
  }, []);

  // Restore session
  useEffect(() => {
    const tok = localStorage.getItem('mrdp_token');
    if (tok) {
      setToken(tok);
      api.me()
        .then(u => { if (u && u.id) setUser(u); })
        .catch(() => {
          localStorage.removeItem('mrdp_token');
          setToken(null);
        })
        .finally(() => setLoaded(true));
    } else {
      setLoaded(true);
    }
  }, []);

  // Load bases + settings + alerts
  const loadBases = useCallback(async () => {
    try {
      const b = await api.getBases();
      setBases(b);
    } catch (e) { /* silent */ }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const s = await api.getSettings();
      setSettings(s && typeof s === 'object' && !Array.isArray(s) ? s : {});
    } catch (e) { /* silent */ }
  }, []);

  const loadAlerts = useCallback(async () => {
    try {
      const a = await api.getAlerts();
      setAlertCount(Array.isArray(a) ? a.length : 0);
    } catch (e) { /* silent */ }
  }, []);

  useEffect(() => {
    if (user && !mustChangePwd) {
      loadBases();
      loadSettings();
      loadAlerts();
    }
  }, [user, mustChangePwd, loadBases, loadSettings, loadAlerts]);

  // ── Login ──────────────────────────────────────────────────────────────────
  const handleLogin = async (email, password) => {
    const resp = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || 'Identifiants incorrects');
    }
    const { token, user: u } = await resp.json();
    localStorage.setItem('mrdp_token', token);
    setToken(token);
    setUser(u);
    if (u.mustChangePassword) setMustChangePwd(true);
  };

  // ── Logout ─────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    try { await api.logout(); } catch (e) { /* ignore */ }
    localStorage.removeItem('mrdp_token');
    setToken(null);
    setUser(null);
    setBases([]);
    setActiveBaseId(null);
    setView('dashboard');
  };

  // ── Change password ────────────────────────────────────────────────────────
  const handlePasswordChanged = () => {
    setMustChangePwd(false);
    loadBases();
    loadSettings();
    loadAlerts();
  };

  // ── New base ───────────────────────────────────────────────────────────────
  const handleNewBase = async (name) => {
    try {
      const b = await api.createBase(name);
      await loadBases();
      toast('Base créée', 'success');
      return b;
    } catch (e) {
      toast(e.message, 'error');
      throw e;
    }
  };

  // ── Select base ────────────────────────────────────────────────────────────
  const handleSelectBase = (id) => {
    setActiveBaseId(id);
    setView('stock');
  };

  if (!loaded) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, border: `3px solid rgba(0,135,90,.2)`, borderTopColor: T.brand, borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} companyName={settings?.companyName} />;
  }

  // Vérifier si c'est un lien d'activation
  const activationToken = new URLSearchParams(window.location.search).get('token');
  if (activationToken) {
    return <ActivationScreen token={activationToken} companyName={settings?.companyName}
      onActivated={(token, u) => {
        localStorage.setItem('mrdp_token', token);
        setToken(token);
        setUser(u);
        window.history.replaceState({}, '', '/');
      }} />;
  }

  // Vue client (rôle client)
  if (user.role === 'client') {
    return <ClientStockView user={user} onLogout={handleLogout} />;
  }

  if (mustChangePwd) {
    return <ChangePasswordScreen user={user} onChanged={handlePasswordChanged} />;
  }

  const isAdmin = user.role === 'admin';
  const isViewer = user.role === 'viewer';

  // ── Sidebar ────────────────────────────────────────────────────────────────
  const activeBase = bases.find(b => b.id === activeBaseId);

  return (
    <div style={{ display: 'flex', height: '100vh', background: T.bg, fontFamily: "'DM Sans',system-ui,sans-serif", color: T.txt, overflow: 'hidden' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 10px; }
      `}</style>

      {/* SIDEBAR */}
      {sidebarOpen && (
        <div style={{ width: 230, background: T.side, borderRight: `1px solid rgba(255,255,255,.06)`, display: 'flex', flexDirection: 'column', flexShrink: 0, overflowY: 'auto' }}>
          {/* Logo */}
          <div style={{ padding: '20px 16px 16px', borderBottom: `1px solid rgba(255,255,255,.06)` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: T.greenBg, border: `1px solid ${T.greenBdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Ic n="package" s={18} c={T.brand} />
              </div>
              <div>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>MRDPSTOCK</div>
                <div style={{ color: 'rgba(255,255,255,.3)', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase' }}>{settings?.companyName || 'M.R.D.P.S 27'}</div>
              </div>
            </div>
          </div>

          {/* Nav */}
          <div style={{ padding: '12px 8px', flex: 1 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.2)', letterSpacing: 2, textTransform: 'uppercase', padding: '4px 14px 8px' }}>Navigation</div>

            <NavItem icon="home" label="Dashboard" active={view === 'dashboard' && !activeBaseId} onClick={() => { setView('dashboard'); setActiveBaseId(null); }} />
            <NavItem icon="bell" label="Alertes" active={view === 'alerts'} onClick={() => { setView('alerts'); setActiveBaseId(null); }} badge={alertCount} />
            <NavItem icon="history" label="Historique" active={view === 'history'} onClick={() => { setView('history'); setActiveBaseId(null); }} />
            <NavItem icon="search"   label="Recherche globale"  active={view === 'search'}        onClick={() => { setView('search');        setActiveBaseId(null); }} />
            <NavItem icon="tag"      label="Étiquettes QR"       active={view === 'labels'}        onClick={() => { setView('labels');        setActiveBaseId(null); }} />
            <NavItem icon="server"   label="Viewer Excel"        active={view === 'excel'}         onClick={() => { setView('excel');         setActiveBaseId(null); }} />
            <NavItem icon="fileText" label="Bon de transport"    active={view === 'bontransport'}  onClick={() => { setView('bontransport');  setActiveBaseId(null); }} />
            <NavItem icon="refresh" label="Mouvements" active={view === 'mouvements'} onClick={() => { setView('mouvements'); setActiveBaseId(null); }} />
            <NavItem icon="check" label="Inventaire physique" active={view === 'inventaire'} onClick={() => { setView('inventaire'); setActiveBaseId(null); }} />
            <NavItem icon="barChart" label="Rapports & Export" active={view === 'rapports'} onClick={() => { setView('rapports'); setActiveBaseId(null); }} />            
            <NavItem icon="building" label="Bases de stock" active={view === 'bases' || view === 'stock'} onClick={() => { setView('bases'); setActiveBaseId(null); }} badge={bases.length} /> 

            {isAdmin && (
              <>
                <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.2)', letterSpacing: 2, textTransform: 'uppercase', padding: '12px 14px 8px', marginTop: 4 }}>Administration</div>
                <NavItem icon="users" label="Utilisateurs" active={view === 'users'} onClick={() => { setView('users'); setActiveBaseId(null); }} />
                <NavItem icon="settings" label="Paramètres" active={view === 'settings'} onClick={() => { setView('settings'); setActiveBaseId(null); }} />
              </>
            )}
          </div>

          {/* User */}
          <div style={{ padding: '12px 8px', borderTop: `1px solid rgba(255,255,255,.06)` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,.04)' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: user.color || T.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                {user.name[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
                <div style={{ color: 'rgba(255,255,255,.3)', fontSize: 10 }}>{user.role === 'admin' ? 'Administrateur' : user.role === 'viewer' ? 'Lecture seule' : 'Utilisateur'}</div>
              </div>
              <button onClick={handleLogout} title="Déconnexion" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', color: 'rgba(255,255,255,.3)' }}>
                <Ic n="logout" s={15} c="rgba(255,255,255,.3)" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <div style={{ height: 52, background: T.side, borderBottom: `1px solid rgba(255,255,255,.06)`, display: 'flex', alignItems: 'center', paddingInline: 16, gap: 12, flexShrink: 0 }}>
          <button onClick={() => setSidebarOpen(o => !o)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, color: 'rgba(255,255,255,.4)', display: 'flex' }}>
            <Ic n="menu" s={18} c="rgba(255,255,255,.4)" />
          </button>
          <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,.7)' }}>
            {view === 'dashboard' && 'Dashboard'}
            {view === 'bases' && 'Bases de stock'}
            {view === 'stock' && activeBase && activeBase.name}
            {view === 'users' && 'Utilisateurs'}
            {view === 'history' && 'Historique'}
            {view === 'alerts' && 'Alertes stock'}
            {view === 'mouvements' && 'Mouvements de stock'}
            {view === 'inventaire' && 'Inventaire physique'}
            {view === 'rapports' && 'Rapports & Export'}
            {view === 'search' && 'Recherche globale'}
            {view === 'labels' && 'Étiquettes QR'}
            {view === 'excel'  && 'Viewer Excel'}
            {view === 'bontransport' && 'Bon de transport'}
            {view === 'settings' && 'Paramètres'}
          </div>
          {view === 'stock' && activeBase && (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.3)' }}>
              {activeBase.total_items || 0} articles · {activeBase.items_en_stock || 0} en stock
            </div>
          )}
        </div>

        {/* View */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {view === 'bases' && (
            <BasesView
              bases={bases}
              user={user}
              onSelectBase={handleSelectBase}
              onNewBase={handleNewBase}
              onRefreshBases={loadBases}
            />
          )}
          {view === 'dashboard' && (
            <DashboardView
              bases={bases}
              user={user}
              settings={settings}
              onSelectBase={handleSelectBase}
              onNewBase={handleNewBase}
              alertCount={alertCount}
            />
          )} 
          {view === 'stock' && activeBaseId && (
            <StockView
              key={activeBaseId}
              baseId={activeBaseId}
              user={user}
              bases={bases}
              onRefreshBases={loadBases}
              onRefreshAlerts={loadAlerts}
            />
          )}
          {view === 'mouvements' && <MouvementsView bases={bases} user={user} />}
          {view === 'inventaire' && <InventaireView bases={bases} user={user} />}
          {view === 'rapports' && <RapportsView bases={bases} user={user} />} 
          {view === 'search'       && <GlobalSearchView bases={bases} onSelectBase={handleSelectBase} />}
          {view === 'labels'       && <LabelsView bases={bases} />}
          {view === 'excel'        && <ExcelView />}
          {view === 'bontransport' && <BonTransportView bases={bases} user={user} settings={settings} />}
          {view === 'users' && isAdmin && (
            <UsersView user={user} bases={bases} />
          )}
          {view === 'history' && (
            <HistoryView user={user} bases={bases} />
          )}
          {view === 'alerts' && (
            <AlertsView
              user={user}
              bases={bases}
              onSelectBase={handleSelectBase}
              onRefreshAlerts={loadAlerts}
            />
          )}
          {view === 'settings' && isAdmin && (
            <SettingsView
              user={user}
              settings={settings}
              onSave={async (form) => {
                await api.saveSettings(form);
                await loadSettings();
                toast('Paramètres sauvegardés');
              }}
            />
          )}
        </div>
      </div>

      {/* Toast */}
      {toast_ && <Toast msg={toast_.msg} type={toast_.type} />}
    </div>
  );
}