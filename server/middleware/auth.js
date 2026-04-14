// middleware/auth.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getDb } = require('../db/init');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const db = getDb();

    // Vérifier que l'utilisateur existe et est actif
    const user = db.prepare(`SELECT id, name, role, is_active FROM users WHERE id = ?`).get(payload.userId);

    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Compte inactif ou introuvable' });
    }

    req.user = {
      id: user.id,
      name: user.name,
      role: user.role,
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expiré' });
    }
    return res.status(401).json({ error: 'Token invalide' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
  }
  next();
}

function requireWrite(req, res, next) {
  if (req.user?.role === 'viewer' || req.user?.role === 'client') {
    return res.status(403).json({ error: 'Accès en lecture seule' });
  }
  next();
}

// Bloque les clients sur les routes qui ne leur sont pas destinées
function requireNotClient(req, res, next) {
  if (req.user?.role === 'client') {
    return res.status(403).json({ error: 'Accès non autorisé pour ce rôle' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin, requireWrite, requireNotClient, hashToken };
