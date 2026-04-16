// server/routes/auth.js — Authentification par email + invitations
'use strict';
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');
const { getDb } = require('../db/init');
const { requireAuth, hashToken } = require('../middleware/auth');
const { sendInvitation } = require('../services/email');

// ─── Rate limiting login (5 tentatives / 15 min) ──────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Trop de tentatives. Réessayez dans 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── GET /api/auth/users-list (public) ───────────────────────────────────────
router.get('/users-list', (req, res) => {
  const db = getDb();
  const count = db.prepare(`SELECT COUNT(*) as n FROM users WHERE is_active = 1`).get();
  res.json({ count: count.n, loginMode: 'email' });
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', loginLimiter, (req, res) => {
  const { email, password } = req.body;

  if (!email?.trim() || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }

  const db = getDb();
  const user = db.prepare(`
    SELECT * FROM users WHERE LOWER(email) = LOWER(?) AND is_active = 1
  `).get(email.trim());

  if (!user || !user.password_hash || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
  }

  const expiresIn = process.env.JWT_EXPIRES_IN || '8h';
  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn }
  );

  const expiresMs = expiresIn.endsWith('h') ? parseInt(expiresIn) * 3600000 : 28800000;
  const expiresAt = new Date(Date.now() + expiresMs).toISOString().replace('T', ' ').slice(0, 19);

  const sessionId = uuidv4();
  db.prepare(`
    INSERT INTO sessions (id, user_id, token_hash, expires_at, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(sessionId, user.id, hashToken(token), expiresAt, req.ip, req.headers['user-agent']?.slice(0, 200) || '');

  db.prepare(`UPDATE users SET last_login = datetime('now') WHERE id = ?`).run(user.id);

  db.prepare(`
    INSERT INTO history (id, user_id, user_name, action, detail, ip_address)
    VALUES (?, ?, ?, 'Connexion', 'Connexion réussie', ?)
  `).run(uuidv4(), user.id, user.name, req.ip);

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      color: user.color,
      mustChangePassword: !!user.must_change_password,
    },
  });
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
router.post('/logout', requireAuth, (req, res) => {
  const db = getDb();
  const token = req.headers['authorization']?.slice(7);
  if (token) db.prepare(`DELETE FROM sessions WHERE token_hash = ?`).run(hashToken(token));

  db.prepare(`
    INSERT INTO history (id, user_id, user_name, action, ip_address)
    VALUES (?, ?, ?, 'Déconnexion', ?)
  `).run(uuidv4(), req.user.id, req.user.name, req.ip);

  res.json({ success: true });
});

// ─── POST /api/auth/change-password ──────────────────────────────────────────
router.post('/change-password', requireAuth, (req, res) => {
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'Le mot de passe doit faire au moins 8 caractères' });
  }

  const db = getDb();
  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.user.id);

  if (!user) {
    return res.status(404).json({ error: 'Utilisateur introuvable' });
  }

  const newHash = bcrypt.hashSync(newPassword, 12);

  db.prepare(`
    UPDATE users 
    SET password_hash = ?, must_change_password = 0 
    WHERE id = ?
  `).run(newHash, req.user.id);

  // Supprimer toutes les autres sessions
  db.prepare(`DELETE FROM sessions WHERE user_id = ?`).run(req.user.id);

  db.prepare(`
    INSERT INTO history (id, user_id, user_name, action, detail, ip_address)
    VALUES (?, ?, ?, 'Changement de mot de passe', 'Premier changement après création', ?)
  `).run(uuidv4(), req.user.id, req.user.name, req.ip);

  res.json({ 
    success: true, 
    message: 'Mot de passe mis à jour avec succès' 
  });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', requireAuth, (req, res) => {
  const db = getDb();
  const user = db.prepare(`
    SELECT id, name, email, role, color, must_change_password, email_alerts, last_login, created_at, client_base_id
    FROM users WHERE id = ?
  `).get(req.user.id);
  res.json(user);
});

// ─── POST /api/auth/invite ────────────────────────────────────────────────────
router.post('/invite', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Réservé aux administrateurs' });

  const { email, name, role, color, client_base_id } = req.body;
  if (!email?.trim() || !name?.trim())
    return res.status(400).json({ error: 'Email et nom requis' });

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  if (!validEmail)
    return res.status(400).json({ error: 'Adresse email invalide' });

  if (role === 'client' && !client_base_id)
    return res.status(400).json({ error: 'Une base client doit être assignée pour le rôle client' });

  const db = getDb();

  const existing = db.prepare(`SELECT id FROM users WHERE LOWER(email) = LOWER(?)`).get(email.trim());
  if (existing)
    return res.status(409).json({ error: 'Cet email est déjà associé à un compte' });

  db.prepare(`DELETE FROM invitations WHERE LOWER(email) = LOWER(?) AND is_used = 0`).run(email.trim());

  const token = uuidv4() + '-' + uuidv4();
  const expiresAt = new Date(Date.now() + 48 * 3600000).toISOString().replace('T', ' ').slice(0, 19);

  db.prepare(`
    INSERT INTO invitations (id, email, name, role, color, token, invited_by, expires_at, client_base_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(uuidv4(), email.trim().toLowerCase(), name.trim(), role || 'user', color || '#0065FF', token, req.user.id, expiresAt, client_base_id || null);

  const emailResult = await sendInvitation({
    to: email.trim(),
    name: name.trim(),
    invitedBy: req.user.name || 'Admin',
    token,
    role: role || 'user',
  });

  db.prepare(`
    INSERT INTO history (id, user_id, user_name, action, detail, ip_address)
    VALUES (?, ?, ?, 'Invitation envoyée', ?, ?)
  `).run(uuidv4(), req.user.id, req.user.name, `${name} <${email}>`, req.ip);

  res.json({
    success: true,
    emailSent: emailResult.ok,
    emailError: emailResult.reason || null,
  });
});

