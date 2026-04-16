// src/components/views/InventaireView.jsx
import { useState } from 'react';
import { T } from '../../utils/theme.js';
import { Ic, Btn, Card, Field, Sel, Badge, toast } from '../ui/index.jsx';
import { api } from '../../utils/api.js';

export default function InventaireView({ bases, user }) {
  const [step, setStep]     = useState('select');
  const [baseId, setBaseId] = useState('');
  const [items, setItems]   = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [report, setReport]     = useState(null);

  const loadBase = async (bid) => {
    if (!bid) return;
    setLoading(true);
    try {
      const data = await api.getItems(bid);
      setItems(data);
      const c = {};
      data.forEach(it => { c[it.id] = String(it.quantite || 0); });
      setCounts(c);
      setStep('count');
    } catch (e) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  };

  const calcReport = () => {
    const ecarts = items.map(it => {
      const theorique = parseInt(it.quantite) || 0;
      const physique  = parseInt(counts[it.id]) || 0;
      const ecart     = physique - theorique;
      return { ...it, theorique, physique, ecart };
    }).filter(it => it.ecart !== 0);

    const total_ecart_pos = ecarts.filter(e => e.ecart > 0).reduce((s, e) => s + e.ecart, 0);
    const total_ecart_neg = ecarts.filter(e => e.ecart < 0).reduce((s, e) => s + e.ecart, 0);
    const baseName = bases.find(b => b.id === baseId)?.name;
    setReport({ ecarts, total_ecart_pos, total_ecart_neg, date: new Date().toLocaleString('fr-FR'), baseName });
    setStep('report');
  };

  const applyCorrections = async () => {
    if (!report || report.ecarts.length === 0) return;
    setSaving(true);
    let ok = 0, fail = 0;
    for (const e of report.ecarts) {
      try {
        await api.post('/mouvements', {
          item_id: e.id,
          base_id: baseId,
          type: 'ajustement',
          quantite: Math.abs(e.ecart),
          motif: `Inventaire physique du ${report.date} — écart ${e.ecart > 0 ? '+' : ''}${e.ecart}`,
        });
        ok++;
      } catch { fail++; }
    }
    setSaving(false);
    if (fail === 0) toast(`${ok} correction${ok > 1 ? 's' : ''} appliquée${ok > 1 ? 's' : ''}`);
    else toast(`${ok} OK, ${fail} erreur${fail > 1 ? 's' : ''}`, 'error');
    setStep('select'); setBaseId(''); setItems([]); setCounts({}); setReport(null);
  };

  const exportRapport = () => {
    if (!report) return;
    const rows = report.ecarts.map(e =>
      `${e.reference} | ${e.designation} | Théorique: ${e.theorique} | Physique: ${e.physique} | Écart: ${e.ecart > 0 ? '+' : ''}${e.ecart}`
    ).join('\n');
    const content = `RAPPORT D'INVENTAIRE PHYSIQUE\n${report.baseName}\nDate: ${report.date}\n${'─'.repeat(60)}\n${rows}\n${'─'.repeat(60)}\nEcarts positifs: +${report.total_ecart_pos}  |  Ecarts négatifs: ${report.total_ecart_neg}\nTotal articles avec écart: ${report.ecarts.length}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Inventaire_${report.baseName?.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    toast('Rapport téléchargé');
  };

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: T.txt }}>Inventaire physique</div>
        <div style={{ fontSize: 13, color: T.muted, marginTop: 2 }}>Comparez le stock théorique avec le stock réel et corrigez les écarts</div>
      </div>

      {/* Étape 1 — Sélection */}
      {step === 'select' && (
        <div style={{ maxWidth: 520 }}>
          <div style={{ background: T.blueBg, border: `1px solid ${T.blueBdr}`, borderRadius: 12, padding: '14px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Ic n="info" s={15} c={T.blue} />
            <div style={{ fontSize: 13, color: T.txt, lineHeight: 1.6 }}>
              <strong>L'inventaire physique</strong> vous permet de comparer le stock théorique avec ce que vous comptez réellement sur le terrain, et de corriger les écarts.
            </div>
          </div>
          <Card>
            <div style={{ fontWeight: 700, fontSize: 16, color: T.txt, marginBottom: 20 }}>Démarrer un inventaire</div>
            <Field label="Choisir la base à inventorier" required>
              <Sel value={baseId} onChange={e => setBaseId(e.target.value)}>
                <option value="">— Sélectionner une base —</option>
                {bases.map(b => <option key={b.id} value={b.id}>{b.name} ({b.total_items || 0} articles)</option>)}
              </Sel>
            </Field>
            <div style={{ marginTop: 20 }}>
              <Btn onClick={() => loadBase(baseId)} disabled={!baseId || loading}>
                {loading
                  ? <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />Chargement...</>
                  : <><Ic n="check" s={13} />Commencer l'inventaire</>}
              </Btn>
            </div>
          </Card>
        </div>
      )}

      {/* Étape 2 — Saisie */}
      {step === 'count' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: T.txt }}>Inventaire — {bases.find(b => b.id === baseId)?.name}</div>
              <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>Saisissez les quantités réelles comptées sur le terrain</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn v="secondary" onClick={() => { setStep('select'); setItems([]); setCounts({}); }}>Annuler</Btn>
              <Btn onClick={calcReport}><Ic n="check" s={13} />Calculer les écarts</Btn>
            </div>
          </div>
          <Card p={0} sx={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                {['Référence', 'Désignation', 'Catégorie', 'Stock système', 'Qté comptée', 'Écart estimé'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: .8, background: T.surface2, borderBottom: `2px solid ${T.bdr}`, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {items.map(it => {
                  const theorique = parseInt(it.quantite) || 0;
                  const physique  = parseInt(counts[it.id]) || 0;
                  const ecart     = physique - theorique;
                  const ecartColor = ecart > 0 ? T.green : ecart < 0 ? T.red : T.muted;
                  return (
                    <tr key={it.id} style={{ background: ecart !== 0 ? 'rgba(255,171,0,.05)' : undefined, borderBottom: `1px solid ${T.bdr}` }}>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: T.brand, fontSize: 13 }}>{it.reference}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: T.txt, fontSize: 13 }}>{it.designation}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: T.muted }}>{it.categorie || '—'}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, fontSize: 14, color: T.txt }}>{theorique}</td>
                      <td style={{ padding: '8px 14px' }}>
                        <input type="number" min="0" value={counts[it.id] ?? theorique}
                          onChange={e => setCounts({ ...counts, [it.id]: e.target.value })}
                          style={{ width: 80, padding: '6px 10px', borderRadius: 8, border: `1.5px solid ${ecart !== 0 ? ecartColor : T.bdr}`, background: T.surface2, color: T.txt, fontSize: 14, fontWeight: 700, fontFamily: 'inherit', outline: 'none', textAlign: 'center' }} />
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        {ecart === 0
                          ? <span style={{ fontSize: 12, color: T.muted }}>—</span>
                          : <span style={{ fontWeight: 800, fontSize: 14, color: ecartColor }}>{ecart > 0 ? '+' : ''}{ecart}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* Étape 3 — Rapport */}
      {step === 'report' && report && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: T.txt }}>Rapport d'inventaire — {report.baseName}</div>
              <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{report.date}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn v="secondary" onClick={() => setStep('count')}><Ic n="edit" s={13} />Corriger les saisies</Btn>
              <Btn v="secondary" onClick={exportRapport}><Ic n="download" s={13} />Télécharger rapport</Btn>
              {report.ecarts.length > 0 && <Btn onClick={applyCorrections} disabled={saving}>{saving ? 'Application...' : 'Appliquer les corrections'}</Btn>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
            <div style={{ background: T.greenBg, border: `1px solid ${T.greenBdr}`, borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ fontSize: 11, color: T.green, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .8, marginBottom: 4 }}>Articles conformes</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: T.green }}>{items.length - report.ecarts.length}</div>
              <div style={{ fontSize: 11, color: T.green }}>sur {items.length} articles</div>
            </div>
            <div style={{ background: T.redBg, border: `1px solid ${T.redBdr}`, borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ fontSize: 11, color: T.red, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .8, marginBottom: 4 }}>Articles avec écart</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: T.red }}>{report.ecarts.length}</div>
              <div style={{ fontSize: 11, color: T.red }}>nécessitent correction</div>
            </div>
            <div style={{ background: T.orangeBg, border: `1px solid ${T.orangeBdr}`, borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ fontSize: 11, color: T.orange, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .8, marginBottom: 4 }}>Écart net total</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: T.orange }}>{report.total_ecart_pos + report.total_ecart_neg > 0 ? '+' : ''}{report.total_ecart_pos + report.total_ecart_neg}</div>
              <div style={{ fontSize: 11, color: T.orange }}>+{report.total_ecart_pos} / {report.total_ecart_neg}</div>
            </div>
          </div>

          {report.ecarts.length === 0 ? (
            <Card>
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
                <div style={{ fontWeight: 700, fontSize: 18, color: T.green, marginBottom: 6 }}>Inventaire conforme !</div>
                <div style={{ fontSize: 14, color: T.muted }}>Tous les articles correspondent au stock système.</div>
              </div>
            </Card>
          ) : (
            <Card p={0} sx={{ overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.bdr}`, fontWeight: 700, color: T.txt, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Ic n="alert" s={15} c={T.orange} />Articles avec écart — corrections à appliquer
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  {['Référence', 'Désignation', 'Stock système', 'Compté', 'Écart', 'Action'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: .8, background: T.surface2, borderBottom: `2px solid ${T.bdr}` }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {report.ecarts.map(e => (
                    <tr key={e.id} style={{ background: e.ecart < 0 ? 'rgba(222,53,11,.05)' : 'rgba(0,135,90,.05)', borderBottom: `1px solid ${T.bdr}` }}>
                      <td style={{ padding: '11px 14px', fontWeight: 700, color: T.brand }}>{e.reference}</td>
                      <td style={{ padding: '11px 14px', fontWeight: 600, color: T.txt }}>{e.designation}</td>
                      <td style={{ padding: '11px 14px', textAlign: 'center', fontWeight: 700, color: T.txt }}>{e.theorique}</td>
                      <td style={{ padding: '11px 14px', textAlign: 'center', fontWeight: 700, color: T.txt }}>{e.physique}</td>
                      <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                        <span style={{ fontWeight: 800, fontSize: 15, color: e.ecart > 0 ? T.green : T.red }}>{e.ecart > 0 ? '+' : ''}{e.ecart}</span>
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        <Badge v={e.ecart > 0 ? 'green' : 'red'} sm>{e.ecart > 0 ? 'Ajout' : 'Retrait'} de {Math.abs(e.ecart)}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
