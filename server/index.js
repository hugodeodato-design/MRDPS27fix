// index.js — Serveur principal MRDPSTOCK v3
'use strict';
require('dotenv').config();

const express   = require('express');
const helmet    = require('helmet');
const cors      = require('cors');
const compression = require('compression');
const morgan    = require('morgan');
const path      = require('path');
const rateLimit = require('express-rate-limit');
const { initDb, getDb } = require('./db/init');
const { scheduleBackups } = require('./services/backup');
const { scheduleAlerts }  = require('./services/alerts');

// ─── Init DB ──────────────────────────────────────────────────────────────────
initDb();

const app  = express();
const PORT = parseInt(process.env.PORT) || 3001;

// ─── Trust proxy (Render, Nginx, etc.) ───────────────────────────────────────
app.set('trust proxy', 1);

// ─── Route publique AVANT middlewares ────────────────────────────────────────
// Compatibilité ancien client (retourne juste le mode de login)
app.get('/api/auth/users-list', (req, res) => {
  const db    = getDb();
  const count = db.prepare(`SELECT COUNT(*) as n FROM users WHERE is_active = 1`).get();
  res.json({ count: count.n, loginMode: 'email' });
});

// ─── Sécurité ─────────────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", "'unsafe-inline'"],
      styleSrc:   ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc:    ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc:     ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin:         true,
  credentials:    true,
  methods:        ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(compression());
app.use(morgan('dev'));

// ─── Rate limiting ─────────────────────────────────────────────────────────────
app.use('/api/', rateLimit({
  windowMs: 60 * 1000, max: 500,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Trop de requêtes, réessayez dans une minute' },
}));

// ─── Routes API ───────────────────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/users',      require('./routes/users'));
app.use('/api/bases',      require('./routes/bases'));
app.use('/api/items',      require('./routes/items'));
app.use('/api/mouvements', require('./routes/mouvements'));
app.use('/api/history',    require('./routes/history'));
app.use('/api/settings',   require('./routes/settings'));
app.use('/api/export',     require('./routes/export'));
app.use('/api/state', require('./routes/state'));
app.use('/api/admin',      require('./routes/admin'));

// ─── Healthcheck public ───────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '3.0.0', uptime: Math.floor(process.uptime()) });
});

// ─── Page d'activation (invitation) ──────────────────────────────────────────
// Redirige vers le frontend qui gère /activate?token=...
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

// ─── Erreurs ──────────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({ error: err.message });
});

// ─── Démarrage ────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   MRDPSTOCK v3.0 — Serveur démarré     ║');
  console.log('╠════════════════════════════════════════╣');
  console.log(`║  Adresse : http://localhost:${PORT}          ║`);
  console.log(`║  Base DB : ${(process.env.DB_PATH || './data/mrdpstock.db').padEnd(30)}║`);
  console.log('╚════════════════════════════════════════╝\n');

  // Services automatiques
  if (process.env.BACKUP_ENABLED !== 'false') scheduleBackups();
  scheduleAlerts();
});

process.on('SIGTERM', () => { console.log('\nArrêt propre...'); process.exit(0); });
process.on('SIGINT',  () => { console.log('\nArrêt...'); process.exit(0); });
