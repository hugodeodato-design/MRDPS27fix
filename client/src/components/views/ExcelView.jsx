// src/components/views/ExcelView.jsx
import { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { T } from '../../utils/theme.js';
import { toast } from '../ui/index.jsx';

const XL_GREEN  = '#217346';
const BORDER    = '#D0D7CE';
const HEADER_BG = '#E9F0EC';
const ROW_H     = 24;

const colLetter = i => {
  let s = '', n = i + 1;
  while (n > 0) { s = String.fromCharCode(64 + (n % 26 || 26)) + s; n = Math.floor((n - 1) / 26); }
  return s;
};

export default function ExcelView() {
  const [xlData, setXlData]         = useState(null);
  const [loading, setLoading]       = useState(false);
  const [editCell, setEditCell]     = useState(null);
  const [editVal, setEditVal]       = useState('');
  const [selectedCell, setSelectedCell] = useState(null);
  const [unsaved, setUnsaved]       = useState(false);
  const [scrollTop, setScrollTop]   = useState(0);
  const dropRef      = useRef();
  const xlRef        = useRef();
  const editInputRef = useRef();
  const bodyScrollRef = useRef();

  const loadFile = file => {
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const wb = XLSX.read(new Uint8Array(ev.target.result), { type: 'array', cellDates: false, cellNF: false, cellStyles: false });
        const sheets = wb.SheetNames.map(name => {
          const ws = wb.Sheets[name];
          if (!ws['!ref']) return { name, rows: [], colCount: 0, cw: [] };
          const range    = XLSX.utils.decode_range(ws['!ref']);
          const maxRow   = Math.min(range.e.r, 4999);
          const maxCol   = Math.min(range.e.c, 99);
          const colCount = maxCol - range.s.c + 1;
          const rawRows  = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', range: { s: range.s, e: { r: maxRow, c: maxCol } } });
          const wscols   = ws['!cols'] || [];
          const cw       = Array.from({ length: colCount }, (_, c) => wscols[c]?.wpx || (wscols[c]?.wch ? Math.round(wscols[c].wch * 7) : 90));
          return { name, rows: rawRows, colCount, cw };
        });
        setXlData({ sheets, active: 0, fileName: file.name });
        setUnsaved(false); setEditCell(null); setSelectedCell(null);
        setLoading(false);
      } catch (e) { setLoading(false); toast('Erreur lecture: ' + e.message, 'error'); }
    };
    reader.readAsArrayBuffer(file);
  };

  const updateCell = (ri, ci, val) => {
    setXlData(d => {
      const sheets = d.sheets.map((s, si) => {
        if (si !== d.active) return s;
        const rows = s.rows.map((row, r) => { if (r !== ri) return row; const nr = [...row]; nr[ci] = val; return nr; });
        return { ...s, rows };
      });
      return { ...d, sheets };
    });
    setUnsaved(true);
  };

  const addRow = () => {
    setXlData(d => {
      const s = d.sheets[d.active];
      const emptyRow = Array(s.colCount).fill('');
      const sheets = d.sheets.map((sh, i) => i === d.active ? { ...sh, rows: [...sh.rows, emptyRow] } : sh);
      return { ...d, sheets };
    });
    setUnsaved(true);
  };

  const addCol = () => {
    setXlData(d => {
      const sheets = d.sheets.map((sh, i) => i === d.active ? { ...sh, colCount: sh.colCount + 1, cw: [...sh.cw, 90], rows: sh.rows.map(r => [...r, '']) } : sh);
      return { ...d, sheets };
    });
    setUnsaved(true);
  };

  const deleteRow = ri => {
    setXlData(d => {
      const sheets = d.sheets.map((sh, i) => i === d.active ? { ...sh, rows: sh.rows.filter((_, r) => r !== ri) } : sh);
      return { ...d, sheets };
    });
    setUnsaved(true); setSelectedCell(null);
  };

  const downloadXlsx = () => {
    if (!xlData) return;
    const wb = XLSX.utils.book_new();
    xlData.sheets.forEach(s => { const ws = XLSX.utils.aoa_to_sheet(s.rows); XLSX.utils.book_append_sheet(wb, ws, s.name); });
    XLSX.writeFile(wb, xlData.fileName.replace(/\.(xlsx?|csv)$/i, '') + '.xlsx');
    setUnsaved(false);
    toast('Fichier téléchargé !');
  };

  const startEdit = (ri, ci, val) => {
    setEditCell({ ri, ci }); setEditVal(String(val ?? '')); setSelectedCell({ ri, ci });
    setTimeout(() => editInputRef.current?.focus(), 0);
  };

  const commitEdit = () => { if (editCell) { updateCell(editCell.ri, editCell.ci, editVal); setEditCell(null); } };

  const handleKeyDown = e => {
    if (!editCell) return;
    if (e.key === 'Enter')  { e.preventDefault(); commitEdit(); setSelectedCell({ ri: editCell.ri + 1, ci: editCell.ci }); }
    if (e.key === 'Tab')    { e.preventDefault(); commitEdit(); setSelectedCell({ ri: editCell.ri, ci: editCell.ci + 1 }); }
    if (e.key === 'Escape') { setEditCell(null); }
  };

  const sheet    = xlData?.sheets[xlData.active];
  const visStart = Math.max(0, Math.floor(scrollTop / ROW_H) - 3);
  const visEnd   = Math.min(sheet?.rows.length || 0, visStart + Math.ceil(520 / ROW_H) + 6);

  // Zone de dépôt
  if (!xlData) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '70vh', gap: 24, padding: 24 }}>
      <input ref={xlRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }}
        onChange={e => { if (e.target.files[0]) loadFile(e.target.files[0]); }} />
      <div ref={dropRef}
        onDragOver={e => { e.preventDefault(); dropRef.current.style.borderColor = XL_GREEN; }}
        onDragLeave={() => { dropRef.current.style.borderColor = T.bdr; }}
        onDrop={e => { e.preventDefault(); dropRef.current.style.borderColor = T.bdr; const f = e.dataTransfer.files[0]; if (f) loadFile(f); }}
        onClick={() => xlRef.current.click()}
        style={{ width: 420, padding: '52px 40px', borderRadius: 18, border: `3px dashed ${T.bdr}`, background: T.surface, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, cursor: 'pointer', transition: 'border-color .2s' }}>
        <div style={{ width: 72, height: 72, borderRadius: 18, background: '#E8F5E9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width={40} height={40} viewBox="0 0 24 24" fill="none">
            <rect x={3} y={2} width={18} height={20} rx={2} fill={XL_GREEN} />
            <rect x={7} y={7} width={10} height={1.5} rx={.75} fill="#fff" opacity={.9} />
            <rect x={7} y={10.5} width={10} height={1.5} rx={.75} fill="#fff" opacity={.9} />
            <rect x={7} y={14} width={7} height={1.5} rx={.75} fill="#fff" opacity={.9} />
          </svg>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: T.txt, marginBottom: 6 }}>{loading ? 'Chargement...' : 'Glisser un fichier Excel ici'}</div>
          <div style={{ fontSize: 13, color: T.muted }}>ou cliquer pour choisir</div>
          <div style={{ marginTop: 10, fontSize: 11, color: T.muted, padding: '4px 14px', background: T.surface2, borderRadius: 20, display: 'inline-block' }}>.xlsx · .xls · .csv</div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 110px)', padding: '0 0 0 0' }}>
      {/* Toolbar */}
      <div style={{ background: XL_GREEN, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, borderRadius: '12px 12px 0 0', margin: '24px 24px 0' }}>
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
          <rect x={3} y={2} width={18} height={20} rx={2} fill="#fff" opacity={.15} />
          <rect x={7} y={7} width={10} height={1.5} rx={.75} fill="#fff" />
          <rect x={7} y={10.5} width={10} height={1.5} rx={.75} fill="#fff" />
          <rect x={7} y={14} width={7} height={1.5} rx={.75} fill="#fff" />
        </svg>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 14, flex: 1 }}>
          {xlData.fileName}{unsaved && <span style={{ marginLeft: 8, fontSize: 11, opacity: .7 }}>● modifié</span>}
        </span>
        <button onClick={addRow} style={{ background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.3)', color: '#fff', borderRadius: 7, padding: '5px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>+ Ligne</button>
        <button onClick={addCol} style={{ background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.3)', color: '#fff', borderRadius: 7, padding: '5px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>+ Colonne</button>
        {selectedCell && (
          <button onClick={() => deleteRow(selectedCell.ri)} style={{ background: 'rgba(220,53,69,.3)', border: '1px solid rgba(255,100,100,.4)', color: '#ffcccc', borderRadius: 7, padding: '5px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>
            🗑 Ligne {selectedCell.ri + 1}
          </button>
        )}
        <button onClick={downloadXlsx} style={{ background: unsaved ? '#fff' : 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.3)', color: unsaved ? XL_GREEN : '#fff', borderRadius: 7, padding: '5px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', transition: 'all .2s' }}>
          ⬇ Télécharger .xlsx
        </button>
        <button onClick={() => { setXlData(null); xlRef.current && (xlRef.current.value = ''); setUnsaved(false); }} style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)', color: 'rgba(255,255,255,.7)', borderRadius: 7, padding: '5px 12px', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>✕</button>
      </div>

      {/* Formula bar */}
      <div style={{ background: '#F2F5F2', borderLeft: `1px solid ${BORDER}`, borderRight: `1px solid ${BORDER}`, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, margin: '0 24px' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: XL_GREEN, minWidth: 36, textAlign: 'center', background: HEADER_BG, padding: '2px 6px', borderRadius: 4, border: `1px solid ${BORDER}` }}>
          {selectedCell ? `${colLetter(selectedCell.ci)}${selectedCell.ri + 1}` : '—'}
        </span>
        <span style={{ color: BORDER, fontSize: 14 }}>fx</span>
        <input ref={editInputRef}
          value={editCell ? editVal : (selectedCell && sheet?.rows[selectedCell.ri] ? String(sheet.rows[selectedCell.ri][selectedCell.ci] ?? '') : '—')}
          onChange={e => { if (editCell) setEditVal(e.target.value); }}
          onFocus={() => { if (selectedCell && !editCell) startEdit(selectedCell.ri, selectedCell.ci, sheet?.rows[selectedCell.ri]?.[selectedCell.ci] ?? ''); }}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 13, color: T.txt, fontFamily: "Calibri,'Segoe UI',sans-serif", outline: 'none' }}
        />
      </div>

      {/* Sheet tabs */}
      <div style={{ background: '#1D6A3E', display: 'flex', alignItems: 'flex-end', gap: 2, padding: '0 8px', flexShrink: 0, margin: '0 24px' }}>
        {xlData.sheets.map((s, i) => (
          <button key={i} onClick={() => { commitEdit(); setXlData(d => ({ ...d, active: i })); setSelectedCell(null); setEditCell(null); setScrollTop(0); }}
            style={{ padding: '6px 18px', borderRadius: '6px 6px 0 0', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: xlData.active === i ? 700 : 400, background: xlData.active === i ? '#fff' : 'rgba(255,255,255,.15)', color: xlData.active === i ? XL_GREEN : 'rgba(255,255,255,.8)', fontFamily: 'inherit', transition: 'all .12s' }}>
            {s.name}
          </button>
        ))}
      </div>

      {/* Grid */}
      {!sheet || sheet.rows.length === 0
        ? <div style={{ padding: 60, textAlign: 'center', color: T.muted, background: '#fff', border: `1px solid ${BORDER}`, borderTop: 'none', flex: 1, margin: '0 24px 24px' }}>
            Feuille vide — cliquez "+ Ligne" pour commencer
          </div>
        : <div style={{ display: 'flex', flexDirection: 'column', border: `1px solid ${BORDER}`, borderTop: 'none', borderRadius: '0 0 12px 12px', overflow: 'hidden', flex: 1, minHeight: 0, margin: '0 24px 24px' }}>
            {/* Col headers */}
            <div style={{ overflowX: 'hidden', flexShrink: 0, background: HEADER_BG, borderBottom: `1px solid ${BORDER}` }} id="xl-hdr">
              <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: 12, fontFamily: "Calibri,'Segoe UI',sans-serif" }}>
                <thead><tr>
                  <th style={{ width: 46, minWidth: 46, background: HEADER_BG, border: `1px solid ${BORDER}`, padding: '4px 0' }} />
                  {Array.from({ length: sheet.colCount }, (_, i) => (
                    <th key={i} style={{ width: sheet.cw[i] || 90, minWidth: 50, background: HEADER_BG, border: `1px solid ${BORDER}`, padding: '4px 8px', textAlign: 'center', fontWeight: 700, color: '#555', fontSize: 11 }}>
                      {colLetter(i)}
                    </th>
                  ))}
                  <th style={{ width: 32, background: HEADER_BG, border: `1px solid ${BORDER}` }} />
                </tr></thead>
              </table>
            </div>

            {/* Virtualized body */}
            <div ref={bodyScrollRef} style={{ flex: 1, overflow: 'auto', minHeight: 0 }}
              onScroll={e => {
                setScrollTop(e.target.scrollTop);
                const hdr = document.getElementById('xl-hdr');
                if (hdr) hdr.scrollLeft = e.target.scrollLeft;
              }}>
              <div style={{ height: sheet.rows.length * ROW_H, position: 'relative' }}>
                <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: 12, fontFamily: "Calibri,'Segoe UI',sans-serif", position: 'absolute', top: visStart * ROW_H, left: 0 }}>
                  <colgroup>
                    <col style={{ width: 46 }} />
                    {Array.from({ length: sheet.colCount }, (_, i) => <col key={i} style={{ width: sheet.cw[i] || 90 }} />)}
                    <col style={{ width: 32 }} />
                  </colgroup>
                  <tbody>
                    {sheet.rows.slice(visStart, visEnd).map((row, ri) => {
                      const abs = visStart + ri;
                      const isSelRow = selectedCell?.ri === abs;
                      return (
                        <tr key={abs} style={{ height: ROW_H, background: isSelRow ? '#E8F4FD' : abs === 0 ? HEADER_BG : abs % 2 === 0 ? '#fff' : '#F6F8FA' }}>
                          <td onClick={() => setSelectedCell({ ri: abs, ci: 0 })}
                            style={{ background: isSelRow ? '#BEE3F8' : HEADER_BG, border: `1px solid ${BORDER}`, padding: '2px 6px', textAlign: 'center', color: '#666', fontSize: 10, fontWeight: 600, position: 'sticky', left: 0, userSelect: 'none', width: 46, cursor: 'pointer' }}>
                            {abs + 1}
                          </td>
                          {Array.from({ length: sheet.colCount }, (_, ci) => {
                            const isEditing = editCell?.ri === abs && editCell?.ci === ci;
                            const isSel     = selectedCell?.ri === abs && selectedCell?.ci === ci;
                            const val       = row[ci] ?? '';
                            return (
                              <td key={ci}
                                onClick={() => setSelectedCell({ ri: abs, ci })}
                                onDoubleClick={() => startEdit(abs, ci, val)}
                                style={{ border: `1px solid ${isSel ? XL_GREEN : BORDER}`, padding: 0, position: 'relative', outline: isSel ? `2px solid ${XL_GREEN}` : 'none', outlineOffset: -1, background: isEditing ? '#fff' : undefined }}>
                                {isEditing
                                  ? <input ref={editInputRef} value={editVal} onChange={e => setEditVal(e.target.value)} onBlur={commitEdit} onKeyDown={handleKeyDown}
                                      style={{ width: '100%', height: '100%', border: 'none', padding: '0 6px', fontSize: 12, fontFamily: "Calibri,'Segoe UI',sans-serif", outline: 'none', background: 'transparent', color: T.txt }} />
                                  : <span style={{ display: 'block', padding: '2px 6px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', color: abs === 0 ? '#1a3a1a' : T.txt, fontWeight: abs === 0 ? 700 : 400 }}>
                                      {String(val)}
                                    </span>
                                }
                              </td>
                            );
                          })}
                          <td style={{ background: HEADER_BG, border: `1px solid ${BORDER}`, width: 32 }} />
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
      }
    </div>
  );
}
