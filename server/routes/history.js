// routes/history.js — Historique des actions
const router = require('express').Router();
const { getDb } = require('../db/init');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// ─── GET /api/history?base_id=&search=&limit=&offset= ────────────────────────
router.get('/', (req, res) => {
  const { base_id, search, limit = 200, offset = 0 } = req.query;
  const db = getDb();

  let query = `
    SELECT
      id, user_id,
      COALESCE(user_name, 'Inconnu') as user_name,
      action,
      COALESCE(detail, '') as detail,
      base_id, item_id, ip_address,
      created_at
    FROM history WHERE 1=1`;
  const params = [];

  if (base_id) { query += ` AND base_id = ?`; params.push(base_id); }
  if (search) {
    query += ` AND (user_name LIKE ? OR action LIKE ? OR detail LIKE ?)`;
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), parseInt(offset));

  const rows = db.prepare(query).all(...params);

  // Retourner tableau direct pour compatibilité frontend
  res.json(rows);
});

module.exports = router;
