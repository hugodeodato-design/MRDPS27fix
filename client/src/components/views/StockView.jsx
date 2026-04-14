// src/components/views/StockView.jsx
import { useState, useEffect, useCallback } from 'react';
import { T, formatDate, today, DEFAULT_COLS } from '../../utils/theme.js';
import { Ic, Btn, Card, Badge, EtatBadge, Field, Inp, Sel, Modal, toast } from '../ui/index.jsx';
import { api, downloadBlob } from '../../utils/api.js';
import * as XLSX from 'xlsx';

export default function StockView({ baseId, user, bases, onRefreshBases, onRefreshAlerts, onSelectBase }) {
  const [base, setBase] = useState(null);
  const [items, setItems] = useState([]);
  const [columns, setColumns] = useState(DEFAULT_COLS);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCat, setFilterCat] = useState('all');
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const isViewer = user.role === 'viewer';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [b, it, cols] = await Promise.all([
        api.getBases().then(bs => bs.find(b => b.id === baseId)),
        api.getItems(baseId),
        api.getColumns(baseId),
      ]);
      setBase(b);
      setItems(it);
      if (cols?.length) setColumns(cols);
    } catch (e) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  }, [baseId]);

  useEffect(() => { load(); }, [load]);

  const categories = [...new Set(items.map(i => i.categorie).filter(Boolean))].sort();

  const filtered = items.filter(item => {
    if (filterStatus === 'in' && item.etat !== 'en_stock') return false;
    if (filterStatus === 'out' && item.etat === 'en_stock') return false;
    if (filterCat !== 'all' && item.categorie !== filterCat) return false;
    if (search) {
      const s = search.toLowerCase();
      return [item.reference, item.designation, item.categorie, item.emplacement, item.autres_infos]
        .some(v => v?.toLowerCase().includes(s));
    }
    return true;
  });

  const statsIn = items.filter(i => i.etat === 'en_stock').length;
  const statsOut = items.filter(i => i.etat === 'sorti').length;
  const lowStock = items.filter(i => i.etat === 'en_stock' && i.seuil > 0 && i.quantite <= i.seuil);

  const visibleCols = columns.filter(c => c.visible !== false);

  const handleDelete = async (id, label) => {
    if (!confirm(`Supprimer "${label}" ? Action irréversible.`)) return;
    try {
      await api.deleteItem(id);
      await load();
      await onRefreshAlerts();
      toast('Article supprimé');
    } catch (e) { toast(e.message, 'error'); }
  };

  const handleExport = async () => {
    try {
      const blob = await api.exportBase(baseId);
      downloadBlob(blob, `MRDPSTOCK_${base?.name}_${today()}.xlsx`);
    } catch (e) { toast(e.message, 'error'); }
  };

  const handleRename = async () => {
    const name = prompt('Nouveau nom de la base :', base?.name);
    if (!name?.trim() || name === base?.name) return;
    try {
      await api.updateBase(baseId, name.trim());
      await onRefreshBases();
      await load();
      toast('Base renommée');
    } catch (e) { toast(e.message, 'error'); }
  };

  const handleDeleteBase = async () => {
    if (!confirm(`Supprimer la base "${base?.name}" et TOUS ses articles ? Action irréversible.`)) return;
    try {
      await api.deleteBase(baseId);
      await onRefreshBases();
      toast('Base supprimée');
    } catch (e) { toast(e.message, 'error'); }
  };

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, height: '100%' }}><div style={{ width: 32, height: 32, border: `3px solid rgba(0,135,90,.2)`, borderTopColor: T.brand, borderRadius: '50%', animation: 'spin .8s linear infinite' }} /></div>;

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 42, height: 42, borderRadius: 11, background: T.greenBg, border: `1px solid ${T.greenBdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Ic n="building" s={20} c={T.brand} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.txt }}>{base?.name}</div>
          <div style={{ fontSize: 12, color: T.muted }}>{items.length} article{items.length > 1 ? 's' : ''} au total</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {!isViewer && (
            <>
              <Btn v="secondary" size="sm" onClick={() => setModal({ type: 'import' })}>
                <Ic n="upload" s={13} />Import Excel
              </Btn>
              <Btn v="secondary" size="sm" onClick={handleExport}>
                <Ic n="download" s={13} />Exporter
              </Btn>
              <Btn v="secondary" size="sm" onClick={handleRename}><Ic n="edit" s={13} />Renommer</Btn>
              <Btn onClick={() => setModal({ type: 'itemForm', data: {} })}>
                <Ic n="plus" s={13} />Ajouter
              </Btn>
            </>
          )}
          {user.role === 'admin' && (
            <Btn v="danger" size="sm" onClick={handleDeleteBase}><Ic n="trash" s={13} /></Btn>
          )}
        </div>
      </div>

      {/* Mini KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {[
          { l: 'Total', v: items.length, icon: 'grid', c: T.blue, bg: T.blueBg, bdr: T.blueBdr },
          { l: 'En stock', v: statsIn, icon: 'check', c: T.green, bg: T.greenBg, bdr: T.greenBdr },
          { l: 'Sortis', v: statsOut, icon: 'arrowDown', c: T.red, bg: T.redBg, bdr: T.redBdr },
          { l: 'Alertes', v: lowStock.length, icon: 'bell', c: T.orange, bg: T.orangeBg, bdr: T.orangeBdr },
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

      {/* Alert banner */}
      {lowStock.length > 0 && (
        <div style={{ background: T.orangeBg, border: `1px solid ${T.orangeBdr}`, borderRadius: 10, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Ic n="alert" s={14} c={T.orange} />
          <span style={{ fontSize: 13, fontWeight: 600, color: T.orange }}>{lowStock.length} article{lowStock.length > 1 ? 's' : ''} en dessous du seuil d'alerte</span>
          {lowStock.slice(0, 3).map(i => <Badge key={i.id} v="orange" sm>{i.designation} ({i.quantite})</Badge>)}
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Ic n="search" s={14} c={T.muted} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
            style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: 9, border: `1.5px solid ${T.bdr}`, background: T.surface2, color: T.txt, fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', background: T.surface2, border: `1px solid ${T.bdr}`, borderRadius: 10, padding: 3, gap: 2 }}>
          {[{ v: 'all', l: 'Tous', cnt: items.length }, { v: 'in', l: 'En stock', cnt: statsIn }, { v: 'out', l: 'Sortis', cnt: statsOut }].map(f => (
            <button key={f.v} onClick={() => setFilterStatus(f.v)}
              style={{ padding: '5px 12px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: filterStatus === f.v ? 700 : 500, background: filterStatus === f.v ? (f.v === 'out' ? T.redBg : T.greenBg) : 'transparent', color: filterStatus === f.v ? (f.v === 'out' ? T.red : T.green) : T.muted, fontFamily: 'inherit', gap: 5, display: 'flex', alignItems: 'center' }}>
              {f.l}<span style={{ fontSize: 10, background: T.bdr, color: T.muted, borderRadius: 8, padding: '1px 5px' }}>{f.cnt}</span>
            </button>
          ))}
        </div>
        {categories.length > 0 && (
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
            style={{ padding: '7px 12px', borderRadius: 9, border: `1.5px solid ${T.bdr}`, background: T.surface2, color: T.txt, fontSize: 12, fontFamily: 'inherit', outline: 'none' }}>
            <option value="all">Toutes catégories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>

      {/* Table */}
      <Card p={0} sx={{ overflow: 'hidden', flex: 1 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 650 }}>
            <thead>
              <tr>
                {visibleCols.map(col => (
                  <th key={col.k} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: .8, background: T.surface2, borderBottom: `2px solid ${T.bdr}`, whiteSpace: 'nowrap' }}>{col.l}</th>
                ))}
                {!isViewer && <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: 10, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: .8, background: T.surface2, borderBottom: `2px solid ${T.bdr}` }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={visibleCols.length + 1} style={{ textAlign: 'center', padding: 72, color: T.muted }}>
                  <Ic n="search" s={36} c={T.bdr} />
                  <div style={{ fontWeight: 600, color: T.muted, marginTop: 12, marginBottom: 4 }}>{items.length === 0 ? 'Aucun article' : 'Aucun résultat'}</div>
                  <div style={{ fontSize: 12 }}>{items.length === 0 ? 'Ajoutez votre premier article ou importez un fichier Excel' : 'Modifiez vos filtres'}</div>
                  {items.length === 0 && !isViewer && <div style={{ marginTop: 16 }}><Btn onClick={() => setModal({ type: 'itemForm', data: {} })}><Ic n="plus" s={13} />Ajouter</Btn></div>}
                </td></tr>
              )}
              {filtered.map(item => {
                const isLow = item.etat === 'en_stock' && item.seuil > 0 && item.quantite <= item.seuil;
                return (
                  <tr key={item.id} style={{ background: isLow ? 'rgba(255,139,0,.04)' : undefined, borderBottom: `1px solid ${T.bdr}` }}>
                    {visibleCols.map(col => (
                      <td key={col.k} style={{ padding: '11px 14px', fontSize: 13, color: T.txt, verticalAlign: 'middle' }}>
                        {col.k === 'reference' ? (
                          <span style={{ fontWeight: 700, color: T.brand }}>{item.reference || '—'}</span>
                        ) : col.k === 'designation' ? (
                          <span style={{ fontWeight: 600 }}>{item.designation || '—'}</span>
                        ) : col.k === 'quantite' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: item.etat === 'en_stock' ? T.green : T.red, flexShrink: 0 }} />
                            <span style={{ fontWeight: 700, fontSize: 14, color: isLow ? T.orange : T.txt }}>{item.quantite ?? 0}</span>
                            {isLow && <Ic n="alert" s={12} c={T.orange} />}
                          </span>
                        ) : col.k === 'etat' ? (
                          <EtatBadge etat={item.etat} />
                        ) : col.k === 'date_entree' || col.k === 'date_sortie' ? (
                          <span style={{ fontSize: 12, color: T.muted }}>{formatDate(item[col.k])}</span>
                        ) : (
                          <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', color: item[col.k] ? T.txt : T.muted }}>{item[col.k] || '—'}</span>
                        )}
                      </td>
                    ))}
                    {!isViewer && (
                      <td style={{ padding: '11px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
                          <button onClick={() => setModal({ type: 'itemForm', data: { item: { ...item }, editId: item.id } })}
                            style={{ background: T.blueBg, border: `1px solid ${T.blueBdr}`, cursor: 'pointer', color: T.blue, padding: '5px 8px', borderRadius: 7 }} title="Modifier">
                            <Ic n="edit" s={13} />
                          </button>
                          <button onClick={() => handleDelete(item.id, item.designation)}
                            style={{ background: T.redBg, border: `1px solid ${T.redBdr}`, cursor: 'pointer', color: T.red, padding: '5px 8px', borderRadius: 7 }} title="Supprimer">
                            <Ic n="trash" s={13} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div style={{ padding: '10px 16px', borderTop: `1px solid ${T.bdr}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: T.surface2 }}>
            <span style={{ fontSize: 12, color: T.muted }}>{filtered.length} article{filtered.length > 1 ? 's' : ''} affiché{filtered.length > 1 ? 's' : ''}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <Badge v="green" dot sm>{statsIn} en stock</Badge>
              <Badge v="red" dot sm>{statsOut} sortis</Badge>
            </div>
          </div>
        )}
      </Card>

      {/* Modals */}
      {modal?.type === 'itemForm' && (
        <ItemFormModal data={modal.data} baseId={baseId}
          onClose={() => setModal(null)}
          onSave={async () => { setModal(null); await load(); await onRefreshAlerts(); }} />
      )}
      {modal?.type === 'import' && (
        <ImportModal baseId={baseId} onClose={() => setModal(null)}
          onSave={async () => { setModal(null); await load(); await onRefreshAlerts(); }} />
      )}
    </div>
  );
}

