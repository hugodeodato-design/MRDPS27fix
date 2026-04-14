// src/components/views/UsersView.jsx
import { useState, useEffect, useCallback } from 'react';
import { T } from '../../utils/theme.js';
import { Ic, Btn, Card, Avatar, Modal, Field, Inp, Sel, RoleBadge, toast } from '../ui/index.jsx';
import { api } from '../../utils/api.js';

export default function UsersView({ user: currentUser }) {
  const [users, setUsers] = useState([]);
  const [modal, setModal] = useState(null);

  const load = useCallback(() => api.getUsers().then(setUsers).catch(console.error), []);
  useEffect(() => { load(); }, [load]);

  const handleDelete = async (u) => {
    if (!confirm(`Désactiver le compte de "${u.name}" ?`)) return;
    try {
      await api.deleteUser(u.id);
      await load();
      toast('Utilisateur désactivé');
    } catch (e) { toast(e.message, 'error'); }
  };

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.txt }}>Utilisateurs</div>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 2 }}>{users.length} compte{users.length > 1 ? 's' : ''}</div>
        </div>
        <Btn onClick={() => setModal({ type: 'form', data: {} })}><Ic n="plus" s={13} />Nouvel utilisateur</Btn>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
        {users.map(u => (
          <Card key={u.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <Avatar name={u.name} color={u.color} size={44} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: T.txt }}>{u.name}</div>
                <RoleBadge role={u.role} />
              </div>
              {u.is_active === 0 && <span style={{ fontSize: 10, color: T.red, background: T.redBg, padding: '2px 6px', borderRadius: 6 }}>Désactivé</span>}
            </div>
            {u.last_login && (
              <div style={{ fontSize: 11, color: T.muted, marginBottom: 14 }}>
                Dernière connexion : {new Date(u.last_login).toLocaleString('fr-FR')}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn v="blue" size="sm" sx={{ flex: 1, justifyContent: 'center' }}
                onClick={() => setModal({ type: 'form', data: { user: u, editId: u.id } })}>
                <Ic n="edit" s={12} />Modifier
              </Btn>
              {u.id !== currentUser.id && u.is_active !== 0 && (
                <button onClick={() => handleDelete(u)}
                  style={{ background: T.redBg, border: `1px solid ${T.redBdr}`, cursor: 'pointer', color: T.red, padding: '5px 9px', borderRadius: 7 }}>
                  <Ic n="trash" s={13} />
                </button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {modal?.type === 'form' && (
        <UserFormModal data={modal.data} currentUserId={currentUser.id}
          onClose={() => setModal(null)}
          onSave={async () => { setModal(null); await load(); }} />
      )}
    </div>
  );
}

function UserFormModal({ data, currentUserId, onClose, onSave }) {
  const { user, editId } = data;
  const [form, setForm] = useState(user
    ? { name: user.name, role: user.role, color: user.color, newPwd: '', confirmPwd: '' }
    : { name: '', role: 'user', color: ['#00875A', '#0065FF', '#FF8B00', '#DE350B', '#6554C0'][Math.floor(Math.random() * 5)], newPwd: '', confirmPwd: '' });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name?.trim()) { setErr('Nom requis'); return; }
    if (!editId && !form.newPwd) { setErr('Mot de passe requis'); return; }
    if (form.newPwd && form.newPwd.length < 8) { setErr('Minimum 8 caractères'); return; }
    if (form.newPwd && form.newPwd !== form.confirmPwd) { setErr('Les mots de passe ne correspondent pas'); return; }

    setLoading(true);
    try {
      const payload = { name: form.name, role: form.role, color: form.color };
      if (form.newPwd) payload.password = form.newPwd;
      if (editId) await api.updateUser(editId, payload);
      else await api.createUser({ ...payload, password: form.newPwd });
      await onSave();
      toast(editId ? 'Utilisateur modifié' : 'Utilisateur créé');
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  };

  return (
    <Modal title={editId ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'} onClose={onClose}
      icon={<div style={{ width: 46, height: 46, borderRadius: 13, background: T.purpleBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic n="users" s={20} c={T.purple} /></div>}
      footer={<><Btn v="ghost" onClick={onClose}>Annuler</Btn><Btn onClick={handleSubmit} disabled={loading}>{loading ? 'Enregistrement…' : editId ? 'Enregistrer' : 'Créer'}</Btn></>}>
      <div style={{ display: 'grid', gap: 16 }}>
        <Field label="Nom" required><Inp value={form.name} onChange={e => set('name', e.target.value)} autoFocus /></Field>
        <Field label="Rôle">
          <Sel value={form.role} onChange={e => set('role', e.target.value)}>
            <option value="admin">Administrateur</option>
            <option value="user">Utilisateur</option>
            <option value="viewer">Lecture seule</option>
          </Sel>
        </Field>
        <Field label="Couleur">
          <div style={{ display: 'flex', gap: 8 }}>
            {['#00875A', '#0065FF', '#FF8B00', '#DE350B', '#6554C0', '#00B8D9'].map(c => (
              <button key={c} onClick={() => set('color', c)}
                style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: form.color === c ? `3px solid #fff` : '3px solid transparent', cursor: 'pointer' }} />
            ))}
          </div>
        </Field>
        <Field label={editId ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe'} required={!editId}>
          <Inp type="password" value={form.newPwd} onChange={e => set('newPwd', e.target.value)} placeholder="Minimum 8 caractères" />
        </Field>
        {form.newPwd && (
          <Field label="Confirmer le mot de passe" required>
            <Inp type="password" value={form.confirmPwd} onChange={e => set('confirmPwd', e.target.value)} />
          </Field>
        )}
        {err && <div style={{ fontSize: 13, color: T.red, display: 'flex', alignItems: 'center', gap: 6 }}><Ic n="alert" s={13} c={T.red} />{err}</div>}
      </div>
    </Modal>
  );
}
