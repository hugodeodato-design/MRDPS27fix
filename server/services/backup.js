// services/backup.js — Sauvegarde automatique SQLite
'use strict';
const fs   = require('fs');
const path = require('path');
const { getDb } = require('../db/init');

const DB_PATH     = process.env.DB_PATH     || './data/mrdpstock.db';
const BACKUP_DIR  = process.env.BACKUP_DIR  || './data/backups';
const BACKUP_KEEP = parseInt(process.env.BACKUP_KEEP || '7'); // jours à conserver

// ─── Créer une sauvegarde ─────────────────────────────────────────────────────
async function createBackup() {
  try {
    if (!fs.existsSync(BACKUP_DIR))
      fs.mkdirSync(BACKUP_DIR, { recursive: true });

    const ts       = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `mrdpstock-backup-${ts}.db`;
    const destPath = path.join(BACKUP_DIR, filename);

    // backup() est natif better-sqlite3 — copie à chaud en mode WAL
    const db = getDb();
    await db.backup(destPath);

    const size = fs.statSync(destPath).size;
    console.log(`[BACKUP] ✅ Sauvegarde créée : ${filename} (${Math.round(size/1024)} Ko)`);

    // Nettoyer les anciennes sauvegardes
    purgeOldBackups();

    return { ok: true, filename, size };
  } catch (e) {
    console.error('[BACKUP] ❌ Erreur :', e.message);
    return { ok: false, error: e.message };
  }
}

// ─── Supprimer les sauvegardes > BACKUP_KEEP jours ───────────────────────────
function purgeOldBackups() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) return;
    const cutoff = Date.now() - BACKUP_KEEP * 24 * 3600 * 1000;
    const files  = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('mrdpstock-backup-') && f.endsWith('.db'));

    let deleted = 0;
    for (const f of files) {
      const fp   = path.join(BACKUP_DIR, f);
      const mtime = fs.statSync(fp).mtimeMs;
      if (mtime < cutoff) { fs.unlinkSync(fp); deleted++; }
    }
    if (deleted > 0) console.log(`[BACKUP] 🗑 ${deleted} ancienne(s) sauvegarde(s) supprimée(s)`);
  } catch (e) {
    console.error('[BACKUP] Erreur purge :', e.message);
  }
}

// ─── Lister les sauvegardes disponibles ──────────────────────────────────────
function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  return fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('mrdpstock-backup-') && f.endsWith('.db'))
    .map(f => {
      const fp   = path.join(BACKUP_DIR, f);
      const stat = fs.statSync(fp);
      return { filename: f, size: stat.size, createdAt: stat.mtime.toISOString() };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ─── Planifier la sauvegarde automatique ─────────────────────────────────────
// Déclenche chaque heure, exécute réellement à l'heure configurée (BACKUP_HOUR)
function scheduleBackups() {
  const targetHour = parseInt(process.env.BACKUP_HOUR || '2'); // 2h du matin par défaut

  const tick = () => {
    const now = new Date();
    if (now.getHours() === targetHour && now.getMinutes() < 5) {
      createBackup();
    }
  };

  // Première vérification 1 min après démarrage
  setTimeout(tick, 60 * 1000);
  // Puis toutes les heures
  setInterval(tick, 60 * 60 * 1000);

  console.log(`[BACKUP] 🕐 Planification active — sauvegarde quotidienne à ${targetHour}h00`);
}

module.exports = { createBackup, listBackups, scheduleBackups, purgeOldBackups };
