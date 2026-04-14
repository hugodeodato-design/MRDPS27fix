// routes/admin.js — Routes administration (backup, alertes, diagnostic)
'use strict';
const router = require('express').Router();
const path   = require('path');
const fs     = require('fs');
const { requireAuth } = require('../middleware/auth');
const { createBackup, listBackups } = require('../services/backup');
const { checkAndSendAlerts }        = require('../services/alerts');
const { getTransporter }            = require('../services/email');

router.use(requireAuth);

// ─── Seuls les admins accèdent à ces routes ───────────────────────────────────
router.use((req, res, next) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Réservé aux administrateurs' });
  next();
});

// ─── GET /api/admin/backups — Liste des sauvegardes ──────────────────────────
router.get('/backups', (req, res) => {
  res.json(listBackups());
});

// ─── POST /api/admin/backups — Créer une sauvegarde manuelle ─────────────────
router.post('/backups', async (req, res) => {
  const result = await createBackup();
  if (result.ok) res.json(result);
  else res.status(500).json({ error: result.error });
});

// ─── GET /api/admin/backups/:filename — Télécharger une sauvegarde ────────────
router.get('/backups/:filename', (req, res) => {
  const BACKUP_DIR = process.env.BACKUP_DIR || './data/backups';
  const filename   = path.basename(req.params.filename); // sécurité path traversal
  const filepath   = path.join(BACKUP_DIR, filename);

  if (!filename.startsWith('mrdpstock-backup-') || !filename.endsWith('.db'))
    return res.status(400).json({ error: 'Fichier invalide' });

  if (!fs.existsSync(filepath))
    return res.status(404).json({ error: 'Sauvegarde introuvable' });

  res.download(filepath, filename);
});

// ─── DELETE /api/admin/backups/:filename — Supprimer une sauvegarde ───────────
router.delete('/backups/:filename', (req, res) => {
  const BACKUP_DIR = process.env.BACKUP_DIR || './data/backups';
  const filename   = path.basename(req.params.filename);
  const filepath   = path.join(BACKUP_DIR, filename);

  if (!filename.startsWith('mrdpstock-backup-'))
    return res.status(400).json({ error: 'Fichier invalide' });

  if (!fs.existsSync(filepath))
    return res.status(404).json({ error: 'Introuvable' });

  fs.unlinkSync(filepath);
  res.json({ success: true });
});

// ─── POST /api/admin/alerts/test — Envoyer une alerte de test ────────────────
router.post('/alerts/test', async (req, res) => {
  await checkAndSendAlerts(true); // force = true (ignore cooldown)
  res.json({ success: true, message: 'Alerte envoyée (si des articles sont en dessous du seuil)' });
});

// ─── GET /api/admin/email/status — Tester la config SMTP ─────────────────────
router.get('/email/status', async (req, res) => {
  try {
    const t = await getTransporter();
    if (!t) {
      return res.json({
        ok: false,
        message: 'Variables SMTP_HOST / SMTP_USER / SMTP_PASS non configurées',
      });
    }
    await t.verify();
    res.json({ ok: true, message: 'Serveur SMTP accessible et authentification réussie' });
  } catch (e) {
    res.json({ ok: false, message: e.message });
  }
});

// ─── GET /api/admin/health — Diagnostic système ───────────────────────────────
router.get('/health', (req, res) => {
  const DB_PATH    = process.env.DB_PATH   || './data/mrdpstock.db';
  const BACKUP_DIR = process.env.BACKUP_DIR || './data/backups';

  const dbExists   = fs.existsSync(DB_PATH);
  const dbSize     = dbExists ? fs.statSync(DB_PATH).size : 0;
  const backups    = listBackups();

  res.json({
    uptime:         Math.floor(process.uptime()),
    memory:         process.memoryUsage(),
    nodeVersion:    process.version,
    database: {
      path:         DB_PATH,
      exists:       dbExists,
      sizeBytes:    dbSize,
      sizeKo:       Math.round(dbSize / 1024),
    },
    backups: {
      dir:          BACKUP_DIR,
      count:        backups.length,
      latest:       backups[0]?.createdAt || null,
    },
    email: {
      configured:   !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
      host:         process.env.SMTP_HOST || '(non configuré)',
    },
  });
});

module.exports = router;
