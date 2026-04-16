import { useState } from 'react';
import { Ic } from './ui/index.jsx';
import { T } from '../utils/theme.js';

export default function LoginScreen({ onLogin, companyName }) {
  const [email, setEmail]     = useState('');
  const [pwd, setPwd]         = useState('');
  const [err, setErr]         = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const doLogin = async () => {
    if (loading) return;
    if (!email.trim()) { setErr('Entrez votre email'); return; }
    if (!pwd) { setErr('Entrez votre mot de passe'); return; }
    setErr(''); setLoading(true);
    try {
      await onLogin(email.trim(), pwd);
    } catch (e) {
      setErr(e.message || 'Identifiants incorrects');
      setPwd('');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', fontFamily: "'DM Sans',system-ui,sans-serif", background: '#060D18', overflow: 'hidden' }}>
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '60%', height: '70%', background: 'radial-gradient(ellipse,rgba(0,135,90,.12) 0%,transparent 70%)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '50%', height: '60%', background: 'radial-gradient(ellipse,rgba(0,101,255,.08) 0%,transparent 70%)', borderRadius: '50%' }} />
      </div>

      {/* LEFT branding */}
      <div style={{ width: '55%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '52px 64px', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(0,135,90,.12)', border: '2px solid rgba(0,135,90,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Ic n="package" s={24} c={T.brand} />
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 20 }}>MRDPSTOCK</div>
            <div style={{ color: 'rgba(255,255,255,.3)', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase' }}>{companyName || 'M.R.D.P.S 27'}</div>
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 520 }}>
          <h1 style={{ color: '#fff', fontSize: 52, fontWeight: 800, lineHeight: 1.1, marginBottom: 20, letterSpacing: -.5 }}>MRDPSTOCK</h1>
          <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 15, lineHeight: 1.8 }}>Gérez vos bases de stock, suivez vos articles et pilotez vos alertes depuis un seul espace.</p>
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.18)' }}>© 2025 MRDPSTOCK — {companyName || 'M.R.D.P.S 27'}</div>
      </div>

      {/* RIGHT form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, position: 'relative', zIndex: 1 }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <div style={{ background: 'rgba(255,255,255,.04)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 24, padding: 44, boxShadow: '0 40px 80px rgba(0,0,0,.5)' }}>
            <h2 style={{ color: '#fff', fontSize: 26, fontWeight: 700, marginBottom: 8 }}>Connexion</h2>
            <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 13, marginBottom: 32 }}>Entrez vos identifiants pour accéder à l'application</p>

            <div style={{ display: 'grid', gap: 20 }}>
              {/* Email */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 8 }}>Email</label>
                <input
                  type="email" value={email}
                  onChange={e => { setEmail(e.target.value); setErr(''); }}
                  onKeyDown={e => e.key === 'Enter' && doLogin()}
                  placeholder="votre@email.fr" autoFocus
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 11, border: `1.5px solid ${err && !email ? '#f87171' : 'rgba(255,255,255,.12)'}`, background: 'rgba(255,255,255,.07)', color: '#fff', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {/* Mot de passe */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 8 }}>Mot de passe</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPwd ? 'text' : 'password'} value={pwd}
                    onChange={e => { setPwd(e.target.value); setErr(''); }}
                    onKeyDown={e => e.key === 'Enter' && doLogin()}
                    placeholder="••••••••"
                    style={{ width: '100%', padding: '12px 44px 12px 14px', borderRadius: 11, border: `1.5px solid ${err ? '#f87171' : 'rgba(255,255,255,.12)'}`, background: 'rgba(255,255,255,.07)', color: '#fff', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                  />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
                    <Ic n={showPwd ? 'eyeoff' : 'eye'} s={16} c="rgba(255,255,255,.4)" />
                  </button>
                </div>
                {err && <div style={{ marginTop: 8, fontSize: 12, color: '#f87171', display: 'flex', alignItems: 'center', gap: 6 }}><Ic n="alert" s={12} c="#f87171" />{err}</div>}
              </div>

              <button type="button" onClick={doLogin} disabled={loading}
                style={{ width: '100%', padding: 14, borderRadius: 11, background: loading ? 'rgba(0,135,90,.5)' : `linear-gradient(135deg,${T.brand},${T.brandHov})`, color: '#fff', border: 'none', fontSize: 15, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 20px rgba(0,135,90,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                {loading ? <><div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />Connexion...</> : 'Se connecter'}
              </button>
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
