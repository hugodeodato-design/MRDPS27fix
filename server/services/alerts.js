// services/alerts.js — Alertes email automatiques (stock bas)
'use strict';
const { getDb }            = require('../db/init');
const { sendLowStockAlert } = require('./email');

let _lastAlertTime = 0;
const ALERT_COOLDOWN_MS = 4 * 3600 * 1000; // max 1 alerte toutes les 4h

// ─── Vérifier les stocks bas et envoyer les alertes ──────────────────────────
async function checkAndSendAlerts(force = false) {
  const now = Date.now();
  if (!force && now - _lastAlertTime < ALERT_COOLDOWN_MS) return;

  const db = getDb();

  // Vérifier si les alertes sont activées
  const setting = db.prepare(`SELECT value FROM settings WHERE key = 'lowStockAlert'`).get();
  if (setting?.value !== 'true') return;

  // Récupérer les articles en alerte
  const alerts = db.prepare(`
    SELECT i.*, b.name as base_name
    FROM items i
    JOIN bases b ON b.id = i.base_id
    WHERE i.quantite <= i.seuil AND i.seuil > 0 AND i.etat = 'en_stock' AND b.is_active = 1
    ORDER BY (i.seuil - i.quantite) DESC
  `).all();

  if (alerts.length === 0) return;

  // Récupérer l'email d'alerte configuré + tous les admins avec alertes actives
  const alertEmailSetting = db.prepare(`SELECT value FROM settings WHERE key = 'alertEmail'`).get();
  const recipients = db.prepare(`
    SELECT id, name, email FROM users
    WHERE role = 'admin' AND email_alerts = 1 AND email IS NOT NULL AND is_active = 1
  `).all();

  // Ajouter l'email global si configuré
  const extraEmail = alertEmailSetting?.value?.trim();
  if (extraEmail && !recipients.find(r => r.email === extraEmail)) {
    recipients.push({ id: 'global', name: 'Responsable Stock', email: extraEmail });
  }

  if (recipients.length === 0) {
    console.log(`[ALERTS] ${alerts.length} alertes stock bas — aucun destinataire email configuré`);
    return;
  }

  _lastAlertTime = now;

  // Envoyer à chaque destinataire
  for (const recipient of recipients) {
    if (!recipient.email) continue;
    const result = await sendLowStockAlert({
      to:     recipient.email,
      name:   recipient.name,
      alerts,
    });
    if (result.ok) {
      console.log(`[ALERTS] ✅ Alerte envoyée à ${recipient.email} (${alerts.length} articles)`);
    } else {
      console.error(`[ALERTS] ❌ Échec envoi à ${recipient.email} : ${result.reason}`);
    }
  }
}

// ─── Planifier les vérifications d'alertes ────────────────────────────────────
function scheduleAlerts() {
  // Vérification toutes les heures
  setInterval(() => checkAndSendAlerts(), 60 * 60 * 1000);
  // Première vérification 2 min après démarrage
  setTimeout(() => checkAndSendAlerts(), 2 * 60 * 1000);
  console.log('[ALERTS] 🔔 Surveillance des alertes stock activée (vérification horaire)');
}

module.exports = { checkAndSendAlerts, scheduleAlerts };
