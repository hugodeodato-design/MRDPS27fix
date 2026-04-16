// src/components/views/GlobalSearchView.jsx
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { T } from '../../utils/theme.js';
import { Ic, Card, Badge, EtatBadge, toast } from '../ui/index.jsx';
import { api } from '../../utils/api.js';

export default function GlobalSearchView({ bases, onSelectBase }) {
  const [q, setQ]           = useState('');
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading]   = useState(false);
  const inputRef = useRef();

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Charger tous les articles de toutes les bases
  const loadAll = useCallback(async () => {
    if (bases.length === 0) return;
    setLoading(true);
    try {
      const results = await Promise.all(
        bases.map(b => api.getItems(b.id).then(items =>
          (Array.isArray(items) ? items : []).map(i => ({ ...i, _baseName: b.name, _baseId: b.id }))
        ).catch(() => []))
      );
      setAllItems(results.flat());
    } catch (e) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  }, [bases]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const results = useMemo(() => {
    if (q.length < 2) return [];
    const ql = q.toLowerCase();
    return allItems.filter(i =>
      [i.reference, i.designation, i.categorie, i.emplacement, i.autres_infos]
        .some(v => String(v || '').toLowerCase().includes(ql))
    );
  }, [q, allItems]);

  const grouped = useMemo(() => {
    const g = {};
    results.forEach(i => {
      if (!g[i._baseId]) g[i._baseId] = { name: i._baseName, items: [] };
      g[i._baseId].items.push(i);
    });
    return Object.entries(g);
  }, [results]);

  const hl = (txt) => {
    if (!q || q.length < 2) return txt || '—';
    const t = String(txt || '');
    const ql = q.toLowerCase();
    const i = t.toLowerCase().indexOf(ql);
    if (i < 0) return t || '—';
    return <>{t.slice(0, i)}<mark style={{ background: '#FFF3CD', color: '#856404', borderRadius: 3, padding: '0 2px' }}>{t.slice(i, i + ql.length)}</mark>{t.slice(i + ql.length)}</>;
  };

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      {/* Barre de recherche */}
      <div style={{ position: 'relative', marginBottom: 24 }}>
        <Ic n="search" s={18} c={T.muted} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
        <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
          placeholder="Rechercher une référence, désignation, catégorie, emplacement… (toutes bases)"
          style={{ width: '100%', padding: '14px 14px 14px 48px', borderRadius: 14, border: `2px solid ${q.length >= 2 ? T.brand : T.bdr}`, fontSize: 15, fontFamily: 'inherit', color: T.txt, outline: 'none', boxSizing: 'border-box', transition: 'border-color .2s', background: T.surface, boxShadow: T.md }} />
        {q && (
          <button onClick={() => setQ('')}
            style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: T.muted }}>
            <Ic n="x" s={16} />
          </button>
        )}
      </div>

      {/* État initial */}
      {q.length < 2 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: T.muted }}>
          <Ic n="search" s={48} c={T.bdr} />
          <div style={{ marginTop: 16, fontWeight: 600, color: T.txt, fontSize: 16 }}>Recherche multi-bases</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>
            {loading ? 'Chargement des articles…' : `Tapez au moins 2 caractères pour chercher dans ${bases.length} base${bases.length > 1 ? 's' : ''}`}
          </div>
        </div>
      )}

      {/* Aucun résultat */}
      {q.length >= 2 && results.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: T.muted }}>
          <Ic n="x" s={48} c={T.bdr} />
          <div style={{ marginTop: 16, fontWeight: 600, color: T.txt }}>Aucun résultat pour "{q}"</div>
        </div>
      )}

      {/* Résultats groupés par base */}
      {grouped.map(([baseId, g]) => (
        <div key={baseId} style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: T.greenBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Ic n="package" s={14} c={T.green} />
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, color: T.txt }}>{g.name}</div>
            <Badge v="blue" sm>{g.items.length} résultat{g.items.length > 1 ? 's' : ''}</Badge>
            <button onClick={() => onSelectBase(baseId)}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: T.brand, fontWeight: 600, fontSize: 12, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
              Ouvrir la base <Ic n="chevR" s={12} c={T.brand} />
            </button>
          </div>
          <Card p={0} sx={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                {['Référence', 'Désignation', 'Catégorie', 'Emplacement', 'Quantité', 'État'].map(h => (
                  <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: .8, background: T.surface2, borderBottom: `1px solid ${T.bdr}` }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {g.items.map(item => (
                  <tr key={item.id} style={{ borderBottom: `1px solid ${T.bdr}` }}>
                    <td style={{ padding: '11px 14px', fontWeight: 700, color: T.brand, fontSize: 13 }}>{hl(item.reference)}</td>
                    <td style={{ padding: '11px 14px', fontWeight: 600, color: T.txt }}>{hl(item.designation)}</td>
                    <td style={{ padding: '11px 14px', fontSize: 12, color: T.muted }}>{hl(item.categorie) || '—'}</td>
                    <td style={{ padding: '11px 14px', fontSize: 12, color: T.muted }}>{hl(item.emplacement) || '—'}</td>
                    <td style={{ padding: '11px 14px', fontWeight: 700, color: T.txt }}>{item.quantite || 0}</td>
                    <td style={{ padding: '11px 14px' }}><EtatBadge etat={item.etat} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      ))}

      {results.length > 0 && (
        <div style={{ textAlign: 'center', padding: '12px 0', color: T.muted, fontSize: 12 }}>
          {results.length} résultat{results.length > 1 ? 's' : ''} dans {grouped.length} base{grouped.length > 1 ? 's' : ''} — pour "{q}"
        </div>
      )}
    </div>
  );
}
