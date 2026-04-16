// client/src/components/views/BonTransportView.jsx
import { useState, useEffect } from 'react';
import { T } from '../../utils/theme.js';
import { Ic, Btn, Card, Field, Inp, Sel, toast } from '../ui/index.jsx';
import { api } from '../../utils/api.js';

const DRAFT_KEY = 'mrdpstock_bt_draft';
const HISTO_KEY = 'mrdpstock_bt_historique';

const genNumBT = () => {
  const yr = new Date().getFullYear();
  const num = String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0');
  return `BT-${yr}-${num}`;
};

const defaultForm = (bases = [], userName = '') => ({
  numeroBT: genNumBT(),
  date: new Date().toLocaleDateString('fr-FR'),
  direction: 'sortie',
  baseId: '',
  entrepotId: '',
  service: '',
  interlocuteur: userName,
  express: false,
  livNom: '',
  livAdresse: '',
  autreInfo: '',
  articles: [{ ref: '', designation: '', qte: '' }],
});

export default function BonTransportView({ bases, user, settings }) {
  const entrepots = settings?.entrepots || [
    { id: 'e1', nom: 'Siège Social', adresse: '5 Rue du Fond du Val', codePostal: '27600', ville: 'Saint-Pierre-la-Garenne', tel: '02 32 21 09 23' }
  ];

  const loadDraft = () => {
    try {
      const d = localStorage.getItem(DRAFT_KEY);
      return d ? JSON.parse(d) : null;
    } catch { return null; }
  };

  const saveDraft = (f) => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(f)); } catch {}
  };

  const clearDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
  };

  const [form, setForm] = useState(() => loadDraft() || defaultForm(bases, user?.name || ''));
  const [historique, setHistorique] = useState(() => {
    try {
      const h = localStorage.getItem(HISTO_KEY);
      return h ? JSON.parse(h) : [];
    } catch { return []; }
  });
  const [showHistorique, setShowHistorique] = useState(false);
  const [baseItems, setBaseItems] = useState([]);

  useEffect(() => {
    if (!form.baseId) {
      setBaseItems([]);
      return;
    }
    api.getItems(form.baseId)
      .then(items => setBaseItems(Array.isArray(items) ? items.filter(i => i.etat === 'en_stock') : []))
      .catch(() => setBaseItems([]));
  }, [form.baseId]);

  const setF = (updater) => {
    setForm(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveDraft(next);
      return next;
    });
  };

  const updateArticle = (i, key, val) => {
    const arts = [...form.articles];
    arts[i] = { ...arts[i], [key]: val };
    setF({ ...form, articles: arts });
  };

  const addArticle = () => setF({ ...form, articles: [...form.articles, { ref: '', designation: '', qte: '' }] });

  const removeArticle = (i) => {
    if (form.articles.length === 1) return;
    setF({ ...form, articles: form.articles.filter((_, idx) => idx !== i) });
  };

  const saveToHistorique = () => {
    const entry = { ...form, id: Date.now(), createdAt: new Date().toLocaleString('fr-FR'), createdBy: user?.name || 'Inconnu' };
    const h = [entry, ...historique].slice(0, 100);
    setHistorique(h);
    try { localStorage.setItem(HISTO_KEY, JSON.stringify(h)); } catch {}
  };

  const deleteFromHistorique = (id) => {
    const h = historique.filter(e => e.id !== id);
    setHistorique(h);
    try { localStorage.setItem(HISTO_KEY, JSON.stringify(h)); } catch {}
  };

  const loadFromHistorique = (entry) => {
    setF({ ...entry, numeroBT: genNumBT(), date: new Date().toLocaleDateString('fr-FR') });
    setShowHistorique(false);
    toast('Bon rechargé — nouveau numéro et date appliqués', 'success');
  };

  const newBon = () => {
    clearDraft();
    setForm(defaultForm(bases, user?.name || ''));
    toast('Nouveau bon créé', 'success');
  };

  const isSortie = form.direction === 'sortie';
  const selectedEntrepot = entrepots.find(e => e.id === form.entrepotId) || entrepots[0] || null;

  const printBT = (saveFirst = true) => {
    if (saveFirst) saveToHistorique();

    const ent = entrepots.find(e => e.id === form.entrepotId) || entrepots[0];

    const expediteurHtml = isSortie
      ? `M.R.D.P.S 27\n${ent ? `${ent.nom}\n${ent.adresse || ''}\n${ent.codePostal || ''} ${ent.ville || ''}\n${ent.tel ? `Tél : ${ent.tel}` : ''}` : ''}`
      : `${form.livNom || '—'}\n${form.livAdresse || ''}`;

    const destinataireHtml = isSortie
      ? `${form.livNom || '—'}\n${form.livAdresse || ''}`
      : `M.R.D.P.S 27\n${ent ? `${ent.nom}\n${ent.adresse || ''}\n${ent.codePostal || ''} ${ent.ville || ''}` : ''}`;

    const dirLabel = isSortie ? 'Sortie de stock' : 'Entrée de stock';
    const articlesRows = form.articles.map(a => 
      `\t\t${a.ref || ''}\t\t${a.designation || ''}\t\t${a.qte || ''}\n\n`
    ).join('');

    const html = `
      <html>
      <head><meta charset="utf-8"><title>Bon de Transport</title></head>
      <body style="font-family: Arial, sans-serif; padding: 40px; line-height: 1.6;">
        <h1 style="text-align:center; color:#00875A;">MRDPSTOCK — Bon de Transport</h1>
        <h2 style="text-align:center; color:${isSortie ? '#dc2626' : '#2d7a2d'};">${dirLabel}</h2>
        
        <p><strong>N° Bon de transport :</strong> ${form.numeroBT}</p>
        <p><strong>Date :</strong> ${form.date}</p>

        <h3>Expéditeur</h3>
        <pre style="background:#f8f8f8; padding:10px; border-radius:8px;">${expediteurHtml}</pre>

        <h3>Destinataire / Point de livraison</h3>
        <pre style="background:#f8f8f8; padding:10px; border-radius:8px;">${destinataireHtml}</pre>

        <h3>Informations d'expédition</h3>
        <p><strong>Service :</strong> ${form.service || '—'}</p>
        <p><strong>Interlocuteur :</strong> ${form.interlocuteur || '—'}</p>
        <p><strong>Express :</strong> ${form.express ? 'OUI' : 'NON'}</p>

        <h3>Articles</h3>
        <table border="1" cellpadding="8" cellspacing="0" style="width:100%; border-collapse:collapse;">
          <thead>
            <tr style="background:#f0f0f0;">
              <th>Référence</th>
              <th>Désignation / Dénomination de pièce</th>
              <th>Qté</th>
            </tr>
          </thead>
          <tbody>
            ${form.articles.map(a => `
              <tr>
                <td>${a.ref || ''}</td>
                <td>${a.designation || ''}</td>
                <td style="text-align:center;">${a.qte || ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <p><strong>Autre info :</strong><br>${form.autreInfo || '—'}</p>

        <p style="margin-top:40px; text-align:center;">
          <strong>Date :</strong> ${form.date} &nbsp;&nbsp;&nbsp; Signature : ________________________
        </p>

        <hr style="margin:40px 0;">
        <p style="text-align:center; font-size:12px; color:#666;">
          M.R.D.P.S 27 — 5 Rue du Fond du Val — 27600 Saint-Pierre-la-Garenne<br>
          Tél : 02 32 21 09 23 | ${form.numeroBT} — MRDPSTOCK v3
        </p>
      </body>
      </html>
    `;

    const w = window.open('', '_blank', 'width=900,height=1000');
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 800);
  };

  // ── VUE HISTORIQUE ──
  if (showHistorique) {
    return (
      <div style={{ padding: 24, height: '100%', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Historique des bons de transport</h1>
            <p style={{ color: T.muted, margin: 4 }}>{historique.length} bon{historique.length > 1 ? 's' : ''}</p>
          </div>
          <Btn onClick={() => setShowHistorique(false)}>Retour à la création</Btn>
        </div>

        {historique.length === 0 ? (
          <Card>
            <div style={{ textAlign: 'center', padding: 80, color: T.muted }}>
              <Ic n="fileText" s={48} c={T.muted} />
              <div style={{ marginTop: 16, fontSize: 17, fontWeight: 600 }}>Aucun bon enregistré</div>
              <div style={{ fontSize: 13, marginTop: 8 }}>Les bons que vous imprimerez seront sauvegardés ici automatiquement.</div>
            </div>
          </Card>
        ) : (
          <Card>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${T.bdr}` }}>
                  <th style={{ padding: 12, textAlign: 'left' }}>N° BT</th>
                  <th style={{ padding: 12, textAlign: 'left' }}>Type</th>
                  <th style={{ padding: 12, textAlign: 'left' }}>Créé le</th>
                  <th style={{ padding: 12, textAlign: 'left' }}>Articles</th>
                  <th style={{ width: 180 }}></th>
                </tr>
              </thead>
              <tbody>
                {historique.map(e => {
                  const isSortie = e.direction !== 'entree';
                  return (
                    <tr key={e.id} style={{ borderBottom: `1px solid ${T.bdr}` }}>
                      <td style={{ padding: 12, fontWeight: 600 }}>{e.numeroBT}</td>
                      <td style={{ padding: 12 }}>{isSortie ? 'Sortie' : 'Entrée'}</td>
                      <td style={{ padding: 12, color: T.muted, fontSize: 13 }}>{e.createdAt}</td>
                      <td style={{ padding: 12 }}>{e.articles.filter(a => a.ref).length} article(s)</td>
                      <td style={{ padding: 12, textAlign: 'right' }}>
                        <Btn size="sm" onClick={() => loadFromHistorique(e)} sx={{ marginRight: 6 }}>Recharger</Btn>
                        <Btn size="sm" onClick={() => { setForm({ ...e, numeroBT: genNumBT(), date: new Date().toLocaleDateString('fr-FR') }); setShowHistorique(false); setTimeout(() => printBT(false), 100); }}>
                          Réimprimer
                        </Btn>
                        <Btn v="danger" size="sm" onClick={() => deleteFromHistorique(e.id)} sx={{ marginLeft: 6 }}>Supprimer</Btn>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    );
  }

  // ── VUE PRINCIPALE (création) ──
  return (
    <div style={{ padding: 24, height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Bon de transport</h1>
          <p style={{ color: T.muted }}>{isSortie ? 'Sortie : M.R.D.P.S 27 → Client' : 'Entrée : Client → M.R.D.P.S 27'}</p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Btn onClick={() => setShowHistorique(true)}>Historique ({historique.length})</Btn>
          <Btn onClick={newBon}>Nouveau bon</Btn>
          <Btn onClick={printBT}>Imprimer / PDF</Btn>
        </div>
      </div>

      {/* Direction */}
      <Card sx={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Type de bon</div>
        <div style={{ display: 'flex', gap: 12 }}>
          {[
            { v: 'sortie', label: 'Sortie de stock', desc: 'M.R.D.P.S 27 → Client / Destinataire' },
            { v: 'entree', label: 'Entrée de stock', desc: 'Client / Expéditeur → M.R.D.P.S 27' },
          ].map(opt => (
            <div
              key={opt.v}
              onClick={() => setF({ ...form, direction: opt.v })}
              style={{
                flex: 1,
                padding: 16,
                borderRadius: 12,
                cursor: 'pointer',
                border: `2px solid ${form.direction === opt.v ? (opt.v === 'sortie' ? T.redBdr : T.greenBdr) : T.bdr}`,
                background: form.direction === opt.v ? (opt.v === 'sortie' ? T.redBg : T.greenBg) : 'transparent',
              }}
            >
              <div style={{ fontWeight: 700 }}>{opt.label}</div>
              <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>{opt.desc}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Formulaire principal */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Colonne gauche */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Field label="N° Bon de transport">
            <Inp value={form.numeroBT} onChange={e => setF({ ...form, numeroBT: e.target.value })} />
          </Field>

          <Field label="Date">
            <Inp type="date" value={form.date} onChange={e => setF({ ...form, date: e.target.value })} />
          </Field>

          {/* Expéditeur / Destinataire */}
          {isSortie ? (
            <>
              <Field label="Destinataire (Nom)">
                <Inp value={form.livNom} onChange={e => setF({ ...form, livNom: e.target.value })} placeholder="Nom du client" />
              </Field>
              <Field label="Adresse complète">
                <Inp as="textarea" value={form.livAdresse} onChange={e => setF({ ...form, livAdresse: e.target.value })} style={{ minHeight: 80 }} />
              </Field>
            </>
          ) : (
            <>
              <Field label="Nom de l'expéditeur">
                <Inp value={form.livNom} onChange={e => setF({ ...form, livNom: e.target.value })} />
              </Field>
              <Field label="Adresse">
                <Inp as="textarea" value={form.livAdresse} onChange={e => setF({ ...form, livAdresse: e.target.value })} style={{ minHeight: 80 }} />
              </Field>
            </>
          )}
        </div>

        {/* Colonne droite */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Field label="Service">
            <Inp value={form.service} onChange={e => setF({ ...form, service: e.target.value })} placeholder="Ex: Logistique, Production..." />
          </Field>

          <Field label="Interlocuteur">
            <Inp value={form.interlocuteur} onChange={e => setF({ ...form, interlocuteur: e.target.value })} />
          </Field>

          <Field label="Express">
            <div style={{ display: 'flex', gap: 12 }}>
              <Btn v={form.express ? "success" : "ghost"} onClick={() => setF({ ...form, express: true })}>OUI</Btn>
              <Btn v={!form.express ? "danger" : "ghost"} onClick={() => setF({ ...form, express: false })}>NON</Btn>
            </div>
          </Field>
        </div>
      </div>

      {/* Articles */}
      <Card sx={{ marginTop: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontWeight: 700 }}>Articles / Références</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn size="sm" onClick={addArticle}>+ Ajouter ligne</Btn>
            {bases.length > 0 && (
              <Sel value={form.baseId} onChange={e => setF({ ...form, baseId: e.target.value })}>
                <option value="">— Importer depuis une base —</option>
                {bases.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Sel>
            )}
          </div>
        </div>

        {form.articles.map((a, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 3fr 1fr 40px', gap: 12, marginBottom: 12, alignItems: 'end' }}>
            <Field label={i === 0 ? "Référence" : ""}>
              <Inp value={a.ref} onChange={e => updateArticle(i, 'ref', e.target.value)} placeholder="REF-001" />
            </Field>
            <Field label={i === 0 ? "Désignation" : ""}>
              <Inp value={a.designation} onChange={e => updateArticle(i, 'designation', e.target.value)} placeholder="Nom de la pièce" />
            </Field>
            <Field label={i === 0 ? "Qté" : ""}>
              <Inp type="number" value={a.qte} onChange={e => updateArticle(i, 'qte', e.target.value)} placeholder="1" />
            </Field>
            <Btn v="danger" size="sm" onClick={() => removeArticle(i)} style={{ height: 38 }}>
              ×
            </Btn>
          </div>
        ))}
      </Card>

      {/* Autre info */}
      <Card sx={{ marginTop: 24 }}>
        <Field label="Autre information / remarque">
          <Inp as="textarea" value={form.autreInfo} onChange={e => setF({ ...form, autreInfo: e.target.value })} style={{ minHeight: 100 }} placeholder="Instructions spéciales, numéro de commande..." />
        </Field>
      </Card>

      {/* Bouton principal */}
      <div style={{ textAlign: 'center', marginTop: 40 }}>
        <Btn onClick={() => printBT(true)} size="lg" style={{ padding: '14px 50px', fontSize: 16 }}>
          Imprimer le bon de transport
        </Btn>
      </div>
    </div>
  );
}