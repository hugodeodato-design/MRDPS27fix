// src/components/ActivationScreen.jsx
import { useState, useEffect } from 'react';
import { T } from '../utils/theme.js';
import { Ic } from './ui/index.jsx';

export default function ActivationScreen({ token, onActivated, companyName }) {
  const [info, setInfo]         = useState(null);
  const [pwd, setPwd]           = useState('');
  const [pwd2, setPwd2]         = useState('');
  const [err, setErr]           = useState('');
  const [loading, setLoading]   = useState(false);
  const [checking, setChecking] = useState(true);
  const [invalid, setInvalid]   = useState(false);

  useEffect(() => {
    if (!token) { setInvalid(true); setChecking(false); return; }
    fetch(`/api/auth/activate/${token}`)
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(d => { setInfo(d); setChecking(false); })
      .catch(() => { setInvalid(true); setChecking(false); });
  }, [token]);

  const doActivate = async () => {
    if (!pwd || pwd.length < 8) { setErr('Minimum 8 caractères'); return; }
    if (pwd !== pwd2) { setErr('Les mots de passe ne correspondent pas'); return; }
    setLoading(true); setErr('');
    try {
      const resp = await fetch('/api/auth/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: pwd }),
      });
      const data = await resp.json();
      if (!resp.ok) { setErr(data.error || 'Erreur'); setLoading(false); return; }
      onActivated(data.token, data.user);
    } catch (e) { setErr('Erreur réseau'); setLoading(false); }
  };

  const wrap = (child) => (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#060D18', fontFamily: "'DM Sans',system-ui,sans-serif", padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: T.greenBg, border: `2px solid ${T.greenBdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Ic n="package" s={28} c={T.brand} />
          </div>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 22 }}>MRDPSTOCK</div>
          <div style={{ color: 'rgba(255,255,255,.3)', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}>{companyName || 'M.R.D.P.S 27'}</div>
        </div>
        {child}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (checking) return wrap(
    <div style={{ textAlign: 'center', color: 'rgba(255,255,255,.4)', fontSize: 14 }}>
      <div style={{ width: 28, height: 28, border: '3px solid rgba(0,135,90,.2)', borderTopColor: T.brand, borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 12px' }} />
      Vérification en cours…
    </div>
  );

  if (invalid) return wrap(
    <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 20, padding: 36, textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>❌</div>
      <div style={{ color: '#f87171', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Lien invalide ou expiré</div>
      <div style={{ color: 'rgba(255,255,255,.4)', fontSize: 13, lineHeight: 1.7 }}>Ce lien d'activation n'est plus valable.<br />Contactez votre administrateur pour recevoir une nouvelle invitation.</div>
    </div>
  );

  return wrap(
    <div style={{ background: 'rgba(255,255,255,.04)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 24, padding: 40, boxShadow: '0 40px 80px rgba(0,0,0,.5)' }}>
      <div style={{ background: 'rgba(0,135,90,.15)', border: '1px solid rgba(0,135,90,.3)', borderRadius: 12, padding: '14px 18px', marginBottom: 28 }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 3 }}>Compte à activer</div>
        <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{info?.name}</div>
        <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 13 }}>{info?.email}</div>
      </div>
      <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Choisissez votre mot de passe</h2>
      <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>Minimum 8 caractères. Vous pourrez le modifier à tout moment.</p>
      <div style={{ display: 'grid', gap: 16 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 7 }}>Mot de passe</label>
          <input type="password" value={pwd} onChange={e => { setPwd(e.target.value); setErr(''); }}
            placeholder="Min. 8 caractères"
            style={{ width: '100%', padding: '12px 14px', borderRadius: 11, border: `1.5px solid ${err ? '#f87171' : 'rgba(255,255,255,.12)'}`, background: 'rgba(255,255,255,.07)', color: '#fff', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 7 }}>Confirmer</label>
          <input type="password" value={pwd2} onChange={e => { setPwd2(e.target.value); setErr(''); }}
            onKeyDown={e => e.key === 'Enter' && doActivate()} placeholder="Répétez le mot de passe"
            style={{ width: '100%', padding: '12px 14px', borderRadius: 11, border: `1.5px solid ${err ? '#f87171' : 'rgba(255,255,255,.12)'}`, background: 'rgba(255,255,255,.07)', color: '#fff', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        {err && <div style={{ fontSize: 12, color: '#f87171', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}><Ic n="alert" s={12} c="#f87171" />{err}</div>}
        <button onClick={doActivate} disabled={loading}
          style={{ width: '100%', padding: 13, borderRadius: 11, background: `linear-gradient(135deg,${T.brand},${T.brandHov})`, color: '#fff', border: 'none', fontSize: 15, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 20px rgba(0,135,90,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          {loading
            ? <><div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />Activation...</>
            : '✅ Activer mon compte'}
        </button>
      </div>
    </div>
  );
}
