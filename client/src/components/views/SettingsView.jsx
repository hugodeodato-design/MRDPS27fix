// src/components/views/SettingsView.jsx
import { useState } from 'react';
import { T } from '../../utils/theme.js';
import { Ic, Btn, Card, Field, Inp, Sel } from '../ui/index.jsx';
import { api, downloadBlob } from '../../utils/api.js';
import { today } from '../../utils/theme.js';
import { toast } from '../ui/index.jsx';

export default function SettingsView({ settings, onSave }) {
  const [form, setForm] = useState({ ...settings });
  const [saving, setSaving] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(form); }
    catch (e) { toast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleExportAll = async () => {
    setExportLoading(true);
    try {
      const blob = await api.exportAll();
      downloadBlob(blob, `MRDPSTOCK_export_complet_${today()}.xlsx`);
    } catch (e) { toast(e.message, 'error'); }
    finally { setExportLoading(false); }
  };

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: T.txt }}>Paramètres</div>
        <div style={{ fontSize: 13, color: T.muted, marginTop: 2 }}>Configuration de l'application</div>
      </div>

      <div style={{ display: 'grid', gap: 18, maxWidth: 640 }}>
        {/* Général */}
        <Card>
          <div style={{ fontWeight: 700, fontSize: 15, color: T.txt, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Ic n="settings" s={16} c={T.brand} />Général
          </div>
          <div style={{ display: 'grid', gap: 16 }}>
            <Field label="Nom de l'entreprise">
              <Inp value={form.companyName || ''} onChange={e => set('companyName', e.target.value)} />
            </Field>
            <Field label="Format de date">
              <Sel value={form.dateFormat || 'DD/MM/YYYY'} onChange={e => set('dateFormat', e.target.value)}>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </Sel>
            </Field>
            <Field label="Devise">
              <Sel value={form.currency || '€'} onChange={e => set('currency', e.target.value)}>
                <option value="€">€ Euro</option>
                <option value="$">$ Dollar</option>
                <option value="£">£ Livre</option>
                <option value="CHF">CHF Franc suisse</option>
              </Sel>
            </Field>
          </div>
        </Card>

        {/* Alertes */}
        <Card>
          <div style={{ fontWeight: 700, fontSize: 15, color: T.txt, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Ic n="bell" s={16} c={T.orange} />Alertes
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 600, color: T.txt, fontSize: 14 }}>Alertes stock bas</div>
              <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>Afficher une alerte quand la quantité passe sous le seuil</div>
            </div>
            <button onClick={() => set('lowStockAlert', form.lowStockAlert === 'true' ? 'false' : 'true')}
              style={{ width: 44, height: 24, borderRadius: 12, background: form.lowStockAlert === 'true' ? T.brand : T.bdr, border: 'none', cursor: 'pointer', position: 'relative', transition: 'background .2s' }}>
              <span style={{ position: 'absolute', top: 3, left: form.lowStockAlert === 'true' ? 22 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left .2s' }} />
            </button>
          </div>
        </Card>

        {/* Export global */}
        <Card>
          <div style={{ fontWeight: 700, fontSize: 15, color: T.txt, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Ic n="download" s={16} c={T.blue} />Export des données
          </div>
          <div style={{ fontSize: 13, color: T.muted, marginBottom: 14 }}>Télécharger toutes les bases de stock en un seul fichier Excel</div>
          <Btn v="secondary" onClick={handleExportAll} disabled={exportLoading}>
            <Ic n="download" s={13} />{exportLoading ? 'Export en cours…' : 'Exporter tout en Excel'}
          </Btn>
        </Card>

        {/* Zone danger */}
        <Card sx={{ border: `1px solid ${T.redBdr}`, background: T.redBg }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: T.red, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Ic n="alert" s={16} c={T.red} />Zone de danger
          </div>
          <div style={{ fontSize: 13, color: T.muted, marginBottom: 14 }}>Ces actions sont irréversibles. Procédez avec précaution.</div>
          <div style={{ display: 'flex', gap: 8, fontSize: 12, color: T.muted }}>
            <Ic n="info" s={13} c={T.muted} />
            Pour réinitialiser l'application, contactez votre administrateur système (suppression de la base de données).
          </div>
        </Card>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Btn onClick={handleSave} disabled={saving} size="lg">
            <Ic n="save" s={14} />{saving ? 'Enregistrement…' : 'Enregistrer les paramètres'}
          </Btn>
        </div>
      </div>
    </div>
  );
}
