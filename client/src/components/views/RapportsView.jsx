// src/components/views/RapportsView.jsx
import { useState } from 'react';
import { T, today } from '../../utils/theme.js';
import { Ic, Btn, Card, Field, Sel, toast } from '../ui/index.jsx';
import { api, downloadBlob } from '../../utils/api.js';

export default function RapportsView({ bases, user }) {
  const [generating, setGenerating]   = useState(null);
  const [baseFilter, setBaseFilter]   = useState('all');
  const [dateFrom, setDateFrom]       = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); });
  const [dateTo, setDateTo]           = useState(today);

  const genRapport = async (type, label) => {
    setGenerating(type);
    try {
      let blob;
      if (type === 'base' && baseFilter !== 'all') {
        blob = await api.exportBase(baseFilter);
      } else {
        blob = await api.exportAll();
      }
      downloadBlob(blob, `MRDPSTOCK_${label.replace(/[^a-z0-9]/gi, '_')}_${today()}.xlsx`);
      toast(`Rapport "${label}" téléchargé`);
    } catch (e) { toast('Erreur génération rapport', 'error'); }
    finally { setGenerating(null); }
  };

  const genAlertes = async () => {
    setGenerating('alertes');
    try {
      const alerts = await api.getAlerts();
      if (!alerts || alerts.length === 0) { toast('Aucune alerte stock en cours'); setGenerating(null); return; }
      const lines = [
        'RAPPORT ALERTES STOCK BAS',
        `Date : ${new Date().toLocaleString('fr-FR')}`,
        '═'.repeat(60),
        '',
        ...alerts.map(i => `• ${i.designation} (${i.reference}) — ${i.base_name || ''}  |  Qté: ${i.quantite} / Seuil: ${i.seuil}`),
        '',
        '═'.repeat(60),
        `Total : ${alerts.length} article${alerts.length > 1 ? 's' : ''} en alerte`,
      ];
      const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `MRDPSTOCK_Alertes_${today()}.txt`;
      a.click();
      toast('Rapport alertes téléchargé');
    } catch (e) { toast(e.message, 'error'); }
    finally { setGenerating(null); }
  };

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: T.txt }}>Rapports & Export</div>
        <div style={{ fontSize: 13, color: T.muted, marginTop: 2 }}>Générez et téléchargez vos rapports de stock</div>
      </div>

      <div style={{ display: 'grid', gap: 16, maxWidth: 720 }}>

        {/* Export Excel */}
        <Card>
          <div style={{ fontWeight: 700, fontSize: 15, color: T.txt, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Ic n="fileText" s={16} c={T.green} />Export Excel
          </div>
          <div style={{ display: 'grid', gap: 14 }}>
            <Field label="Base à exporter">
              <Sel value={baseFilter} onChange={e => setBaseFilter(e.target.value)}>
                <option value="all">Toutes les bases</option>
                {bases.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Sel>
            </Field>
            <div style={{ display: 'flex', gap: 10 }}>
              <Btn onClick={() => genRapport('base', baseFilter === 'all' ? 'Export_complet' : bases.find(b => b.id === baseFilter)?.name || 'Export')}
                disabled={!!generating}>
                <Ic n="download" s={13} />
                {generating === 'base' ? 'Export en cours…' : baseFilter === 'all' ? 'Exporter toutes les bases' : `Exporter ${bases.find(b => b.id === baseFilter)?.name}`}
              </Btn>
            </div>
          </div>
        </Card>

        {/* Rapport alertes */}
        <Card>
          <div style={{ fontWeight: 700, fontSize: 15, color: T.txt, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Ic n="bell" s={16} c={T.orange} />Rapport alertes stock
          </div>
          <div style={{ fontSize: 13, color: T.muted, marginBottom: 14 }}>
            Téléchargez la liste de tous les articles en dessous de leur seuil d'alerte.
          </div>
          <Btn v="orange" onClick={genAlertes} disabled={!!generating}>
            <Ic n="alert" s={13} />
            {generating === 'alertes' ? 'Génération…' : 'Télécharger rapport alertes (.txt)'}
          </Btn>
        </Card>

        {/* Export complet */}
        <Card>
          <div style={{ fontWeight: 700, fontSize: 15, color: T.txt, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Ic n="download" s={16} c={T.blue} />Export complet
          </div>
          <div style={{ fontSize: 13, color: T.muted, marginBottom: 14 }}>
            Téléchargez toutes les bases de stock en un seul fichier Excel multi-onglets.
          </div>
          <Btn v="blue" onClick={() => genRapport('all', 'Export_complet')} disabled={!!generating}>
            <Ic n="download" s={13} />
            {generating === 'all' ? 'Export en cours…' : 'Exporter tout en Excel'}
          </Btn>
        </Card>

      </div>
    </div>
  );
}
