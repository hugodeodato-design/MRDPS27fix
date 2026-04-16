// routes/mouvements.js — Mouvements de stock (entrées, sorties, transferts)
'use strict';
const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const { getDb }      = require('../db/init');
const { requireAuth, requireWrite } = require('../middleware/auth');

router.use(requireAuth);

// Helper : retourne le client_base_id si rôle client, null sinon
function getClientBaseId(req) {
  if (req.user.role !== 'client') return null;
  const db = getDb();
  const user = db.prepare(`SELECT client_base_id FROM users WHERE id = ?`).get(req.user.id);
  return user?.client_base_id || null;
}

// ─── GET /api/mouvements?item_id=xxx&base_id=xxx&limit=50 ────────────────────
router.get('/', (req, res) => {
  const { item_id, base_id, type, limit = 100 } = req.query;
  const db = getDb();

  // Isolation client : force le filtrage sur sa propre base
  const clientBaseId = getClientBaseId(req);
  if (clientBaseId !== null) {
    if (base_id && base_id !== clientBaseId) {
      return res.status(403).json({ error: 'Accès non autorisé à cette base' });
    }
  }

  let query  = `SELECT m.*, i.reference, i.designation, b.name as base_name,
                       bd.name as base_dest_name
                FROM mouvements m
                JOIN items i ON i.id = m.item_id
                JOIN bases b ON b.id = m.base_id
                LEFT JOIN bases bd ON bd.id = m.base_dest_id
                WHERE 1=1`;
  const params = [];

  if (item_id) { query += ` AND m.item_id = ?`; params.push(item_id); }

  // Forcer la base du client si rôle client
  const effectiveBaseId = clientBaseId || base_id;
  if (effectiveBaseId) { query += ` AND m.base_id = ?`; params.push(effectiveBaseId); }

  if (type)    { query += ` AND m.type = ?`; params.push(type); }

  query += ` ORDER BY m.created_at DESC LIMIT ?`;
  params.push(parseInt(limit));

  res.json(db.prepare(query).all(...params));
});