// ─── Modal formulaire article ─────────────────────────────────────────────────
function ItemFormModal({ data, baseId, onClose, onSave }) {
  const { item, editId } = data;
  const [form, setForm] = useState(item ? { ...item } : {
    reference: '', designation: '', categorie: '', emplacement: '',
    quantite: '1', seuil: '0', etat: 'en_stock',
    date_entree: today(), date_sortie: '', autres_infos: '', photo: '',
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.reference?.trim() || !form.designation?.trim()) {
      setErr('Référence et désignation requises'); return;
    }
    setLoading(true);
    try {
      const payload = { ...form, base_id: baseId, quantite: parseInt(form.quantite) || 0, seuil: parseInt(form.seuil) || 0 };
      if (editId) await api.updateItem(editId, payload);
      else await api.createItem(payload);
      await onSave();
      toast(editId ? 'Article modifié' : 'Article ajouté');
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  };

  return (
    <Modal title={editId ? 'Modifier l\'article' : 'Nouvel article'}
      icon={<div style={{ width: 46, height: 46, borderRadius: 13, background: T.greenBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic n="package" s={20} c={T.brand} /></div>}
      onClose={onClose} wide
      footer={<><Btn v="ghost" onClick={onClose}>Annuler</Btn><Btn onClick={handleSubmit} disabled={loading}>{loading ? 'Enregistrement…' : editId ? 'Enregistrer' : 'Ajouter'}</Btn></>}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="Référence" required><Inp value={form.reference} onChange={e => set('reference', e.target.value)} autoFocus /></Field>
        <Field label="Désignation" required><Inp value={form.designation} onChange={e => set('designation', e.target.value)} /></Field>
        <Field label="Catégorie"><Inp value={form.categorie} onChange={e => set('categorie', e.target.value)} /></Field>
        <Field label="Emplacement"><Inp value={form.emplacement} onChange={e => set('emplacement', e.target.value)} /></Field>
        <Field label="Quantité"><Inp type="number" min="0" value={form.quantite} onChange={e => set('quantite', e.target.value)} /></Field>
        <Field label="Seuil d'alerte"><Inp type="number" min="0" value={form.seuil} onChange={e => set('seuil', e.target.value)} /></Field>
        <Field label="État">
          <Sel value={form.etat} onChange={e => set('etat', e.target.value)}>
            <option value="en_stock">En stock</option>
            <option value="sorti">Sorti</option>
            <option value="maintenance">Maintenance</option>
            <option value="rebut">Rebut</option>
          </Sel>
        </Field>
        <Field label="Date d'entrée"><Inp type="date" value={form.date_entree} onChange={e => set('date_entree', e.target.value)} /></Field>
        <Field label="Date de sortie"><Inp type="date" value={form.date_sortie || ''} onChange={e => set('date_sortie', e.target.value)} /></Field>
        <Field label="Informations complémentaires" row><Inp as="textarea" value={form.autres_infos} onChange={e => set('autres_infos', e.target.value)} /></Field>
      </div>
      {err && <div style={{ marginTop: 12, fontSize: 13, color: T.red, display: 'flex', alignItems: 'center', gap: 6 }}><Ic n="alert" s={13} c={T.red} />{err}</div>}
    </Modal>
  );
}

// ─── Modal import Excel ───────────────────────────────────────────────────────
function ImportModal({ baseId, onClose, onSave }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
        const header = rows[0]?.map(h => String(h).trim().toLowerCase()) || [];
        const data = rows.slice(1).filter(r => r.some(Boolean)).map(row => ({
          reference:   row[header.indexOf('référence')] ?? row[header.indexOf('reference')] ?? row[0] ?? '',
          designation: row[header.indexOf('désignation')] ?? row[header.indexOf('designation')] ?? row[1] ?? '',
          categorie:   row[header.indexOf('catégorie')] ?? row[header.indexOf('categorie')] ?? row[2] ?? '',
          emplacement: row[header.indexOf('emplacement')] ?? row[3] ?? '',
          quantite:    parseInt(row[header.indexOf('quantité')] ?? row[header.indexOf('quantite')] ?? row[4]) || 0,
          seuil:       parseInt(row[header.indexOf('seuil')] ?? row[5]) || 0,
          etat:        row[header.indexOf('état')] ?? row[header.indexOf('etat')] ?? 'en_stock',
        }));
        setPreview(data);
        setErr('');
      } catch (e) { setErr('Impossible de lire ce fichier'); }
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    if (!preview?.length) return;
    setLoading(true);
    try {
      const result = await api.bulkImport(baseId, preview);
      await onSave();
      toast(`${result.count} articles importés`);
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  };

  return (
    <Modal title="Import Excel" onClose={onClose} wide
      footer={<><Btn v="ghost" onClick={onClose}>Annuler</Btn>{preview && <Btn onClick={handleImport} disabled={loading}>{loading ? 'Import…' : `Importer ${preview.length} articles`}</Btn>}</>}>
      <div>
        <div style={{ background: T.surface2, border: `1px solid ${T.bdr}`, borderRadius: 10, padding: 16, marginBottom: 16, fontSize: 12, color: T.muted, lineHeight: 1.7 }}>
          <strong style={{ color: T.txt }}>Format attendu (colonnes) :</strong><br />
          Référence · Désignation · Catégorie · Emplacement · Quantité · Seuil · État
        </div>
        <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile}
          style={{ display: 'block', marginBottom: 16, color: T.txt }} />
        {err && <div style={{ color: T.red, fontSize: 13, marginBottom: 12 }}>{err}</div>}
        {preview && (
          <div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 8 }}>{preview.length} articles détectés (aperçu des 5 premiers) :</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr>{['Référence', 'Désignation', 'Qté', 'État'].map(h => <th key={h} style={{ padding: '6px 10px', background: T.surface2, color: T.muted, fontWeight: 600, textAlign: 'left', borderBottom: `1px solid ${T.bdr}` }}>{h}</th>)}</tr></thead>
                <tbody>{preview.slice(0, 5).map((r, i) => (
                  <tr key={i}><td style={{ padding: '6px 10px', color: T.txt, borderBottom: `1px solid ${T.bdr}` }}>{r.reference}</td><td style={{ padding: '6px 10px', color: T.txt, borderBottom: `1px solid ${T.bdr}` }}>{r.designation}</td><td style={{ padding: '6px 10px', color: T.txt, borderBottom: `1px solid ${T.bdr}` }}>{r.quantite}</td><td style={{ padding: '6px 10px', borderBottom: `1px solid ${T.bdr}` }}><EtatBadge etat={r.etat} /></td></tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
