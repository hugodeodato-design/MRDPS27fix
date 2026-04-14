// routes/items.js — Gestion des articles
const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/init');
const { requireAuth, requireWrite } = require('../middleware/auth');

router.use(requireAuth);

// Helper : vérifie qu'un client n'accède qu'à sa base
function clientCanAccessBase(req, base_id) {
  if (req.user.role !== 'client') return true;
  const db = getDb();
  const user = db.prepare(`SELECT client_base_id FROM users WHERE id = ?`).get(req.user.id);
  return user?.client_base_id === base_id;
}

// ─── GET /api/items?base_id=xxx&search=xxx&etat=xxx ───────────────────────────
router.get('/', (req, res) => {
  const { base_id, search, etat, alert_only } = req.query;
  if (!base_id) return res.status(400).json({ error: 'base_id requis' });

  // Isolation client : ne peut voir que sa propre base
  if (!clientCanAccessBase(req, base_id)) {
    return res.status(403).json({ error: 'Accès non autorisé à cette base' });
  }

  const db = getDb();
  let query = `SELECT * FROM items WHERE base_id = ?`;
  const params = [base_id];

  if (etat) { query += ` AND etat = ?`; params.push(etat); }
  if (alert_only === 'true') { query += ` AND quantite <= seuil AND seuil > 0 AND etat = 'en_stock'`; }
  if (search) {
    query += ` AND (reference LIKE ? OR designation LIKE ? OR categorie LIKE ? OR emplacement LIKE ?)`;
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }
  query += ` ORDER BY designation`;

  const items = db.prepare(query).all(...params).map(item => ({
    ...item,
    custom_fields: item.custom_fields ? JSON.parse(item.custom_fields) : {},
  }));

  res.json(items);
});

// ─── GET /api/items/alerts — alertes stock bas (filtrées par base pour les clients)
router.get('/alerts', (req, res) => {
  const db = getDb();

  // Un client ne voit les alertes que de sa propre base
  if (req.user.role === 'client') {
    const user = db.prepare(`SELECT client_base_id FROM users WHERE id = ?`).get(req.user.id);
    if (!user?.client_base_id) return res.json([]);
    const alerts = db.prepare(`
      SELECT i.*, b.name as base_name
      FROM items i
      JOIN bases b ON b.id = i.base_id
      WHERE i.quantite <= i.seuil AND i.seuil > 0 AND i.etat = 'en_stock'
        AND b.is_active = 1 AND i.base_id = ?
      ORDER BY (i.seuil - i.quantite) DESC
    `).all(user.client_base_id);
    return res.json(alerts);
  }

  const alerts = db.prepare(`
    SELECT i.*, b.name as base_name
    FROM items i
    JOIN bases b ON b.id = i.base_id
    WHERE i.quantite <= i.seuil AND i.seuil > 0 AND i.etat = 'en_stock' AND b.is_active = 1
    ORDER BY (i.seuil - i.quantite) DESC
  `).all();
  res.json(alerts);
});

// ─── GET /api/items/:id ───────────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  const db = getDb();
  const item = db.prepare(`SELECT * FROM items WHERE id = ?`).get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Article introuvable' });
  // Isolation client
  if (!clientCanAccessBase(req, item.base_id)) {
    return res.status(403).json({ error: 'Accès non autorisé à cette base' });
  }
  res.json({ ...item, custom_fields: JSON.parse(item.custom_fields || '{}') });
});

// ─── POST /api/items ──────────────────────────────────────────────────────────
router.post('/', requireWrite, (req, res) => {
  const { base_id, reference, designation, categorie, emplacement, quantite,
          seuil, etat, date_entree, date_sortie, autres_infos, photo, custom_fields } = req.body;

  if (!base_id || !reference?.trim() || !designation?.trim()) {
    return res.status(400).json({ error: 'base_id, référence et désignation requis' });
  }

  // Vérifier que la base existe
  const db = getDb();
  const base = db.prepare(`SELECT * FROM bases WHERE id = ? AND is_active = 1`).get(base_id);
  if (!base) return res.status(404).json({ error: 'Base introuvable' });

  const id = uuidv4();
  const today = new Date().toISOString().slice(0, 10);

  db.prepare(`
    INSERT INTO items (id, base_id, reference, designation, categorie, emplacement,
      quantite, seuil, etat, date_entree, date_sortie, autres_infos, photo, custom_fields, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, base_id, reference.trim(), designation.trim(),
    categorie || '', emplacement || '',
    parseInt(quantite) || 0, parseInt(seuil) || 0,
    etat || 'en_stock',
    date_entree || today, date_sortie || null,
    autres_infos || '', photo || '',
    JSON.stringify(custom_fields || {}),
    req.user.id
  );

  db.prepare(`
    INSERT INTO history (id, user_id, user_name, action, detail, base_id, item_id, ip_address)
    VALUES (?, ?, ?, 'Article ajouté', ?, ?, ?, ?)
  `).run(uuidv4(), req.user.id, req.user.name, `${reference} — ${designation}`, base_id, id, req.ip);

  res.status(201).json({ id });
});

// ─── PUT /api/items/:id ───────────────────────────────────────────────────────
router.put('/:id', requireWrite, (req, res) => {
  const db = getDb();
  const item = db.prepare(`SELECT * FROM items WHERE id = ?`).get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Article introuvable' });

  const { reference, designation, categorie, emplacement, quantite,
          seuil, etat, date_entree, date_sortie, autres_infos, photo, custom_fields } = req.body;

  db.prepare(`
    UPDATE items SET
      reference = ?, designation = ?, categorie = ?, emplacement = ?,
      quantite = ?, seuil = ?, etat = ?,
      date_entree = ?, date_sortie = ?,
      autres_infos = ?, photo = ?, custom_fields = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    reference?.trim() ?? item.reference,
    designation?.trim() ?? item.designation,
    categorie ?? item.categorie,
    emplacement ?? item.emplacement,
    quantite !== undefined ? parseInt(quantite) : item.quantite,
    seuil !== undefined ? parseInt(seuil) : item.seuil,
    etat ?? item.etat,
    date_entree ?? item.date_entree,
    date_sortie ?? item.date_sortie,
    autres_infos ?? item.autres_infos,
    photo ?? item.photo,
    custom_fields ? JSON.stringify(custom_fields) : item.custom_fields,
    req.params.id
  );

  const label = `${item.reference} — ${item.designation}`;
  db.prepare(`
    INSERT INTO history (id, user_id, user_name, action, detail, base_id, item_id, ip_address)
    VALUES (?, ?, ?, 'Article modifié', ?, ?, ?, ?)
  `).run(uuidv4(), req.user.id, req.user.name, label, item.base_id, req.params.id, req.ip);

  res.json({ success: true });
});

