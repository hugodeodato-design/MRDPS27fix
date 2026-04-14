// src/components/views/DashboardView.jsx
import { useState, useEffect } from 'react';
import { T, formatDate } from '../../utils/theme.js';
import { Ic, Btn, Card, StatCard, Badge, Avatar } from '../ui/index.jsx';
import { api } from '../../utils/api.js';

const PALETTE = ['#00875A', '#0065FF', '#6554C0', '#FF8B00', '#00B8D9', '#DE350B'];

export default function DashboardView({ bases, user, settings, onSelectBase, onNewBase, alertCount }) {
  const [history, setHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [newBaseName, setNewBaseName] = useState('');
  const [showNewBase, setShowNewBase] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    Promise.all([
      api.getHistory({ limit: 8 }),
      api.getAlerts(),
    ]).then(([h, a]) => {
      setHistory(h.rows || []);
      setAlerts(a);
    }).catch(console.error);
  }, []);

  // Stats globales
  const totalItems    = bases.reduce((s, b) => s + (b.total_items || 0), 0);
  const totalInStock  = bases.reduce((s, b) => s + (b.items_en_stock || 0), 0);
  const totalSortis   = bases.reduce((s, b) => s + (b.items_sortis || 0), 0);
  const pct = (a, b) => b > 0 ? Math.round((a / b) * 100) : 0;

  const handleNewBase = async () => {
    if (!newBaseName.trim()) return;
    setCreating(true);
    try {
      await onNewBase(newBaseName.trim());
      setNewBaseName('');
      setShowNewBase(false);
    } finally {
      setCreating(false);
    }
  };

  const topBases = [...bases].sort((a, b) => (b.total_items || 0) - (a.total_items || 0)).slice(0, 5);

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.txt }}>
            Bonjour, {user?.name?.split(' ')[0]} 👋
          </div>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 2 }}>
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
        {user.role !== 'viewer' && (
          <div style={{ display: 'flex', gap: 8 }}>
            {showNewBase ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input value={newBaseName} onChange={e => setNewBaseName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleNewBase()}
                  placeholder="Nom de la base..." autoFocus
                  style={{ padding: '8px 12px', borderRadius: 9, border: `1.5px solid ${T.bdr}`, background: T.surface2, color: T.txt, fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
                <Btn onClick={handleNewBase} disabled={creating || !newBaseName.trim()}>
                  {creating ? 'Création...' : 'Créer'}
                </Btn>
                <Btn v="ghost" onClick={() => { setShowNewBase(false); setNewBaseName(''); }}>Annuler</Btn>
              </div>
            ) : (
              <Btn onClick={() => setShowNewBase(true)} size="lg">
                <Ic n="plus" s={15} />Nouvelle base
              </Btn>
            )}
          </div>
        )}
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14, marginBottom: 24 }}>
        <StatCard icon="building" label="Bases" value={bases.length} color={T.blue} bg={T.blueBg} bdr={T.blueBdr} />
        <StatCard icon="package" label="Articles total" value={totalItems} color={T.brand} bg={T.greenBg} bdr={T.greenBdr} />
        <StatCard icon="check" label="En stock" value={totalInStock} sub={`${pct(totalInStock, totalItems)}% du total`} color={T.green} bg={T.greenBg} bdr={T.greenBdr} />
        <StatCard icon="arrowDown" label="Sortis" value={totalSortis} color={T.red} bg={T.redBg} bdr={T.redBdr} />
        <StatCard icon="bell" label="Alertes stock bas" value={alertCount} color={T.orange} bg={T.orangeBg} bdr={T.orangeBdr} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18, marginBottom: 18 }}>
        {/* Bases table */}
        <Card p={0} sx={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${T.bdr}` }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: T.txt, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: T.blueBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic n="package" s={14} c={T.blue} /></div>
              Bases de stock
            </div>
          </div>
          {topBases.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: T.muted }}>
              <Ic n="package" s={36} c={T.bdr} />
              <div style={{ marginTop: 12, fontWeight: 600 }}>Aucune base créée</div>
              <div style={{ fontSize: 12, marginTop: 4, marginBottom: 16 }}>Créez votre premier espace de stock</div>
              {user.role !== 'viewer' && <Btn onClick={() => setShowNewBase(true)} size="sm"><Ic n="plus" s={12} />Créer</Btn>}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                {['Base', 'Articles', 'En stock', 'Avancement', ''].map(h => (
                  <th key={h} style={{ padding: '9px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: .8, background: T.surface2, borderBottom: `1px solid ${T.bdr}`, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {topBases.map(b => {
                  const total = b.total_items || 0;
                  const inS = b.items_en_stock || 0;
                  return (
                    <tr key={b.id} onClick={() => onSelectBase(b.id)} style={{ cursor: 'pointer', borderBottom: `1px solid ${T.bdr}` }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 9, background: T.greenBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic n="building" s={13} c={T.green} /></div>
                          <span style={{ fontWeight: 600, fontSize: 13, color: T.txt }}>{b.name}</span>
                          {b.alerts > 0 && <Badge v="orange" sm dot>{b.alerts}</Badge>}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}><span style={{ fontWeight: 700, fontSize: 15, color: T.txt }}>{total}</span></td>
                      <td style={{ padding: '12px 16px' }}><Badge v="green" dot sm>{inS}</Badge></td>
                      <td style={{ padding: '12px 16px', minWidth: 100 }}>
                        <div style={{ marginBottom: 4, fontSize: 10, color: T.muted }}>{pct(inS, total || 1)}%</div>
                        <div style={{ background: T.bdr, borderRadius: 3, height: 5, overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: T.brand, borderRadius: 3, width: `${pct(inS, total || 1)}%`, transition: 'width .4s' }} />
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <span style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.brand, fontWeight: 600, fontSize: 12 }}>Ouvrir →</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>

        {/* Activity feed */}
        <Card p={0} sx={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.bdr}`, fontWeight: 700, fontSize: 15, color: T.txt, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: T.purpleBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic n="history" s={14} c={T.purple} /></div>
            Activité récente
          </div>
          {history.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: T.muted, fontSize: 13 }}>Aucune activité</div>
          ) : (
            <div style={{ padding: '6px 0', overflowY: 'auto', maxHeight: 320 }}>
              {history.map((h, i) => {
                const isAdd = h.action.includes('créé') || h.action.includes('ajouté') || h.action.includes('Import');
                const isDel = h.action.includes('supprimé');
                const isMod = h.action.includes('modifié');
                const bv = isDel ? 'red' : isAdd ? 'green' : isMod ? 'blue' : 'gray';
                return (
                  <div key={h.id} style={{ padding: '10px 20px', display: 'flex', alignItems: 'flex-start', gap: 10, borderBottom: i < history.length - 1 ? `1px solid ${T.bdr}` : 'none' }}>
                    <Avatar name={h.user_name} size={30} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: T.txt }}>{h.user_name}</span>
                        <Badge v={bv} sm>{h.action}</Badge>
                      </div>
                      <div style={{ fontSize: 11, color: T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.detail}</div>
                      <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>{formatDate(h.created_at?.slice(0, 10))}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Alertes stock bas */}
      {alerts.length > 0 && (
        <Card p={0} sx={{ overflow: 'hidden', border: `1px solid ${T.orangeBdr}`, background: T.orangeBg }}>
          <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Ic n="alert" s={18} c={T.orange} />
            <span style={{ fontWeight: 700, fontSize: 14, color: T.orange }}>{alerts.length} article{alerts.length > 1 ? 's' : ''} en dessous du seuil d'alerte</span>
          </div>
          <div style={{ background: T.surface, borderTop: `1px solid ${T.orangeBdr}` }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {alerts.slice(0, 4).map(item => (
                  <tr key={item.id} onClick={() => onSelectBase(item.base_id)} style={{ cursor: 'pointer', borderBottom: `1px solid ${T.bdr}` }}>
                    <td style={{ padding: '11px 20px' }}>
                      <span style={{ fontWeight: 600, fontSize: 13, color: T.txt }}>{item.designation}</span>
                      <span style={{ fontSize: 11, color: T.muted, marginLeft: 8 }}>{item.reference}</span>
                    </td>
                    <td style={{ padding: '11px 16px' }}><Badge v="gray" sm>{item.base_name}</Badge></td>
                    <td style={{ padding: '11px 16px' }}><Badge v="red" dot sm>Qté: {item.quantite}</Badge></td>
                    <td style={{ padding: '11px 16px' }}><span style={{ fontSize: 12, color: T.muted }}>Seuil: {item.seuil}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
