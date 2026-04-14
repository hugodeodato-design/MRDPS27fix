// routes/users.js — Gestion des utilisateurs
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/init');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Toutes les routes nécessitent auth
router.use(requireAuth);

// ─── GET /api/users ───────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const db = getDb();
  const users = db.prepare(`
    SELECT id, name, role, color, last_login, created_at, is_active, must_change_password, client_base_id
    FROM users ORDER BY name
  `).all();
  res.json(users);
});

// ─── POST /api/users ──────────────────────────────────────────────────────────
router.post('/', requireAdmin, (req, res) => {
  const { name, role, color, password, client_base_id } = req.body;

  if (!name?.trim() || !password) {
    return res.status(400).json({ error: 'Nom et mot de passe requis' });
  }
  if (!['admin', 'user', 'viewer', 'client'].includes(role)) {
    return res.status(400).json({ error: 'Rôle invalide' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Le mot de passe doit faire au moins 8 caractères' });
  }
  if (role === 'client' && !client_base_id) {
    return res.status(400).json({ error: 'Une base client doit être assignée pour le rôle client' });
  }

  const db = getDb();
  const id = uuidv4();
  const hash = bcrypt.hashSync(password, 12);

  db.prepare(`
    INSERT INTO users (id, name, role, color, password_hash, must_change_password, client_base_id)
    VALUES (?, ?, ?, ?, ?, 1, ?)
  `).run(id, name.trim(), role || 'user', color || '#00875A', hash, client_base_id || null);

  db.prepare(`
    INSERT INTO history (id, user_id, user_name, action, detail, ip_address)
    VALUES (?, ?, ?, 'Utilisateur créé', ?, ?)
  `).run(uuidv4(), req.user.id, req.user.name, `Nouvel utilisateur : ${name}`, req.ip);

  res.status(201).json({ id, name: name.trim(), role, color });
});

// ─── PUT /api/users/:id ───────────────────────────────────────────────────────
router.put('/:id', requireAdmin, (req, res) => {
  const { name, role, color, password, isActive, client_base_id } = req.body;
  const db = getDb();

  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

  // Empêcher de se rétrograder soi-même
  if (req.params.id === req.user.id && role && role !== 'admin') {
    return res.status(400).json({ error: 'Vous ne pouvez pas changer votre propre rôle admin' });
  }

  if (role === 'client' && !client_base_id) {
    return res.status(400).json({ error: 'Une base client doit être assignée pour le rôle client' });
  }

  const updates = {};
  if (name?.trim()) updates.name = name.trim();
  if (role && ['admin', 'user', 'viewer', 'client'].includes(role)) updates.role = role;
  if (color) updates.color = color;
  if (typeof isActive === 'boolean') updates.is_active = isActive ? 1 : 0;
  if (role === 'client' && client_base_id) updates.client_base_id = client_base_id;
  if (role && role !== 'client') updates.client_base_id = null;

  if (password) {
    if (password.length < 8) {
      return res.status(400).json({ error: 'Le mot de passe doit faire au moins 8 caractères' });
    }
    updates.password_hash = bcrypt.hashSync(password, 12);
    updates.must_change_password = 1;
    // Révoquer toutes les sessions de l'utilisateur si mdp changé
    db.prepare(`DELETE FROM sessions WHERE user_id = ?`).run(req.params.id);
  }

  const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values = [...Object.values(updates), req.params.id];
  db.prepare(`UPDATE users SET ${fields} WHERE id = ?`).run(...values);

  db.prepare(`
    INSERT INTO history (id, user_id, user_name, action, detail, ip_address)
    VALUES (?, ?, ?, 'Utilisateur modifié', ?, ?)
  `).run(uuidv4(), req.user.id, req.user.name, `Utilisateur : ${user.name}`, req.ip);

  res.json({ success: true });
});

// ─── DELETE /api/users/:id ────────────────────────────────────────────────────
router.delete('/:id', requireAdmin, (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
  }

  const db = getDb();

  // Vérifier qu'il reste au moins un admin
  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

  if (user.role === 'admin') {
    const adminCount = db.prepare(`SELECT COUNT(*) as c FROM users WHERE role = 'admin' AND is_active = 1`).get();
    if (adminCount.c <= 1) {
      return res.status(400).json({ error: 'Impossible : dernier administrateur actif' });
    }
  }

  // Désactivation (soft delete) plutôt que suppression pour conserver l'historique
  db.prepare(`UPDATE users SET is_active = 0 WHERE id = ?`).run(req.params.id);
  db.prepare(`DELETE FROM sessions WHERE user_id = ?`).run(req.params.id);

  db.prepare(`
    INSERT INTO history (id, user_id, user_name, action, detail, ip_address)
    VALUES (?, ?, ?, 'Utilisateur désactivé', ?, ?)
  `).run(uuidv4(), req.user.id, req.user.name, `Utilisateur : ${user.name}`, req.ip);

  res.json({ success: true });
});

module.exports = router;
