// routes/bases.js — Bases clients / entrepôts
const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/init');
const { requireAuth, requireAdmin, requireWrite, requireNotClient } = require('../middleware/auth');

router.use(requireAuth);

// ─── GET /api/bases ───────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const db = getDb();

  // Un client ne voit que sa propre base
  if (req.user.role === 'client') {
    const user = db.prepare(`SELECT client_base_id FROM users WHERE id = ?`).get(req.user.id);
    if (!user?.client_base_id) return res.json([]);
    const base = db.prepare(`
      SELECT b.*,
        COUNT(i.id) as total_items,
        SUM(CASE WHEN i.etat = 'en_stock' THEN 1 ELSE 0 END) as items_en_stock,
        SUM(CASE WHEN i.etat = 'sorti' THEN 1 ELSE 0 END) as items_sortis,
        SUM(CASE WHEN i.quantite <= i.seuil AND i.seuil > 0 AND i.etat = 'en_stock' THEN 1 ELSE 0 END) as alerts
      FROM bases b
      LEFT JOIN items i ON i.base_id = b.id
      WHERE b.id = ? AND b.is_active = 1
      GROUP BY b.id
    `).get(user.client_base_id);
    return res.json(base ? [base] : []);
  }

  const bases = db.prepare(`
    SELECT b.*, 
      COUNT(i.id) as total_items,
      SUM(CASE WHEN i.etat = 'en_stock' THEN 1 ELSE 0 END) as items_en_stock,
      SUM(CASE WHEN i.etat = 'sorti' THEN 1 ELSE 0 END) as items_sortis,
      SUM(CASE WHEN i.quantite <= i.seuil AND i.seuil > 0 AND i.etat = 'en_stock' THEN 1 ELSE 0 END) as alerts
    FROM bases b
    LEFT JOIN items i ON i.base_id = b.id
    WHERE b.is_active = 1
    GROUP BY b.id
    ORDER BY b.name
  `).all();
  res.json(bases);
});

// ─── POST /api/bases ──────────────────────────────────────────────────────────
router.post('/', requireWrite, (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Nom requis' });

  const db = getDb();
  const id = uuidv4();
  const today = new Date().toISOString().slice(0, 10);

  db.prepare(`
    INSERT INTO bases (id, name, created_by) VALUES (?, ?, ?)
  `).run(id, name.trim(), req.user.id);

  // Config colonnes par défaut
  const defaultCols = JSON.stringify([
    { k: 'reference',   l: 'Référence',   fixed: true },
    { k: 'designation', l: 'Désignation', fixed: true },
    { k: 'categorie',   l: 'Catégorie',   visible: true },
    { k: 'emplacement', l: 'Emplacement', visible: true },
    { k: 'quantite',    l: 'Quantité',    visible: true },
    { k: 'etat',        l: 'État',        visible: true },
    { k: 'date_entree', l: 'Date entrée', visible: true },
    { k: 'date_sortie', l: 'Date sortie', visible: false },
  ]);
  db.prepare(`INSERT INTO columns_config (base_id, config) VALUES (?, ?)`).run(id, defaultCols);

  db.prepare(`
    INSERT INTO history (id, user_id, user_name, action, detail, base_id, ip_address)
    VALUES (?, ?, ?, 'Base créée', ?, ?, ?)
  `).run(uuidv4(), req.user.id, req.user.name, `Base : ${name}`, id, req.ip);

  res.status(201).json({ id, name: name.trim(), created_at: today });
});

// ─── PUT /api/bases/:id ───────────────────────────────────────────────────────
router.put('/:id', requireWrite, (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Nom requis' });

  const db = getDb();
  const base = db.prepare(`SELECT * FROM bases WHERE id = ? AND is_active = 1`).get(req.params.id);
  if (!base) return res.status(404).json({ error: 'Base introuvable' });

  db.prepare(`UPDATE bases SET name = ? WHERE id = ?`).run(name.trim(), req.params.id);

  db.prepare(`
    INSERT INTO history (id, user_id, user_name, action, detail, base_id, ip_address)
    VALUES (?, ?, ?, 'Base renommée', ?, ?, ?)
  `).run(uuidv4(), req.user.id, req.user.name, `${base.name} → ${name}`, req.params.id, req.ip);

  res.json({ success: true });
});

// ─── DELETE /api/bases/:id ────────────────────────────────────────────────────
router.delete('/:id', requireAdmin, (req, res) => {
  const db = getDb();
  const base = db.prepare(`SELECT * FROM bases WHERE id = ?`).get(req.params.id);
  if (!base) return res.status(404).json({ error: 'Base introuvable' });

  // Soft delete
  db.prepare(`UPDATE bases SET is_active = 0 WHERE id = ?`).run(req.params.id);

  db.prepare(`
    INSERT INTO history (id, user_id, user_name, action, detail, ip_address)
    VALUES (?, ?, ?, 'Base supprimée', ?, ?)
  `).run(uuidv4(), req.user.id, req.user.name, `Base : ${base.name}`, req.ip);

  res.json({ success: true });
});

// ─── GET /api/bases/:id/columns ───────────────────────────────────────────────
router.get('/:id/columns', (req, res) => {
  const db = getDb();
  const cfg = db.prepare(`SELECT config FROM columns_config WHERE base_id = ?`).get(req.params.id);
  res.json(cfg ? JSON.parse(cfg.config) : []);
});

// ─── PUT /api/bases/:id/columns ───────────────────────────────────────────────
router.put('/:id/columns', requireWrite, (req, res) => {
  const db = getDb();
  db.prepare(`
    INSERT INTO columns_config (base_id, config, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(base_id) DO UPDATE SET config = excluded.config, updated_at = excluded.updated_at
  `).run(req.params.id, JSON.stringify(req.body));
  res.json({ success: true });
});

module.exports = router;
