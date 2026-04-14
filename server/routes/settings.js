// routes/settings.js — Paramètres application
const router = require('express').Router();
const { getDb } = require('../db/init');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.use(requireAuth);

// ─── GET /api/settings ────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const db = getDb();
  const rows = db.prepare(`SELECT key, value FROM settings`).all();
  const settings = Object.fromEntries(rows.map(r => [r.key, r.value]));
  res.json(settings);
});

// ─── PUT /api/settings ────────────────────────────────────────────────────────
router.put('/', requireAdmin, (req, res) => {
  const db = getDb();
  const upsert = db.prepare(`
    INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `);

  const updateAll = db.transaction((data) => {
    for (const [key, value] of Object.entries(data)) {
      upsert.run(key, String(value));
    }
  });

  updateAll(req.body);
  res.json({ success: true });
});

module.exports = router;
