// src/components/views/AlertsView.jsx
import { useState, useEffect } from 'react';
import { T, formatDate } from '../../utils/theme.js';
import { Ic, Card, Badge } from '../ui/index.jsx';
import { api } from '../../utils/api.js';

export default function AlertsView({ onSelectBase }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAlerts().then(a => setAlerts(Array.isArray(a) ? a : [])).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: T.txt }}>Alertes stock bas</div>
        <div style={{ fontSize: 13, color: T.muted, marginTop: 2 }}>Articles dont la quantité est en dessous du seuil d'alerte</div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: T.muted }}>Chargement…</div>
      ) : alerts.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: 60, color: T.muted }}>
            <Ic n="check" s={40} c={T.green} />
            <div style={{ marginTop: 12, fontWeight: 600, color: T.green, fontSize: 16 }}>Aucune alerte</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Tous les articles sont au-dessus de leur seuil d'alerte</div>
          </div>
        </Card>
      ) : (
        <Card p={0} sx={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              {['Article', 'Base', 'Quantité', 'Seuil', 'Manquant', 'Emplacement'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: .8, background: T.surface2, borderBottom: `2px solid ${T.bdr}` }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {alerts.map(item => (
                <tr key={item.id} onClick={() => onSelectBase(item.base_id)} style={{ cursor: 'pointer', borderBottom: `1px solid ${T.bdr}`, background: 'rgba(255,139,0,.03)' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600, color: T.txt }}>{item.designation}</div>
                    <div style={{ fontSize: 11, color: T.brand, marginTop: 1 }}>{item.reference}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}><Badge v="gray" sm>{item.base_name}</Badge></td>
                  <td style={{ padding: '12px 16px' }}><span style={{ fontWeight: 800, fontSize: 16, color: T.orange }}>{item.quantite}</span></td>
                  <td style={{ padding: '12px 16px' }}><span style={{ fontSize: 13, color: T.muted }}>{item.seuil}</span></td>
                  <td style={{ padding: '12px 16px' }}><Badge v="red" sm>−{item.seuil - item.quantite}</Badge></td>
                  <td style={{ padding: '12px 16px' }}><span style={{ fontSize: 12, color: T.muted }}>{item.emplacement || '—'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
