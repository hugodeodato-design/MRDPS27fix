// src/components/views/DashboardView.jsx
import { useState, useEffect, useMemo } from 'react';
import { T, formatDate } from '../../utils/theme.js';
import { Ic, Btn, Card, StatCard, Badge, Avatar } from '../ui/index.jsx';
import { api } from '../../utils/api.js';

const PALETTE = ['#00875A', '#0065FF', '#6554C0', '#FF8B00', '#00B8D9', '#DE350B'];
const pct = (a, b) => b > 0 ? Math.round((a / b) * 100) : 0;

export default function DashboardView({ bases, user, settings, onSelectBase, onNewBase, alertCount }) {
  const [history, setHistory]       = useState([]);
  const [alerts, setAlerts]         = useState([]);
  const [mvtData, setMvtData]       = useState([]);
  const [allItems, setAllItems]     = useState([]);
  const [newBaseName, setNewBaseName] = useState('');
  const [showNewBase, setShowNewBase] = useState(false);
  const [creating, setCreating]     = useState(false);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    Promise.all([
      api.getHistory({ limit: 8 }),
      api.getAlerts(),
      api.get('/mouvements/stats?days=7').catch(() => []),
      api.get('/items/stats').catch(() => null),
    ]).then(([h, a, mvt, stats]) => {
      setHistory(Array.isArray(h) ? h : (h?.rows || []));
      setAlerts(Array.isArray(a) ? a : []);
      setMvtData(Array.isArray(mvt) ? mvt : []);
    }).catch(console.error)
    .finally(() => setLoading(false));
  }, []);

  // Stats globales depuis bases
  const totalItems   = bases.reduce((s, b) => s + (b.total_items || 0), 0);
  const totalInStock = bases.reduce((s, b) => s + (b.items_en_stock || 0), 0);
  const totalSortis  = bases.reduce((s, b) => s + (b.items_sortis || 0), 0);
  const totalAlertes = bases.reduce((s, b) => s + (b.alerts || 0), 0);

  const topBases = [...bases].sort((a, b) => (b.total_items || 0) - (a.total_items || 0)).slice(0, 5);

  // Graphique mouvements 7 jours
  const mvtStats = useMemo(() => {
    const days = 7;
    const result = [];
    for (let d = days - 1; d >= 0; d--) {
      const dt = new Date(); dt.setDate(dt.getDate() - d);
      const label  = dt.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
      const dayStr = dt.toISOString().slice(0, 10);
      const entrees = mvtData.filter(m => m.jour === dayStr && m.type === 'entree').reduce((s, m) => s + (m.nb_mouvements || 0), 0);
      const sorties = mvtData.filter(m => m.jour === dayStr && m.type === 'sortie').reduce((s, m) => s + (m.nb_mouvements || 0), 0);
      result.push({ label, entries: entrees, exits: sorties });
    }
    return result;
  }, [mvtData]);

  const maxBar = Math.max(1, ...mvtStats.map(d => Math.max(d.entries, d.exits)));

  const handleNewBase = async () => {
    if (!newBaseName.trim()) return;
    setCreating(true);
    try {
      await onNewBase(newBaseName.trim());
      setNewBaseName('');
      setShowNewBase(false);
    } finally { setCreating(false); }
  };

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
        <StatCard icon="building"  label="Bases"           value={bases.length}  color={T.blue}   bg={T.blueBg}   bdr={T.blueBdr}   onClick={() => {}} />
        <StatCard icon="package"   label="Articles total"  value={totalItems}    color={T.brand}  bg={T.greenBg}  bdr={T.greenBdr}  />
        <StatCard icon="check"     label="En stock"        value={totalInStock}  sub={`${pct(totalInStock, totalItems)}% du total`} color={T.green}  bg={T.greenBg}  bdr={T.greenBdr} />
        <StatCard icon="arrowDown" label="Sortis"          value={totalSortis}   color={T.red}    bg={T.redBg}    bdr={T.redBdr}    />
        <StatCard icon="bell"      label="Alertes stock"   value={alertCount || totalAlertes} color={T.orange} bg={T.orangeBg} bdr={T.orangeBdr} />
      </div>

      {/* Row 1 : graphique mouvements + activité récente */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18, marginBottom: 18 }}>

        {/* Graphique mouvements 7 jours */}
        <Card p={0} sx={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${T.bdr}` }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: T.greenBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Ic n="barChart" s={14} c={T.green} />
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, color: T.txt }}>Mouvements — 7 derniers jours</div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, fontSize: 11 }}>
              <span style={{ color: T.green, fontWeight: 600 }}>● Entrées</span>
              <span style={{ color: T.red,   fontWeight: 600 }}>● Sorties</span>
            </div>
          </div>
          <div style={{ padding: '20px 20px 16px', display: 'flex', alignItems: 'flex-end', gap: 10, height: 130 }}>
            {mvtStats.map((d, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 80 }}>
                  <div title={`${d.entries} entrées`} style={{ width: 13, background: T.green, borderRadius: '3px 3px 0 0', height: `${Math.max(4, (d.entries / maxBar) * 76)}px`, transition: 'height .4s' }} />
                  <div title={`${d.exits} sorties`}   style={{ width: 13, background: T.red,   borderRadius: '3px 3px 0 0', height: `${Math.max(4, (d.exits   / maxBar) * 76)}px`, transition: 'height .4s' }} />
                </div>
                <div style={{ fontSize: 9, color: T.muted, textAlign: 'center', whiteSpace: 'nowrap' }}>{d.label}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Activité récente */}
        <Card p={0} sx={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.bdr}`, fontWeight: 700, fontSize: 15, color: T.txt, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: T.purpleBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Ic n="history" s={14} c={T.purple} />
            </div>
            Activité récente
          </div>
          {history.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: T.muted, fontSize: 13 }}>Aucune activité</div>
          ) : (
            <div style={{ overflowY: 'auto', maxHeight: 280 }}>
              {history.map((h, i) => {
                const isAdd = h.action.includes('créé') || h.action.includes('ajouté') || h.action.includes('Import');
                const isDel = h.action.includes('supprimé');
                const isMod = h.action.includes('modifié');
                const bv = isDel ? 'red' : isAdd ? 'green' : isMod ? 'blue' : 'gray';
                return (
                  <div key={h.id} style={{ padding: '10px 20px', display: 'flex', alignItems: 'flex-start', gap: 10, borderBottom: i < history.length - 1 ? `1px solid ${T.bdr}` : 'none' }}>
                    <Avatar name={h.user_name} size={28} />
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

      {/* Row 2 : bases + alertes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18, marginBottom: 18 }}>

        {/* Bases table */}
        <Card p={0} sx={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${T.bdr}` }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: T.txt, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: T.blueBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Ic n="package" s={14} c={T.blue} />
              </div>
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
                  const inS   = b.items_en_stock || 0;
                  return (
                    <tr key={b.id} onClick={() => onSelectBase(b.id)} style={{ cursor: 'pointer', borderBottom: `1px solid ${T.bdr}` }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 9, background: T.greenBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Ic n="building" s={13} c={T.green} />
                          </div>
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
                        <span style={{ color: T.brand, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Ouvrir →</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>

        {/* Alertes stock bas */}
        <Card p={0} sx={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.bdr}`, fontWeight: 700, fontSize: 15, color: T.txt, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: T.orangeBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Ic n="bell" s={14} c={T.orange} />
            </div>
            Alertes stock bas
            {alerts.length > 0 && <Badge v="orange" sm>{alerts.length}</Badge>}
          </div>
          {alerts.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: T.muted, fontSize: 13 }}>
              <Ic n="check" s={32} c={T.green} />
              <div style={{ marginTop: 10, fontWeight: 600, color: T.green }}>Tout est en ordre</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Aucun article sous le seuil</div>
            </div>
          ) : (
            <div style={{ overflowY: 'auto', maxHeight: 280 }}>
              {alerts.slice(0, 6).map(item => (
                <div key={item.id} onClick={() => onSelectBase(item.base_id)}
                  style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${T.bdr}`, cursor: 'pointer' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.orange, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: T.txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.designation}</div>
                    <div style={{ fontSize: 11, color: T.muted }}>{item.base_name} · Qté: {item.quantite} / Seuil: {item.seuil}</div>
                  </div>
                  <Badge v="red" sm dot>{item.quantite}</Badge>
                </div>
              ))}
              {alerts.length > 6 && (
                <div style={{ padding: '10px 16px', fontSize: 12, color: T.muted, textAlign: 'center' }}>
                  + {alerts.length - 6} autres alertes
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
