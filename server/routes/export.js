// routes/export.js — Export Excel
const router = require('express').Router();
const XLSX = require('xlsx');
const { getDb } = require('../db/init');
const { requireAuth, requireNotClient } = require('../middleware/auth');

router.use(requireAuth);

// ─── GET /api/export/base/:id ─────────────────────────────────────────────────
router.get('/base/:id', (req, res) => {
  const db = getDb();
  const base = db.prepare(`SELECT * FROM bases WHERE id = ?`).get(req.params.id);
  if (!base) return res.status(404).json({ error: 'Base introuvable' });

  // Isolation client : ne peut exporter que sa propre base (mais les clients
  // n'ont pas le bouton export dans le frontend — double sécurité côté serveur)
  if (req.user.role === 'client') {
    const user = db.prepare(`SELECT client_base_id FROM users WHERE id = ?`).get(req.user.id);
    if (user?.client_base_id !== req.params.id) {
      return res.status(403).json({ error: 'Accès non autorisé à cette base' });
    }
  }

  const items = db.prepare(`SELECT * FROM items WHERE base_id = ? ORDER BY designation`).all(req.params.id);

  const ws_data = [
    ['Référence', 'Désignation', 'Catégorie', 'Emplacement', 'Quantité', 'Seuil', 'État', 'Date entrée', 'Date sortie', 'Autres infos']
  ];

  for (const item of items) {
    ws_data.push([
      item.reference, item.designation, item.categorie, item.emplacement,
      item.quantite, item.seuil, item.etat,
      item.date_entree, item.date_sortie, item.autres_infos
    ]);
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  ws['!cols'] = [10, 25, 15, 15, 10, 10, 12, 12, 12, 20].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws, base.name.slice(0, 31));

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const filename = `MRDPSTOCK_${base.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().slice(0,10)}.xlsx`;

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buf);
});

// ─── GET /api/export/all ──────────────────────────────────────────────────────
router.get('/all', requireNotClient, (req, res) => {
  const db = getDb();
  const bases = db.prepare(`SELECT * FROM bases WHERE is_active = 1 ORDER BY name`).all();
  const wb = XLSX.utils.book_new();

  for (const base of bases) {
    const items = db.prepare(`SELECT * FROM items WHERE base_id = ? ORDER BY designation`).all(base.id);
    const ws_data = [
      ['Référence', 'Désignation', 'Catégorie', 'Emplacement', 'Quantité', 'Seuil', 'État', 'Date entrée', 'Date sortie']
    ];
    for (const item of items) {
      ws_data.push([item.reference, item.designation, item.categorie, item.emplacement,
        item.quantite, item.seuil, item.etat, item.date_entree, item.date_sortie]);
    }
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    XLSX.utils.book_append_sheet(wb, ws, base.name.slice(0, 31));
  }

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const filename = `MRDPSTOCK_export_complet_${new Date().toISOString().slice(0,10)}.xlsx`;

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buf);
});

module.exports = router;
