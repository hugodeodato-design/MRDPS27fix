// src/components/views/HistoryView.jsx
import { useState, useEffect, useCallback } from 'react';
import { T, formatDate } from '../../utils/theme.js';
import { Ic, Card, Badge, Avatar } from '../ui/index.jsx';
import { api } from '../../utils/api.js';

export default function HistoryView({ user, bases }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [baseFilter, setBaseFilter] = useState('');
  const [offset, setOffset] = useState(0);
  const LIMIT = 50;

  const load = useCallback(async () => {
    const params = { limit: LIMIT, offset };
    if (search) params.search = search;
    if (baseFilter) params.base_id = baseFilter;
    const data = await api.getHistory(params);
    setRows(data.rows || []);
    setTotal(data.total || 0);
  }, [search, baseFilter, offset]);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: T.txt }}>Historique</div>
        <div style={{ fontSize: 13, color: T.muted, marginTop: 2 }}>{total} actions enregistrées</div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Ic n="search" s={14} c={T.muted} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setOffset(0); }} placeholder="Rechercher dans l'historique…"
            style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: 9, border: `1.5px solid ${T.bdr}`, background: T.surface2, color: T.txt, fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
        </div>
        {bases.length > 1 && (
          <select value={baseFilter} onChange={e => { setBaseFilter(e.target.value); setOffset(0); }}
            style={{ padding: '8px 12px', borderRadius: 9, border: `1.5px solid ${T.bdr}`, background: T.surface2, color: T.txt, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}>
            <option value="">Toutes les bases</option>
            {bases.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
      </div>

      <Card p={0} sx={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            {['Date', 'Utilisateur', 'Action', 'Détail', 'IP'].map(h => (
              <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: .8, background: T.surface2, borderBottom: `2px solid ${T.bdr}` }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 60, color: T.muted }}>Aucune entrée</td></tr>
            )}
            {rows.map((h, i) => {
              const isAdd = h.action.includes('créé') || h.action.includes('ajouté') || h.action.includes('Import') || h.action.includes('Connexion');
              const isDel = h.action.includes('supprimé') || h.action.includes('désactivé');
              const bv = isDel ? 'red' : isAdd ? 'green' : 'blue';
              return (
                <tr key={h.id} style={{ borderBottom: `1px solid ${T.bdr}` }}>
                  <td style={{ padding: '11px 16px', fontSize: 11, color: T.muted, whiteSpace: 'nowrap' }}>
                    {h.created_at ? new Date(h.created_at).toLocaleString('fr-FR') : '—'}
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar name={h.user_name} size={26} />
                      <span style={{ fontSize: 13, fontWeight: 500, color: T.txt }}>{h.user_name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '11px 16px' }}><Badge v={bv} sm>{h.action}</Badge></td>
                  <td style={{ padding: '11px 16px', fontSize: 12, color: T.muted, maxWidth: 280 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{h.detail || '—'}</span>
                  </td>
                  <td style={{ padding: '11px 16px', fontSize: 11, color: T.muted }}>{h.ip_address || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {total > LIMIT && (
          <div style={{ padding: '12px 16px', borderTop: `1px solid ${T.bdr}`, display: 'flex', gap: 10, alignItems: 'center', background: T.surface2 }}>
            <span style={{ fontSize: 12, color: T.muted, flex: 1 }}>Page {Math.floor(offset / LIMIT) + 1} / {Math.ceil(total / LIMIT)}</span>
            <button onClick={() => setOffset(Math.max(0, offset - LIMIT))} disabled={offset === 0} style={{ padding: '5px 12px', borderRadius: 7, border: `1px solid ${T.bdr}`, background: T.surface2, color: T.txt, cursor: offset === 0 ? 'not-allowed' : 'pointer', opacity: offset === 0 ? .4 : 1, fontSize: 12, fontFamily: 'inherit' }}>← Préc.</button>
            <button onClick={() => setOffset(offset + LIMIT)} disabled={offset + LIMIT >= total} style={{ padding: '5px 12px', borderRadius: 7, border: `1px solid ${T.bdr}`, background: T.surface2, color: T.txt, cursor: offset + LIMIT >= total ? 'not-allowed' : 'pointer', opacity: offset + LIMIT >= total ? .4 : 1, fontSize: 12, fontFamily: 'inherit' }}>Suiv. →</button>
          </div>
        )}
      </Card>
    </div>
  );
}