// ─── POST /api/mouvements — Créer un mouvement ───────────────────────────────
router.post('/', requireWrite, (req, res) => {
  const { item_id, type, quantite, motif, base_dest_id } = req.body;

  if (!item_id || !type || !quantite || quantite <= 0)
    return res.status(400).json({ error: 'item_id, type et quantité > 0 requis' });

  const validTypes = ['entree', 'sortie', 'transfert', 'ajustement'];
  if (!validTypes.includes(type))
    return res.status(400).json({ error: `Type invalide. Valeurs : ${validTypes.join(', ')}` });

  if (type === 'transfert' && !base_dest_id)
    return res.status(400).json({ error: 'base_dest_id requis pour un transfert' });

  const db   = getDb();
  const item = db.prepare(`SELECT * FROM items WHERE id = ?`).get(item_id);
  if (!item) return res.status(404).json({ error: 'Article introuvable' });

  const qty       = parseInt(quantite);
  const qtyAvant  = item.quantite;
  let   qtyApres  = qtyAvant;
  let   newEtat   = item.etat;

  // Calcul nouvelle quantité
  if (type === 'entree' || type === 'ajustement') {
    qtyApres = Math.max(0, qtyAvant + qty);
  } else if (type === 'sortie') {
    if (qty > qtyAvant)
      return res.status(400).json({ error: `Stock insuffisant : ${qtyAvant} disponible(s)` });
    qtyApres = qtyAvant - qty;
  } else if (type === 'transfert') {
    if (qty > qtyAvant)
      return res.status(400).json({ error: `Stock insuffisant : ${qtyAvant} disponible(s)` });
    qtyApres = qtyAvant - qty;
  }

  if (qtyApres === 0) newEtat = 'sorti';
  if (qtyApres > 0 && item.etat === 'sorti') newEtat = 'en_stock';

  const today = new Date().toISOString().slice(0, 10);

  // Transaction atomique
  const doMouvement = db.transaction(() => {
    const mvtId = uuidv4();

    // Enregistrer le mouvement
    db.prepare(`
      INSERT INTO mouvements
        (id, item_id, base_id, type, quantite, quantite_avant, quantite_apres,
         base_dest_id, motif, user_id, user_name, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(mvtId, item_id, item.base_id, type, qty, qtyAvant, qtyApres,
           base_dest_id || null, motif || '', req.user.id, req.user.name, req.ip);

    // Mettre à jour l'article source
    const dateFields = type === 'entree'
      ? `date_entree = '${today}',`
      : type === 'sortie' && qtyApres === 0
        ? `date_sortie = '${today}',`
        : '';
    db.prepare(`
      UPDATE items SET quantite = ?, etat = ?, ${dateFields} updated_at = datetime('now')
      WHERE id = ?
    `).run(qtyApres, newEtat, item_id);

    // Si transfert : créer/mettre à jour l'article dans la base destination
    if (type === 'transfert' && base_dest_id) {
      const destBase = db.prepare(`SELECT * FROM bases WHERE id = ? AND is_active = 1`).get(base_dest_id);
      if (!destBase) throw new Error('Base destination introuvable');

      const destItem = db.prepare(`
        SELECT * FROM items WHERE base_id = ? AND reference = ?
      `).get(base_dest_id, item.reference);

      if (destItem) {
        // Article existe dans la base dest → incrémenter
        db.prepare(`
          UPDATE items SET quantite = quantite + ?, etat = 'en_stock', updated_at = datetime('now')
          WHERE id = ?
        `).run(qty, destItem.id);

        db.prepare(`
          INSERT INTO mouvements
            (id, item_id, base_id, type, quantite, quantite_avant, quantite_apres,
             motif, user_id, user_name)
          VALUES (?, ?, ?, 'entree', ?, ?, ?, ?, ?, ?)
        `).run(uuidv4(), destItem.id, base_dest_id, qty,
               destItem.quantite, destItem.quantite + qty,
               `Transfert depuis ${item.base_id}`, req.user.id, req.user.name);
      } else {
        // Créer l'article dans la base dest
        const newId = uuidv4();
        db.prepare(`
          INSERT INTO items
            (id, base_id, reference, designation, categorie, emplacement,
             quantite, seuil, etat, date_entree, autres_infos, custom_fields, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'en_stock', ?, ?, ?, ?)
        `).run(newId, base_dest_id, item.reference, item.designation,
               item.categorie || '', item.emplacement || '', qty,
               item.seuil || 0, today, item.autres_infos || '',
               item.custom_fields || '{}', req.user.id);
      }
    }

    // Historique
    const typeLabel = { entree: 'Entrée stock', sortie: 'Sortie stock', transfert: 'Transfert', ajustement: 'Ajustement' }[type];
    db.prepare(`
      INSERT INTO history (id, user_id, user_name, action, detail, base_id, item_id, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), req.user.id, req.user.name, typeLabel,
           `${item.reference} — ${item.designation} : ${qtyAvant} → ${qtyApres}${motif ? ' (' + motif + ')' : ''}`,
           item.base_id, item_id, req.ip);

    return { mvtId, qtyAvant, qtyApres };
  });

  try {
    const result = doMouvement();
    res.status(201).json({ success: true, ...result, newEtat });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ─── GET /api/mouvements/stats?base_id=xxx&days=30 ───────────────────────────
router.get('/stats', (req, res) => {
  const { base_id, days = 30 } = req.query;
  const db = getDb();

  // Isolation client
  const clientBaseId = getClientBaseId(req);
  if (clientBaseId !== null && base_id && base_id !== clientBaseId) {
    return res.status(403).json({ error: 'Accès non autorisé à cette base' });
  }

  const effectiveBaseId = clientBaseId || base_id;

  let where  = `WHERE m.created_at >= datetime('now', '-${parseInt(days)} days')`;
  const params = [];
  if (effectiveBaseId) { where += ` AND m.base_id = ?`; params.push(effectiveBaseId); }

  const stats = db.prepare(`
    SELECT type,
           COUNT(*) as nb_mouvements,
           SUM(quantite) as total_quantite,
           date(created_at) as jour
    FROM mouvements m
    ${where}
    GROUP BY type, jour
    ORDER BY jour DESC
  `).all(...params);

  res.json(stats);
});

module.exports = router;
