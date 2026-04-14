// src/components/ChangePasswordScreen.jsx
import { useState } from 'react';
import { Ic, Btn, Field, Inp } from './ui/index.jsx';
import { T } from '../utils/theme.js';

export default function ChangePasswordScreen({ user, onSave, onLogout }) {
  const [form, setForm] = useState({ newPwd: '', confirmPwd: '' });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (form.newPwd.length < 8) { setErr('Le mot de passe doit faire au moins 8 caractères'); return; }
    if (form.newPwd !== form.confirmPwd) { setErr('Les mots de passe ne correspondent pas'); return; }
    setLoading(true);
    try {
      await onSave('', form.newPwd); // pas besoin de l'ancien au 1er login
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#060D18', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, fontFamily: "'DM Sans',system-ui,sans-serif" }}>
      <div style={{ width: '100%', maxWidth: 440, padding: 24 }}>
        <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 24, padding: 44 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: T.orangeBg, border: `1px solid ${T.orangeBdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
            <Ic n="lock" s={24} c={T.orange} />
          </div>
          <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Changement de mot de passe</h2>
          <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 13, marginBottom: 32, lineHeight: 1.6 }}>
            Bienvenue <strong style={{ color: '#fff' }}>{user?.name}</strong> ! Pour des raisons de sécurité, vous devez définir un nouveau mot de passe avant de continuer.
          </p>

          <div style={{ display: 'grid', gap: 18 }}>
            <Field label="Nouveau mot de passe" required>
              <Inp type="password" value={form.newPwd} onChange={e => { setForm(f => ({ ...f, newPwd: e.target.value })); setErr(''); }}
                placeholder="Minimum 8 caractères" autoFocus />
            </Field>
            <Field label="Confirmer le mot de passe" required>
              <Inp type="password" value={form.confirmPwd} onChange={e => { setForm(f => ({ ...f, confirmPwd: e.target.value })); setErr(''); }}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                placeholder="Répétez le mot de passe" />
            </Field>

            {err && <div style={{ fontSize: 12, color: T.red, display: 'flex', alignItems: 'center', gap: 6 }}><Ic n="alert" s={12} c={T.red} />{err}</div>}

            <Btn onClick={handleSave} disabled={loading} full size="lg">
              {loading ? 'Enregistrement...' : 'Définir le mot de passe'}
            </Btn>
            <Btn v="ghost" onClick={onLogout} full>
              <Ic n="logout" s={14} /> Se déconnecter
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}
