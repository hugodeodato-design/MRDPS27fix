// src/components/views/UsersView.jsx
import { useState, useEffect, useCallback } from 'react';
import { T } from '../../utils/theme.js';
import { Ic, Btn, Card, Avatar, Modal, Field, Inp, Sel, RoleBadge, Badge, toast } from '../ui/index.jsx';
import { api } from '../../utils/api.js';

export default function UsersView({ user: currentUser, bases }) {
  const [users, setUsers]               = useState([]);
  const [invites, setInvites]           = useState([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [modal, setModal]               = useState(null);
  const [inviteModal, setInviteModal]   = useState(false);
  const [createModal, setCreateModal]   = useState(false);

  const load = useCallback(() =>
    api.getUsers().then(u => setUsers(Array.isArray(u) ? u : [])).catch(console.error)
  , []);

  const loadInvites = useCallback(async () => {
    setLoadingInvites(true);
    try {
      const data = await api.getInvitations();
      setInvites(Array.isArray(data) ? data : []);
    } catch { setInvites([]); }
    finally { setLoadingInvites(false); }
  }, []);

  useEffect(() => { load(); loadInvites(); }, [load, loadInvites]);

  const handleDelete = async (u) => {
     setModal({ type: 'confirm', data: u });
  };

  const handleCancelInvite = async (id) => {
    try {
      await api.cancelInvitation(id);
      await loadInvites();
      toast('Invitation annulée');
    } catch (e) { toast(e.message, 'error'); }
  };

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>

      {/* Info invitation */}
      <div style={{ background: T.blueBg, border: `1px solid ${T.blueBdr}`, borderRadius: 12, padding: '12px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Ic n="info" s={15} c={T.blue} />
        <span style={{ fontSize: 12, color: T.txt }}>Les nouveaux utilisateurs reçoivent une <strong>invitation par email</strong> pour activer leur compte.</span>
      </div>
      {/* Titre + bouton créer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: T.txt, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Ic n="users" s={16} c={T.brand} />Utilisateurs actifs
          <span style={{ fontSize: 12, color: T.muted, fontWeight: 400 }}>({users.length})</span>
        </div>
        <Btn onClick={() => setModal({ type: 'form', data: {} })} size="sm">
          <Ic n="plus" s={13} />Créer directement
        </Btn>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14, marginBottom: 28 }}>
        {users.map(u => (
          <Card key={u.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
              <Avatar name={u.name} color={u.color} size={52} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: T.txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
                {u.email && <div style={{ fontSize: 12, color: T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>}
                <div style={{ marginTop: 4 }}><RoleBadge role={u.role} /></div>
              </div>
              {u.id === currentUser.id && (
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.green, flexShrink: 0 }} title="Connecté" />
              )}
            </div>
            {u.last_login && (
              <div style={{ fontSize: 11, color: T.muted, marginBottom: 12 }}>
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

        {/* Bouton invitation */}
        <div onClick={() => setInviteModal(true)}
          style={{ border: `2px dashed ${T.bdrD}`, borderRadius: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32, cursor: 'pointer', color: T.muted, minHeight: 160, transition: 'all .15s' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = T.brand}
          onMouseLeave={e => e.currentTarget.style.borderColor = T.bdrD}>
          <Ic n="plus" s={24} c={T.muted} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>Inviter un utilisateur</span>
          <span style={{ fontSize: 11, textAlign: 'center' }}>Envoi par email</span>
        </div>
      </div>

      {/* Invitations en attente */}
      {(invites.length > 0 || loadingInvites) && (
        <div>
          <div style={{ display: 'grid', gap: 10 }}>
            {invites.map(inv => (
              <div key={inv.id} style={{ background: T.surface, border: `1px solid ${T.orangeBdr}`, borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: 11, background: T.orangeBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Ic n="bell" s={18} c={T.orange} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: T.txt }}>{inv.name}</div>
                  <div style={{ fontSize: 12, color: T.muted }}>{inv.email}</div>
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                    Envoyée par {inv.invited_by_name || 'Admin'} · Expire le {new Date(inv.expires_at).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <RoleBadge role={inv.role} />
                <button onClick={() => handleCancelInvite(inv.id)}
                  style={{ background: T.redBg, border: `1px solid ${T.redBdr}`, cursor: 'pointer', color: T.red, padding: '6px 10px', borderRadius: 8, fontSize: 12, fontFamily: 'inherit', fontWeight: 600 }}>
                  Annuler
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
       {modal?.type === 'confirm' && (
         <Modal title="Désactiver l'utilisateur" onClose={() => setModal(null)}
          footer={<>
            <Btn v="ghost" onClick={() => setModal(null)}>Annuler</Btn>
            <Btn v="danger" onClick={async () => {
               try {
                 await api.deleteUser(modal.data.id);
                 setModal(null);
                 await load();
                 toast('Utilisateur désactivé');
               } catch (e) { toast(e.message, 'error'); }
              }}>Désactiver</Btn>
            </>}>
            <p style={{ color: T.txt, fontSize: 14 }}>
              Désactiver le compte de <strong>{modal.data.name}</strong> ?<br/>
              <span style={{ color: T.muted, fontSize: 12 }}>L'utilisateur ne pourra plus se connecter.</span>
            </p>
         </Modal>
      )}
      {modal?.type === 'form' && (
        <UserFormModal
          data={modal.data}
          currentUserId={currentUser.id}
          bases={bases}
          onClose={() => setModal(null)}
          onSave={async () => { setModal(null); await load(); }}
        />
      )}
      {createModal && (
        <UserFormModal
         data={{}}
         currentUserId={currentUser.id}
         bases={bases}
         onClose={() => setCreateModal(false)}
         onSave={async () => { setCreateModal(false); await load(); }}
        />
      )} 
      {inviteModal && (
        <InviteModal
          bases={bases}
          onClose={() => { setInviteModal(false); loadInvites(); }}
        />
      )}
    </div>
  );
}

// ─── Modal modification/création utilisateur ──────────────────────────────────
function UserFormModal({ data, currentUserId, bases, onClose, onSave }) {
  const { user, editId } = data;
  const COLORS = ['#00875A', '#0065FF', '#FF8B00', '#DE350B', '#6554C0', '#00B8D9'];
  const [form, setForm] = useState(user
    ? { name: user.name, role: user.role, color: user.color, client_base_id: user.client_base_id || '', newPwd: '', confirmPwd: '' }
    : { name: '', role: 'user', color: COLORS[Math.floor(Math.random() * COLORS.length)], client_base_id: '', newPwd: '', confirmPwd: '' }
  );
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name?.trim()) { setErr('Nom requis'); return; }
    if (!editId && !form.newPwd) { setErr('Mot de passe requis'); return; }
    if (form.newPwd && form.newPwd.length < 8) { setErr('Minimum 8 caractères'); return; }
    if (form.newPwd && form.newPwd !== form.confirmPwd) { setErr('Les mots de passe ne correspondent pas'); return; }
    if (form.role === 'client' && !form.client_base_id) { setErr('Sélectionnez une base pour ce client'); return; }

    setLoading(true);
    try {
      const payload = { name: form.name, role: form.role, color: form.color };
      if (form.newPwd) payload.password = form.newPwd;
      if (form.role === 'client') payload.client_base_id = form.client_base_id;
      if (editId) await api.updateUser(editId, payload);
      else await api.createUser({ ...payload, password: form.newPwd });
      await onSave();
      toast(editId ? 'Utilisateur modifié' : 'Utilisateur créé');
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <Modal title={editId ? "Modifier l'utilisateur" : 'Nouvel utilisateur'} onClose={onClose}
      icon={<div style={{ width: 46, height: 46, borderRadius: 13, background: T.purpleBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic n="users" s={20} c={T.purple} /></div>}
      footer={<><Btn v="ghost" onClick={onClose}>Annuler</Btn><Btn onClick={handleSubmit} disabled={loading}>{loading ? 'Enregistrement…' : editId ? 'Enregistrer' : 'Créer'}</Btn></>}>
      <div style={{ display: 'grid', gap: 16 }}>
        <Field label="Nom" required>
          <Inp value={form.name} onChange={e => set('name', e.target.value)} autoFocus />
        </Field>
        <Field label="Rôle">
          <Sel value={form.role} onChange={e => set('role', e.target.value)}>
            <option value="admin">Administrateur</option>
            <option value="user">Utilisateur</option>
            <option value="viewer">Lecture seule</option>
            <option value="client">Client</option>
          </Sel>
        </Field>
        {form.role === 'client' && (
          <Field label="Base assignée" required>
            <Sel value={form.client_base_id} onChange={e => set('client_base_id', e.target.value)}>
              <option value="">— Sélectionner une base —</option>
              {(bases || []).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Sel>
          </Field>
        )}
        <Field label="Couleur">
          <div style={{ display: 'flex', gap: 8 }}>
            {COLORS.map(c => (
              <button key={c} onClick={() => set('color', c)}
                style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: form.color === c ? '3px solid #333' : '3px solid transparent', cursor: 'pointer' }} />
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

// ─── Modal invitation par email ───────────────────────────────────────────────
function InviteModal({ bases, onClose }) {
  const COLORS = ['#00875A', '#0065FF', '#FF8B00', '#DE350B', '#6554C0', '#00B8D9'];
  const [form, setForm] = useState({ name: '', email: '', role: 'user', color: '#0065FF', client_base_id: '' });
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [err, setErr]         = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const doInvite = async () => {
    if (!form.name.trim() || !form.email.trim()) { setErr('Nom et email requis'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setErr('Email invalide'); return; }
    if (form.role === 'client' && !form.client_base_id) { setErr('Sélectionnez une base pour ce client'); return; }
    setLoading(true); setErr('');
    try {
      const data = await api.invite(form);
      if (data.emailSent) {
        setSent(true);
      } else {
        setErr('Invitation créée mais email non envoyé : ' + (data.emailError || 'vérifiez la config SMTP'));
      }
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <Modal
      title="Inviter un utilisateur"
      subtitle="Un email sera envoyé avec un lien d'activation"
      icon={<div style={{ width: 46, height: 46, borderRadius: 13, background: T.blueBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic n="users" s={20} c={T.blue} /></div>}
      onClose={onClose}
      footer={!sent && (
        <><Btn v="ghost" onClick={onClose}>Annuler</Btn>
        <Btn onClick={doInvite} disabled={loading}>
          {loading
            ? <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />Envoi...</>
            : <><Ic n="users" s={13} />Envoyer l'invitation</>}
        </Btn></>
      )}>
      {sent ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <div style={{ fontWeight: 700, fontSize: 18, color: T.txt, marginBottom: 8 }}>Invitation envoyée !</div>
          <div style={{ fontSize: 14, color: T.muted, lineHeight: 1.7 }}>
            Un email a été envoyé à <strong>{form.email}</strong>.<br />
            Le lien est valable <strong>48 heures</strong>.
          </div>
          <Btn onClick={onClose} sx={{ marginTop: 20 }}>Fermer</Btn>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          <Field label="Nom complet" required>
            <Inp value={form.name} onChange={e => set('name', e.target.value)} autoFocus placeholder="Prénom Nom" />
          </Field>
          <Field label="Email" required>
            <Inp type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@exemple.fr" />
          </Field>
          <Field label="Rôle">
            <Sel value={form.role} onChange={e => set('role', e.target.value)}>
              <option value="admin">Administrateur</option>
              <option value="user">Utilisateur</option>
              <option value="viewer">Lecture seule</option>
              <option value="client">Client</option>
            </Sel>
          </Field>
          {form.role === 'client' && (
            <Field label="Base assignée" required>
              <Sel value={form.client_base_id} onChange={e => set('client_base_id', e.target.value)}>
                <option value="">— Sélectionner une base —</option>
                {(bases || []).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Sel>
            </Field>
          )}
          <Field label="Couleur">
            <div style={{ display: 'flex', gap: 8 }}>
              {COLORS.map(c => (
                <button key={c} onClick={() => set('color', c)}
                  style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: form.color === c ? '3px solid #333' : '3px solid transparent', cursor: 'pointer' }} />
              ))}
            </div>
          </Field>
          {err && <div style={{ fontSize: 13, color: T.red, display: 'flex', alignItems: 'center', gap: 6 }}><Ic n="alert" s={13} c={T.red} />{err}</div>}
        </div>
      )}
    </Modal>
  );
}
