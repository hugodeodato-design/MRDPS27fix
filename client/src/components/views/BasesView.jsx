import { useState } from 'react';
import { T, today } from '../../utils/theme.js';
import { Ic, Btn, Card, toast } from '../ui/index.jsx';
import { api } from '../../utils/api.js';

const PALETTE = ['#00875A','#0065FF','#6554C0','#FF8B00','#00B8D9','#DE350B'];

export default function BasesView({ bases, user, onSelectBase, onNewBase, onRefreshBases }) {
  const [newName, setNewName]   = useState('');
  const [creating, setCreating] = useState(false);
  const [showNew, setShowNew]   = useState(false);
  const [modal, setModal]       = useState(null);
  const isViewer = user.role === 'viewer';

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await onNewBase(newName.trim());
      setNewName('');
      setShowNew(false);
    } finally { setCreating(false); }
  };

  const handleDelete = async (b) => {
    setModal({ type: 'confirmBase', data: b });
  };

  const handleRename = async (b) => {
    const name = prompt('Nouveau nom :', b.name);
    if (!name?.trim() || name === b.name) return;
    try {
      await api.updateBase(b.id, name.trim());
      await onRefreshBases();
      toast('Base renommée');
    } catch (e) { toast(e.message, 'error'); }
  };

  return (
    <div style={{ padding: 28, overflowY: 'auto', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.txt }}>Bases de stock</div>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 2 }}>{bases.length} base{bases.length > 1 ? 's' : ''} disponible{bases.length > 1 ? 's' : ''}</div>
        </div>
        {!isViewer && (
          showNew ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input value={newName} onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder="Nom de la base..." autoFocus
                style={{ padding: '9px 14px', borderRadius: 10, border: `1.5px solid ${T.bdr}`, background: T.surface2, color: T.txt, fontSize: 13, outline: 'none', fontFamily: 'inherit', minWidth: 220 }} />
              <Btn onClick={handleCreate} disabled={creating || !newName.trim()}>
                {creating ? 'Création...' : 'Créer'}
              </Btn>
              <Btn v="ghost" onClick={() => { setShowNew(false); setNewName(''); }}>Annuler</Btn>
            </div>
          ) : (
            <Btn onClick={() => setShowNew(true)} size="lg">
              <Ic n="plus" s={15} />Nouvelle base
            </Btn>
          )
        )}
      </div>

      {/* Grille des bases */}
      {bases.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: 60, color: T.muted }}>
            <Ic n="building" s={48} c={T.muted} />
            <div style={{ marginTop: 16, fontWeight: 600, fontSize: 16 }}>Aucune base de stock</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>Créez votre première base pour commencer</div>
            {!isViewer && (
              <Btn onClick={() => setShowNew(true)} sx={{ marginTop: 20 }}>
                <Ic n="plus" s={14} />Créer une base
              </Btn>
            )}
          </div>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {bases.map((b, i) => {
            const color = PALETTE[i % PALETTE.length];
            const pct = b.total_items > 0 ? Math.round((b.items_en_stock / b.total_items) * 100) : 0;
            return (
              <div key={b.id}
                onClick={() => onSelectBase(b.id)}
                style={{ background: T.surface, border: `1px solid ${T.bdr}`, borderRadius: 16, padding: 22, cursor: 'pointer', transition: 'all .15s', position: 'relative', overflow: 'hidden' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = color}
                onMouseLeave={e => e.currentTarget.style.borderColor = T.bdr}>

                {/* Barre couleur top */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color, borderRadius: '16px 16px 0 0' }} />

                {/* Icon + nom */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, marginTop: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: color + '20', border: `1px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Ic n="building" s={20} c={color} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: T.txt }}>{b.name}</div>
                      <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{b.total_items || 0} articles</div>
                    </div>
                  </div>
                  {!isViewer && (
                    <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                      <button onClick={() => handleRename(b)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 7, color: T.muted }}
                        title="Renommer">
                        <Ic n="edit" s={14} c={T.muted} />
                      </button>
                      <button onClick={() => handleDelete(b)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 7, color: T.muted }}
                        title="Supprimer">
                        <Ic n="trash" s={14} c={T.red} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
                  {[
                    { label: 'En stock', value: b.items_en_stock || 0, color: T.green },
                    { label: 'Sortis',   value: b.items_sortis || 0,   color: T.orange },
                    { label: 'Alertes',  value: b.alerts || 0,         color: T.red },
                  ].map(s => (
                    <div key={s.label} style={{ background: T.surface2, borderRadius: 9, padding: '8px 10px', textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: 10, color: T.muted, marginTop: 1 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Barre progression */}
                <div style={{ height: 5, background: T.surface2, borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 10, transition: 'width .3s' }} />
                </div>
                <div style={{ fontSize: 10, color: T.muted, marginTop: 4, textAlign: 'right' }}>{pct}% en stock</div>
              </div>
            );
          })}
        </div>
      )}
       {modal?.type === 'confirmBase' && (
        <Modal title="Supprimer la base" onClose={() => setModal(null)}
          footer={<>
            <Btn v="ghost" onClick={() => setModal(null)}>Annuler</Btn>
            <Btn v="danger" onClick={async () => {
              try {
                await api.deleteBase(modal.data.id);
                setModal(null);
                await onRefreshBases();
                toast('Base supprimée');
              } catch (e) { toast(e.message, 'error'); }
            }}>Supprimer</Btn>
          </>}>
          <p style={{ color: T.txt, fontSize: 14 }}>
            Supprimer la base <strong>{modal.data.name}</strong> et tous ses articles ?<br/>
            <span style={{ color: T.red, fontSize: 12 }}>⚠ Action irréversible.</span>
          </p>
        </Modal>
      )} 
    </div>
  );
}
