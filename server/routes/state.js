// routes/state.js — Endpoint de compatibilité
const router = require('express').Router();
const { getDb } = require('../db/init');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// GET /api/state — retourne l'état complet
router.get('/', (req, res) => {
  const db = getDb();
  const bases = db.prepare(`SELECT * FROM bases WHERE is_active = 1`).all();
  const users = db.prepare(`SELECT id, name, email, role, color FROM users WHERE is_active = 1`).all();
  const settings = db.prepare(`SELECT key, value FROM settings`).all()
    .reduce((acc, {key, value}) => ({...acc, [key]: value}), {});

  res.json({
    state: { bases, users, settings },
    version: Date.now()
  });
});

module.exports = router;