// ─── DELETE /api/items/:id ────────────────────────────────────────────────────
router.delete('/:id', requireWrite, (req, res) => {
  const db = getDb();
  const item = db.prepare(`SELECT * FROM items WHERE id = ?`).get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Article introuvable' });

  db.prepare(`DELETE FROM items WHERE id = ?`).run(req.params.id);

  db.prepare(`
    INSERT INTO history (id, user_id, user_name, action, detail, base_id, item_id, ip_address)
    VALUES (?, ?, ?, 'Article supprimé', ?, ?, ?, ?)
  `).run(uuidv4(), req.user.id, req.user.name,
    `${item.reference} — ${item.designation}`, item.base_id, req.params.id, req.ip);

  res.json({ success: true });
});

// ─── POST /api/items/bulk — Import multiple articles ─────────────────────────
router.post('/bulk', requireWrite, (req, res) => {
  const { base_id, items } = req.body;
  if (!base_id || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'base_id et articles requis' });
  }

  const db = getDb();
  const base = db.prepare(`SELECT * FROM bases WHERE id = ? AND is_active = 1`).get(base_id);
  if (!base) return res.status(404).json({ error: 'Base introuvable' });

  const today = new Date().toISOString().slice(0, 10);
  const insertItem = db.prepare(`
    INSERT INTO items (id, base_id, reference, designation, categorie, emplacement,
      quantite, seuil, etat, date_entree, autres_infos, custom_fields, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', ?)
  `);

  const insertBulk = db.transaction((items) => {
    let count = 0;
    for (const item of items) {
      if (!item.reference || !item.designation) continue;
      insertItem.run(
        uuidv4(), base_id,
        String(item.reference).trim(), String(item.designation).trim(),
        item.categorie || '', item.emplacement || '',
        parseInt(item.quantite) || 0, parseInt(item.seuil) || 0,
        item.etat || 'en_stock', item.date_entree || today,
        item.autres_infos || '', req.user.id
      );
      count++;
    }
    return count;
  });

  const count = insertBulk(items);

  db.prepare(`
    INSERT INTO history (id, user_id, user_name, action, detail, base_id, ip_address)
    VALUES (?, ?, ?, 'Import en masse', ?, ?, ?)
  `).run(uuidv4(), req.user.id, req.user.name, `${count} articles importés`, base_id, req.ip);

  res.status(201).json({ count });
});

// ─── GET /api/items/stats — Statistiques globales pour le dashboard ───────────
router.get('/stats', (req, res) => {
  const db = getDb();

  const total   = db.prepare(`SELECT COUNT(*) as n FROM items i JOIN bases b ON b.id=i.base_id WHERE b.is_active=1`).get().n;
  const inStock = db.prepare(`SELECT COUNT(*) as n FROM items i JOIN bases b ON b.id=i.base_id WHERE b.is_active=1 AND i.etat='en_stock'`).get().n;
  const outStock= db.prepare(`SELECT COUNT(*) as n FROM items i JOIN bases b ON b.id=i.base_id WHERE b.is_active=1 AND i.etat='sorti'`).get().n;
  const lowStock= db.prepare(`SELECT COUNT(*) as n FROM items i JOIN bases b ON b.id=i.base_id WHERE b.is_active=1 AND i.etat='en_stock' AND i.seuil>0 AND i.quantite<=i.seuil`).get().n;
  const clients = db.prepare(`SELECT COUNT(*) as n FROM bases WHERE is_active=1`).get().n;

  const categories = db.prepare(`
    SELECT COALESCE(i.categorie,'Sans catégorie') as categorie,
           COUNT(*) as total,
           SUM(CASE WHEN i.etat='en_stock' THEN 1 ELSE 0 END) as en_stock
    FROM items i JOIN bases b ON b.id=i.base_id
    WHERE b.is_active=1
    GROUP BY categorie ORDER BY total DESC LIMIT 6
  `).all();

  res.json({ total, inStock, outStock, lowStock, clients, categories });
});


module.exports = router;
