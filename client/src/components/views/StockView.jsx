// fixed/client/src/components/views/StockView.jsx
import { useState, useEffect } from 'react';
import { T, DEFAULT_COLS, formatDate, today } from '../../utils/theme.js';
import { Ic, Btn, Card, Modal, Field, Inp, Sel, EtatBadge, toast } from '../ui/index.jsx';
import { api } from '../../utils/api.js';

export default function StockView({ baseId, user, bases, onRefreshBases, onRefreshAlerts }) {
  const [items, setItems] = useState([]);
  const [columns, setColumns] = useState(DEFAULT_COLS);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [etatFilter, setEtatFilter] = useState('all');

  // Modal et formulaire
  const [modal, setModal] = useState(null); // 'add' ou 'edit'
  const [form, setForm] = useState({
    reference: '',
    designation: '',
    categorie: '',
    emplacement: '',
    quantite: 0,
    seuil: 0,
    etat: 'en_stock',
    date_entree: today(),
    autres_infos: '',
    photo: null,
    custom_fields: { refs_secondaires: [] }
  });
  const [previewPhoto, setPreviewPhoto] = useState(null);

  const currentBase = bases.find(b => b.id === baseId);

  // Chargement des articles
  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await api.getItems(baseId, {
        search: search || undefined,
        etat: etatFilter !== 'all' ? etatFilter : undefined
      });
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      toast('Erreur lors du chargement des articles', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (baseId) loadItems();
  }, [baseId, search, etatFilter]);

  // Chargement des colonnes configurées
  useEffect(() => {
    api.getColumns(baseId).then(cols => {
      if (cols?.length) setColumns(cols);
    }).catch(() => {});
  }, [baseId]);

  // Gestion photo
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast('La photo ne doit pas dépasser 5 Mo', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setForm(f => ({ ...f, photo: ev.target.result }));
      setPreviewPhoto(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const openAddModal = () => {
    setForm({
      reference: '', designation: '', categorie: '', emplacement: '',
      quantite: 0, seuil: 0, etat: 'en_stock', date_entree: today(),
      autres_infos: '', photo: null, custom_fields: { refs_secondaires: [] }
    });
    setPreviewPhoto(null);
    setModal('add');
  };

  const openEditModal = (item) => {
    const custom = typeof item.custom_fields === 'string' 
      ? JSON.parse(item.custom_fields || '{}') 
      : (item.custom_fields || { refs_secondaires: [] });

    setForm({
      ...item,
      photo: item.photo || null,
      custom_fields: custom
    });
    setPreviewPhoto(item.photo || null);
    setModal('edit');
  };

  const saveItem = async () => {
    if (!form.reference?.trim() || !form.designation?.trim()) {
      return toast('Référence et désignation sont obligatoires', 'error');
    }

    try {
      const payload = {
        ...form,
        custom_fields: form.custom_fields
      };

      if (modal === 'add') {
        await api.createItem({ ...payload, base_id: baseId });
        toast('Article créé avec succès', 'success');
      } else {
        await api.updateItem(form.id, payload);
        toast('Article modifié avec succès', 'success');
      }

      setModal(null);
      loadItems();
      if (onRefreshAlerts) onRefreshAlerts();
    } catch (e) {
      toast(e.message || 'Erreur lors de la sauvegarde', 'error');
    }
  };

  const deleteItem = async (id) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cet article ?')) return;
    try {
      await api.deleteItem(id);
      toast('Article supprimé', 'success');
      loadItems();
    } catch (e) {
      toast(e.message || 'Erreur suppression', 'error');
    }
  };

  // Filtrage local
  const filtered = items.filter(item => {
    const term = search.toLowerCase();
    return (
      (!term || 
        item.reference?.toLowerCase().includes(term) || 
        item.designation?.toLowerCase().includes(term)
      ) &&
      (etatFilter === 'all' || item.etat === etatFilter)
    );
  });

  return (
    <div style={{ padding: 24, height: '100%', overflowY: 'auto' }}>
      {/* En-tête */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>{currentBase?.name}</h1>
          <p style={{ color: T.muted, margin: 4 }}>{filtered.length} article{filtered.length > 1 ? 's' : ''}</p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <Inp 
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par référence ou désignation..."
            style={{ width: 340 }}
          />
          <Sel value={etatFilter} onChange={e => setEtatFilter(e.target.value)}>
            <option value="all">Tous les états</option>
            <option value="en_stock">En stock</option>
            <option value="sorti">Sorti</option>
            <option value="maintenance">En maintenance</option>
          </Sel>
          <Btn onClick={openAddModal}>
            <Ic n="plus" s={15} /> Nouvel article
          </Btn>
        </div>
      </div>

      {/* Tableau des articles */}
      <Card>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${T.bdr}` }}>
              {columns.filter(c => c.visible !== false).map(col => (
                <th key={col.k} style={{ padding: '14px 10px', textAlign: 'left', fontSize: 13, color: T.muted, fontWeight: 600 }}>
                  {col.l}
                </th>
              ))}
              <th style={{ width: 70 }}>Photo</th>
              <th style={{ width: 140 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="99" style={{ textAlign: 'center', padding: 60 }}>Chargement...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="99" style={{ textAlign: 'center', padding: 60, color: T.muted }}>Aucun article trouvé</td></tr>
            ) : (
              filtered.map(item => (
                <tr key={item.id} style={{ borderBottom: `1px solid ${T.bdr}` }}>
                  {columns.filter(c => c.visible !== false).map(col => (
                    <td key={col.k} style={{ padding: '12px 10px', fontSize: 14 }}>
                      {col.k === 'etat' ? <EtatBadge etat={item.etat} /> :
                       col.k === 'quantite' ? `${item.quantite || 0} / ${item.seuil || '—'}` :
                       col.k === 'date_entree' || col.k === 'date_sortie' ? formatDate(item[col.k]) :
                       item[col.k] || '—'}
                    </td>
                  ))}
                  {/* Colonne Photo */}
                  <td style={{ padding: '12px 10px' }}>
                    {item.photo ? (
                      <img 
                        src={item.photo} 
                        alt="photo" 
                        style={{ width: 42, height: 42, objectFit: 'cover', borderRadius: 8 }} 
                      />
                    ) : '—'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <Btn size="sm" onClick={() => openEditModal(item)} sx={{ marginRight: 6 }}>Modifier</Btn>
                    <Btn v="danger" size="sm" onClick={() => deleteItem(item.id)}>Supprimer</Btn>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {/* Modal Ajout / Modification */}
      {modal && (
        <Modal
          title={modal === 'add' ? "Nouvel article" : "Modifier l'article"}
          onClose={() => setModal(null)}
          footer={
            <>
              <Btn v="ghost" onClick={() => setModal(null)}>Annuler</Btn>
              <Btn 
                onClick={saveItem} 
                disabled={!form.reference?.trim() || !form.designation?.trim()}
              >
                Enregistrer
              </Btn>
            </>
          }
        >
          <div style={{ display: 'grid', gap: 16 }}>
            {/* Photo */}
            <Field label="Photo de l'article">
              <input type="file" accept="image/*" onChange={handlePhotoChange} />
              {previewPhoto && (
                <div style={{ marginTop: 8 }}>
                  <img src={previewPhoto} alt="preview" style={{ maxWidth: 200, borderRadius: 10 }} />
                </div>
              )}
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Référence principale" required>
                <Inp value={form.reference} onChange={e => setForm(f => ({...f, reference: e.target.value}))} />
              </Field>
              <Field label="Désignation" required>
                <Inp value={form.designation} onChange={e => setForm(f => ({...f, designation: e.target.value}))} />
              </Field>
            </div>

            <Field label="Références secondaires (séparées par virgule)">
              <Inp 
                value={(form.custom_fields?.refs_secondaires || []).join(', ')}
                onChange={e => {
                  const refs = e.target.value.split(',').map(r => r.trim()).filter(Boolean);
                  setForm(f => ({
                    ...f, 
                    custom_fields: { ...(f.custom_fields || {}), refs_secondaires: refs }
                  }));
                }}
                placeholder="REF-ALT-001, INT-45678"
              />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <Field label="Catégorie"><Inp value={form.categorie} onChange={e => setForm(f => ({...f, categorie: e.target.value}))} /></Field>
              <Field label="Emplacement"><Inp value={form.emplacement} onChange={e => setForm(f => ({...f, emplacement: e.target.value}))} /></Field>
              <Field label="État">
                <Sel value={form.etat} onChange={e => setForm(f => ({...f, etat: e.target.value}))}>
                  <option value="en_stock">En stock</option>
                  <option value="sorti">Sorti</option>
                  <option value="maintenance">Maintenance</option>
                </Sel>
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Quantité"><Inp type="number" value={form.quantite} onChange={e => setForm(f => ({...f, quantite: +e.target.value}))} /></Field>
              <Field label="Seuil d'alerte"><Inp type="number" value={form.seuil} onChange={e => setForm(f => ({...f, seuil: +e.target.value}))} /></Field>
            </div>

            <Field label="Autres informations">
              <Inp as="textarea" value={form.autres_infos} onChange={e => setForm(f => ({...f, autres_infos: e.target.value}))} style={{ minHeight: 80 }} />
            </Field>
          </div>
        </Modal>
      )}
    </div>
  );
}