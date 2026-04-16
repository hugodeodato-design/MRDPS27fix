// src/components/views/LabelsView.jsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import { T } from '../../utils/theme.js';
import { Ic, Btn, Card, toast } from '../ui/index.jsx';
import { api } from '../../utils/api.js';

export default function LabelsView({ bases }) {
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selBase, setSelBase]   = useState('all');
  const [selCat, setSelCat]     = useState('all');
  const [selItems, setSelItems] = useState(new Set());
  const [previewItem, setPreviewItem] = useState(null);

  const loadAll = useCallback(async () => {
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

  const filtered = useMemo(() => {
    let items = allItems;
    if (selBase !== 'all') items = items.filter(i => i._baseId === selBase);
    if (selCat !== 'all') items = items.filter(i => i.categorie === selCat);
    return items;
  }, [allItems, selBase, selCat]);

  const cats = useMemo(() => [...new Set(
    (selBase === 'all' ? allItems : allItems.filter(i => i._baseId === selBase))
      .map(i => i.categorie).filter(Boolean)
  )], [allItems, selBase]);

  const toggleSel  = id => setSelItems(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll  = () => setSelItems(s => s.size === filtered.length ? new Set() : new Set(filtered.map(i => i.id)));

  const printSelected = () => {
    const toprint = filtered.filter(i => selItems.has(i.id));
    if (!toprint.length) { toast('Sélectionnez au moins un article', 'error'); return; }
    const w = window.open('', '_blank');
    const labels = toprint.map(item => `
      <div class="label">
        <div class="ref">${item.reference || ''}</div>
        <div class="des">${item.designation || ''}</div>
        ${item.emplacement ? `<div class="sub">📍 ${item.emplacement}</div>` : ''}
        ${item.categorie   ? `<div class="sub">📂 ${item.categorie}</div>` : ''}
        <div class="qty">Qté: <strong>${item.quantite || 0}</strong></div>
        <div class="base">${item._baseName}</div>
        <div class="barcode">${item.reference || ''}</div>
        <div class="date">${new Date().toLocaleDateString('fr-FR')}</div>
      </div>
    `).join('');
    w.document.write(`<html><head><title>Étiquettes</title>
      <link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+128&display=swap" rel="stylesheet">
      <style>
        body{margin:0;padding:8px;font-family:Arial,sans-serif;}
        .page{display:flex;flex-wrap:wrap;gap:8px;}
        .label{border:1.5px solid #333;padding:10px 12px;width:180px;box-sizing:border-box;page-break-inside:avoid;}
        .ref{font-size:14px;font-weight:900;margin-bottom:2px;}
        .des{font-size:11px;font-weight:600;margin-bottom:3px;}
        .sub{font-size:9px;color:#666;margin:1px 0;}
        .qty{font-size:11px;margin-top:4px;}
        .base{font-size:9px;color:#888;margin-top:2px;}
        .barcode{font-family:'Libre Barcode 128',monospace;font-size:36px;margin:6px 0;letter-spacing:2px;overflow:hidden;}
        .date{font-size:8px;color:#aaa;}
        @media print{@page{margin:5mm;size:A4;}body{padding:0;}}
      </style></head>
      <body><div class="page">${labels}</div>
      <script>setTimeout(()=>{window.print();window.close();},1000);<\/script></body></html>`);
    w.document.close();
  };

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: T.txt }}>Étiquettes & QR</div>
        <div style={{ fontSize: 13, color: T.muted, marginTop: 2 }}>Sélectionnez des articles pour imprimer leurs étiquettes</div>
      </div>

      {/* Filtres + actions */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={selBase} onChange={e => { setSelBase(e.target.value); setSelItems(new Set()); }}
          style={{ padding: '9px 12px', borderRadius: 9, border: `1.5px solid ${T.bdr}`, background: T.surface, color: T.txt, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}>
          <option value="all">Toutes les bases</option>
          {bases.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        {cats.length > 0 && (
          <select value={selCat} onChange={e => { setSelCat(e.target.value); setSelItems(new Set()); }}
            style={{ padding: '9px 12px', borderRadius: 9, border: `1.5px solid ${T.bdr}`, background: T.surface, color: T.txt, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}>
            <option value="all">Toutes les catégories</option>
            {cats.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {selItems.size > 0 && <span style={{ fontSize: 12, color: T.muted }}>{selItems.size} sélectionné{selItems.size > 1 ? 's' : ''}</span>}
          <Btn v="secondary" onClick={toggleAll}>{selItems.size === filtered.length ? 'Désélect. tout' : 'Sélect. tout'}</Btn>
          <Btn onClick={printSelected} disabled={selItems.size === 0}>
            <Ic n="printer" s={13} />Imprimer {selItems.size > 0 ? `(${selItems.size})` : 'sélection'}
          </Btn>
        </div>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 60, color: T.muted }}>Chargement des articles…</div>}

      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: T.muted }}>
          <Ic n="tag" s={48} c={T.bdr} />
          <div style={{ marginTop: 16 }}>Aucun article</div>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
          {filtered.map(item => {
            const sel = selItems.has(item.id);
            return (
              <div key={item.id} onClick={() => toggleSel(item.id)}
                style={{ border: `2px solid ${sel ? T.brand : T.bdr}`, borderRadius: 10, padding: 14, background: sel ? T.greenBg : T.surface, cursor: 'pointer', transition: 'all .15s', position: 'relative' }}>
                {sel && (
                  <div style={{ position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 10, background: T.brand, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Ic n="check" s={12} c="#fff" />
                  </div>
                )}
                <div style={{ fontWeight: 800, fontSize: 14, color: T.txt, marginBottom: 2 }}>{item.reference}</div>
                <div style={{ fontSize: 12, color: T.muted, marginBottom: 6, fontWeight: 500 }}>{item.designation}</div>
                {item.emplacement && <div style={{ fontSize: 10, color: T.muted }}>📍 {item.emplacement}</div>}
                {item.categorie   && <div style={{ fontSize: 10, color: T.muted }}>📂 {item.categorie}</div>}
                <div style={{ fontSize: 11, fontWeight: 700, color: T.green, marginTop: 6 }}>Qté: {item.quantite || 0}</div>
                <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>{item._baseName}</div>
                <div style={{ marginTop: 8 }}>
                  <button onClick={e => { e.stopPropagation(); setPreviewItem(item); }}
                    style={{ width: '100%', padding: 5, borderRadius: 6, border: `1px solid ${T.purpleBdr}`, background: T.purpleBg, color: T.purple, cursor: 'pointer', fontSize: 10, fontWeight: 600, fontFamily: 'inherit' }}>
                    🏷 Prévisualiser
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal prévisualisation */}
      {previewItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
          onClick={() => setPreviewItem(null)}>
          <div style={{ background: T.surface, borderRadius: 16, padding: 32, maxWidth: 320, width: '100%', boxShadow: T.xl }} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 800, fontSize: 16, color: T.txt, marginBottom: 4 }}>{previewItem.reference}</div>
            <div style={{ fontSize: 13, color: T.muted, marginBottom: 16 }}>{previewItem.designation}</div>
            <div style={{ fontFamily: "'Courier New', monospace", fontSize: 32, letterSpacing: 4, textAlign: 'center', padding: '12px 0', borderTop: `1px solid ${T.bdr}`, borderBottom: `1px solid ${T.bdr}`, marginBottom: 12, color: T.txt }}>
              {previewItem.reference}
            </div>
            {previewItem.emplacement && <div style={{ fontSize: 12, color: T.muted }}>📍 {previewItem.emplacement}</div>}
            {previewItem.categorie   && <div style={{ fontSize: 12, color: T.muted }}>📂 {previewItem.categorie}</div>}
            <div style={{ fontSize: 12, fontWeight: 700, color: T.green, marginTop: 8 }}>Qté: {previewItem.quantite || 0}</div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>{previewItem._baseName} · {new Date().toLocaleDateString('fr-FR')}</div>
            <Btn v="ghost" onClick={() => setPreviewItem(null)} sx={{ marginTop: 16, width: '100%', justifyContent: 'center' }}>Fermer</Btn>
          </div>
        </div>
      )}
    </div>
  );
}
