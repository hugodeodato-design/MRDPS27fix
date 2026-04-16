// fixed/client/src/components/views/MouvementsView.jsx
import { useState, useEffect } from 'react';
import { T, formatDate } from '../../utils/theme.js';
import { Ic, Btn, Card, Modal, Field, Inp, Sel, toast } from '../ui/index.jsx';
import { api } from '../../utils/api.js';

export default function MouvementsView({ bases, user }) {
  const [mouvements, setMouvements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [baseFilter, setBaseFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({
    item_id: '', type: 'entree', quantite: '', motif: '', base_dest_id: ''
  });

  const loadMouvements = async () => {
    setLoading(true);
    try {
      const params = {};
      if (baseFilter !== 'all') params.base_id = baseFilter;
      if (typeFilter !== 'all') params.type = typeFilter;
      const data = await api.get('/mouvements', { params });
      setMouvements(Array.isArray(data) ? data : []);
    } catch (e) {
      toast('Erreur chargement mouvements', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMouvements();
  }, [baseFilter, typeFilter]);

  const createMouvement = async () => {
    if (!form.item_id || !form.quantite) return toast('Article et quantité requis', 'error');
    try {
      await api.post('/mouvements', form);
      toast('Mouvement enregistré');
      setModal(null);
      loadMouvements();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 800 }}>Mouvements de stock</div>
        <Btn onClick={() => setModal('new')}>Nouveau mouvement</Btn>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <Sel value={baseFilter} onChange={e => setBaseFilter(e.target.value)}>
          <option value="all">Toutes les bases</option>
          {bases.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </Sel>
        <Sel value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="all">Tous types</option>
          <option value="entree">Entrée</option>
          <option value="sortie">Sortie</option>
          <option value="transfert">Transfert</option>
          <option value="ajustement">Ajustement</option>
        </Sel>
      </div>

      <Card>
        <table style={{ width: '100%' }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${T.bdr}` }}>
              <th>Date</th>
              <th>Article</th>
              <th>Type</th>
              <th>Quantité</th>
              <th>Motif</th>
              <th>Utilisateur</th>
            </tr>
          </thead>
          <tbody>
            {mouvements.map(m => (
              <tr key={m.id} style={{ borderBottom: `1px solid ${T.bdr}` }}>
                <td>{formatDate(m.created_at)}</td>
                <td>{m.reference} — {m.designation}</td>
                <td>
                  <span style={{ 
                    padding: '2px 8px', borderRadius: 20, fontSize: 12,
                    background: m.type === 'entree' ? T.greenBg : m.type === 'sortie' ? T.redBg : T.blueBg,
                    color: m.type === 'entree' ? T.green : m.type === 'sortie' ? T.red : T.blue
                  }}>
                    {m.type}
                  </span>
                </td>
                <td style={{ fontWeight: 600 }}>{m.quantite}</td>
                <td>{m.motif || '—'}</td>
                <td>{m.user_name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Modal nouveau mouvement */}
      {modal === 'new' && (
        <Modal title="Nouveau mouvement" onClose={() => setModal(null)} footer={<Btn onClick={createMouvement}>Enregistrer</Btn>}>
          <div style={{ display: 'grid', gap: 16 }}>
            <Field label="Article">
              <Sel value={form.item_id} onChange={e => setForm(f => ({...f, item_id: e.target.value}))}>
                <option value="">Sélectionner un article</option>
                {/* Tu peux charger les items ici ou faire un select avancé */}
              </Sel>
            </Field>
            <Field label="Type">
              <Sel value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value}))}>
                <option value="entree">Entrée</option>
                <option value="sortie">Sortie</option>
                <option value="transfert">Transfert</option>
                <option value="ajustement">Ajustement</option>
              </Sel>
            </Field>
            <Field label="Quantité"><Inp type="number" value={form.quantite} onChange={e => setForm(f => ({...f, quantite: e.target.value}))} /></Field>
            <Field label="Motif"><Inp value={form.motif} onChange={e => setForm(f => ({...f, motif: e.target.value}))} /></Field>
          </div>
        </Modal>
      )}
    </div>
  );
}