// ─── GET /api/auth/activate/:token ───────────────────────────────────────────
router.get('/activate/:token', (req, res) => {
  const db = getDb();
  const inv = db.prepare(`
    SELECT * FROM invitations
    WHERE token = ? AND is_used = 0 AND expires_at > datetime('now')
  `).get(req.params.token);

  if (!inv) return res.status(404).json({ error: 'Lien invalide ou expiré' });

  res.json({
    valid: true,
    name: inv.name,
    email: inv.email,
    role: inv.role,
  });
});

// ─── POST /api/auth/activate ─────────────────────────────────────────────────
router.post('/activate', (req, res) => {
  const { token, password } = req.body;

  if (!token || !password || password.length < 8)
    return res.status(400).json({ error: 'Token et mot de passe (min 8 caractères) requis' });

  const db = getDb();
  const inv = db.prepare(`
    SELECT * FROM invitations
    WHERE token = ? AND is_used = 0 AND expires_at > datetime('now')
  `).get(token);

  if (!inv) return res.status(404).json({ error: 'Lien invalide ou expiré' });

  const userId = uuidv4();
  const hash = bcrypt.hashSync(password, 12);

  try {
    db.prepare(`
      INSERT INTO users (id, name, email, role, color, password_hash, must_change_password, is_active, client_base_id)
      VALUES (?, ?, ?, ?, ?, ?, 0, 1, ?)
    `).run(userId, inv.name, inv.email, inv.role, inv.color, hash, inv.client_base_id || null);
  } catch (err) {
    console.error('[activation] Erreur INSERT users:', err.message);
    return res.status(500).json({ error: 'Impossible de créer le compte. Contactez l\'administrateur.' });
  }

  db.prepare(`
    UPDATE invitations SET is_used = 1, used_at = datetime('now') WHERE id = ?
  `).run(inv.id);

  db.prepare(`
    INSERT INTO history (id, user_id, user_name, action, detail)
    VALUES (?, ?, ?, 'Compte activé', ?)
  `).run(uuidv4(), userId, inv.name, `Compte activé via invitation (${inv.email})`);

  const expiresIn = process.env.JWT_EXPIRES_IN || '8h';
  const jwtToken = jwt.sign({ userId, role: inv.role }, process.env.JWT_SECRET, { expiresIn });

  const expiresMs = expiresIn.endsWith('h') ? parseInt(expiresIn) * 3600000 : 28800000;
  const expiresAt = new Date(Date.now() + expiresMs).toISOString().replace('T', ' ').slice(0, 19);

  db.prepare(`
    INSERT INTO sessions (id, user_id, token_hash, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(uuidv4(), userId, hashToken(jwtToken), expiresAt);

  res.json({
    success: true,
    token: jwtToken,
    user: {
      id: userId,
      name: inv.name,
      email: inv.email,
      role: inv.role,
      color: inv.color,
      mustChangePassword: false,
      client_base_id: inv.client_base_id || null
    },
  });
});

// ─── GET /api/auth/invitations ───────────────────────────────────────────────
router.get('/invitations', requireAuth, (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Réservé aux administrateurs' });

  const db = getDb();
  const list = db.prepare(`
    SELECT i.id, i.email, i.name, i.role, i.color, i.created_at, i.expires_at,
           u.name as invited_by_name
    FROM invitations i
    LEFT JOIN users u ON u.id = i.invited_by
    WHERE i.is_used = 0 AND i.expires_at > datetime('now')
    ORDER BY i.created_at DESC
  `).all();
  res.json(list);
});

// ─── DELETE /api/auth/invitations/:id ────────────────────────────────────────
router.delete('/invitations/:id', requireAuth, (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Réservé aux administrateurs' });

  const db = getDb();
  db.prepare(`DELETE FROM invitations WHERE id = ?`).run(req.params.id);
  res.json({ success: true });
});

module.exports = router;