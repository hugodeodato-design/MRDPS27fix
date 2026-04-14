// ClientStockView.jsx — Vue lecture seule pour les clients externes
// Pas de sidebar, pas de boutons d'action, pas d'accès aux paramètres.
import { useState, useEffect, useCallback } from 'react';
import { T, DEFAULT_COLS } from '../../utils/theme.js';
import { Ic, Badge, EtatBadge } from '../ui/index.jsx';
import { api } from '../../utils/api.js';

const LOGO_B64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAAA";

function Avatar({ name = '?', color = '#00875A', size = 34 }) {
  const initials = name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: size * 0.36, flexShrink: 0,
      border: '2px solid rgba(255,255,255,.15)',
    }}>{initials}</div>
  );
}

function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, height: '100%', padding: 60 }}>
      <div style={{ width: 36, height: 36, border: `3px solid rgba(0,135,90,.15)`, borderTopColor: T.brand, borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
    </div>
  );
}

export default function ClientStockView({ user, onLogout }) {
  const [base, setBase]       = useState(null);
  const [items, setItems]     = useState([]);
  const [columns, setColumns] = useState(DEFAULT_COLS);
  const [search, setSearch]   = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCat, setFilterCat]       = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const baseId = user?.client_base_id;

  const load = useCallback(async () => {
    if (!baseId) { setError("Aucune base n'est associée à ce compte. Contactez votre administrateur."); setLoading(false); return; }
    setLoading(true);
    try {
      const [bases, it, cols] = await Promise.all([
        api.getBases(),
        api.getItems(baseId),
        api.getColumns(baseId),
      ]);
      setBase(bases.find(b => b.id === baseId) || null);
      setItems(it);
      if (cols?.length) setColumns(cols);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [baseId]);

  useEffect(() => { load(); }, [load]);

  const visibleCols  = columns.filter(c => c.visible !== false);
  const categories   = [...new Set(items.map(i => i.categorie).filter(Boolean))].sort();
  const statsIn      = items.filter(i => i.etat === 'en_stock').length;
  const statsOut     = items.filter(i => i.etat === 'sorti').length;
  const lowStock     = items.filter(i => i.etat === 'en_stock' && i.seuil > 0 && i.quantite <= i.seuil);

  const filtered = items.filter(item => {
    if (filterStatus === 'in'  && item.etat !== 'en_stock') return false;
    if (filterStatus === 'out' && item.etat === 'en_stock')  return false;
    if (filterCat !== 'all' && item.categorie !== filterCat) return false;
    if (search) {
      const s = search.toLowerCase();
      return [item.reference, item.designation, item.categorie, item.emplacement]
        .some(v => v?.toLowerCase().includes(s));
    }
    return true;
  });

  const cellValue = (item, col) => {
    const v = item[col.k];
    if (col.k === 'etat') return <EtatBadge etat={v} />;
    if (col.k === 'quantite') {
      const low = item.seuil > 0 && item.etat === 'en_stock' && item.quantite <= item.seuil;
      return (
        <span style={{ fontWeight: 700, color: low ? T.orange : T.txt }}>
          {v ?? 0}
          {low && <Ic n="alert" s={11} c={T.orange} style={{ marginLeft: 4 }} />}
        </span>
      );
    }
    if (col.k === 'date_entree' || col.k === 'date_sortie') return v ? v.slice(0, 10) : '—';
    return v || '—';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: T.bg, fontFamily: "'DM Sans', system-ui, sans-serif", color: T.txt, overflow: 'hidden' }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:#f1f5f9}::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px}
        input,select,button{font-family:inherit}
        .crow:hover td{background:#F5F8FF!important}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        input:focus,select:focus{border-color:${T.brand}!important;box-shadow:0 0 0 3px ${T.greenBg}!important;outline:none!important}
      `}</style>

      {/* ── TOPBAR ── */}
      <div style={{ background: T.side, borderBottom: '1px solid rgba(255,255,255,.06)', padding: '0 24px', height: 62, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: T.greenBg, border: `1px solid ${T.greenBdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Ic n="package" s={17} c={T.brand} />
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>MRDPSTOCK</div>
            <div style={{ color: 'rgba(255,255,255,.3)', fontSize: 9, letterSpacing: 2.5, textTransform: 'uppercase' }}>Vue client</div>
          </div>
          {base && (
            <>
              <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,.08)', margin: '0 4px' }} />
              <div>
                <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{base.name}</div>
                <div style={{ color: 'rgba(255,255,255,.3)', fontSize: 11 }}>{items.length} article{items.length > 1 ? 's' : ''}</div>
              </div>
            </>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar name={user?.name} color={user?.color} size={32} />
          <div style={{ display: 'none' }}><div style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>{user?.name}</div></div>
          <div style={{ color: 'rgba(255,255,255,.3)', fontSize: 10, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 6, padding: '2px 8px' }}>Lecture seule</div>
          <button onClick={onLogout}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(220,38,38,.3)', background: 'rgba(220,38,38,.08)', color: '#f87171', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
            <Ic n="logout" s={13} c="#f87171" />Déconnexion
          </button>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 18, animation: 'fadeUp .2s ease' }}>

        {loading && <Spinner />}

        {!loading && error && (
          <div style={{ background: T.redBg, border: `1px solid ${T.redBdr}`, borderRadius: 12, padding: '20px 24px', color: T.red, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Ic n="alert" s={20} c={T.red} />
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Erreur de chargement</div>
              <div style={{ fontSize: 13 }}>{error}</div>
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
              {[
                { l: 'Total',    v: items.length,    icon: 'grid',     c: T.blue,   bg: T.blueBg,   bdr: T.blueBdr   },
                { l: 'En stock', v: statsIn,          icon: 'check',    c: T.green,  bg: T.greenBg,  bdr: T.greenBdr  },
                { l: 'Sortis',   v: statsOut,         icon: 'arrowDown',c: T.red,    bg: T.redBg,    bdr: T.redBdr    },
                { l: 'Alertes',  v: lowStock.length,  icon: 'bell',     c: T.orange, bg: T.orangeBg, bdr: T.orangeBdr },
              ].map(s => (
                <div key={s.l} style={{ background: T.surface, border: `1px solid ${T.bdr}`, borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: s.bg, border: `1px solid ${s.bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Ic n={s.icon} s={16} c={s.c} />
                  </div>
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: T.txt, lineHeight: 1 }}>{s.v}</div>
                    <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{s.l}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bannière alertes stock bas */}
            {lowStock.length > 0 && (
              <div style={{ background: T.orangeBg, border: `1px solid ${T.orangeBdr}`, borderRadius: 10, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <Ic n="alert" s={14} c={T.orange} />
                <span style={{ fontSize: 13, fontWeight: 600, color: T.orange }}>{lowStock.length} article{lowStock.length > 1 ? 's' : ''} en dessous du seuil d'alerte</span>
                {lowStock.slice(0, 4).map(i => (
                  <span key={i.id} style={{ fontSize: 11, background: T.orangeBg, border: `1px solid ${T.orangeBdr}`, color: T.orange, borderRadius: 6, padding: '2px 8px', fontWeight: 600 }}>
                    {i.designation} ({i.quantite})
                  </span>
                ))}
              </div>
            )}

            {/* Barre de recherche + filtres */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                  <Ic n="search" s={14} c={T.muted} />
                </span>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
                  style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: 9, border: `1.5px solid ${T.bdr}`, background: T.surface, color: T.txt, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', background: T.surface, border: `1px solid ${T.bdr}`, borderRadius: 10, padding: 3, gap: 2 }}>
                {[{ v: 'all', l: 'Tous', cnt: items.length }, { v: 'in', l: 'En stock', cnt: statsIn }, { v: 'out', l: 'Sortis', cnt: statsOut }].map(f => (
                  <button key={f.v} onClick={() => setFilterStatus(f.v)}
                    style={{ padding: '5px 12px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: filterStatus === f.v ? 700 : 500, background: filterStatus === f.v ? (f.v === 'out' ? T.redBg : T.greenBg) : 'transparent', color: filterStatus === f.v ? (f.v === 'out' ? T.red : T.green) : T.muted, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
                    {f.l}<span style={{ fontSize: 10, background: T.bdr, color: T.muted, borderRadius: 8, padding: '1px 5px' }}>{f.cnt}</span>
                  </button>
                ))}
              </div>
              {categories.length > 0 && (
                <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
                  style={{ padding: '7px 12px', borderRadius: 9, border: `1.5px solid ${T.bdr}`, background: T.surface, color: T.txt, fontSize: 12, fontFamily: 'inherit', outline: 'none' }}>
                  <option value="all">Toutes catégories</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
              <div style={{ fontSize: 12, color: T.muted, padding: '6px 12px', background: T.surface, border: `1px solid ${T.bdr}`, borderRadius: 9 }}>
                {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
              </div>
            </div>

            {/* Tableau */}
            <div style={{ background: T.surface, border: `1px solid ${T.bdr}`, borderRadius: 14, overflow: 'hidden', flex: 1 }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                  <thead>
                    <tr>
                      {visibleCols.map(col => (
                        <th key={col.k} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: .8, background: T.surface2 || '#F8FAFC', borderBottom: `2px solid ${T.bdr}`, whiteSpace: 'nowrap' }}>
                          {col.l}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={visibleCols.length} style={{ textAlign: 'center', padding: 60, color: T.muted }}>
                          <div style={{ marginBottom: 8 }}><Ic n="search" s={32} c={T.bdr} /></div>
                          <div style={{ fontWeight: 600, marginBottom: 4 }}>{items.length === 0 ? 'Aucun article dans cette base' : 'Aucun résultat'}</div>
                          <div style={{ fontSize: 12 }}>{items.length > 0 ? 'Modifiez vos filtres' : ''}</div>
                        </td>
                      </tr>
                    ) : filtered.map((item, idx) => (
                      <tr key={item.id} className="crow" style={{ background: idx % 2 === 0 ? '#fff' : T.surface, transition: 'background .1s' }}>
                        {visibleCols.map(col => (
                          <td key={col.k} style={{ padding: '11px 14px', fontSize: 13, color: T.txt, borderBottom: `1px solid ${T.bdr}`, whiteSpace: col.k === 'designation' ? 'normal' : 'nowrap' }}>
                            {cellValue(item, col)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer discret */}
            <div style={{ textAlign: 'center', fontSize: 11, color: T.muted, paddingBottom: 8 }}>
              MRDPSTOCK — Accès client en lecture seule · Dernière mise à jour : {new Date().toLocaleString('fr-FR')}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
