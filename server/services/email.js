// services/email.js — Service email avec auto-découverte SMTP
'use strict';
const nodemailer = require('nodemailer');

const APP_URL = (process.env.APP_URL || 'http://localhost:3001').replace(/\/$/, '');
const FROM    = process.env.SMTP_FROM || `MRDPSTOCK <${process.env.SMTP_USER || 'noreply@mrdpstock.local'}>`;

// ─── Auto-découverte du transporteur ─────────────────────────────────────────
let _transporter = null;

async function getTransporter() {
  if (_transporter) return _transporter;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn('[EMAIL] Variables SMTP_HOST/SMTP_USER/SMTP_PASS manquantes — emails désactivés');
    return null;
  }

  if (process.env.SMTP_PORT) {
    const port   = parseInt(process.env.SMTP_PORT);
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    _transporter = nodemailer.createTransport({
      host, port, secure,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
    });
    console.log(`[EMAIL] SMTP configuré : ${host}:${port} (secure=${secure})`);
    return _transporter;
  }

  // Auto-découverte
  for (const cfg of [
    { port: 587, secure: false, name: 'STARTTLS 587' },
    { port: 465, secure: true,  name: 'SSL 465' },
    { port: 25,  secure: false, name: 'Plain 25' },
  ]) {
    try {
      const t = nodemailer.createTransport({
        host, port: cfg.port, secure: cfg.secure,
        auth: { user, pass },
        tls: { rejectUnauthorized: false },
        connectionTimeout: 5000,
        greetingTimeout: 5000,
      });
      await t.verify();
      _transporter = t;
      console.log(`[EMAIL] ✅ Auto-découvert : ${host}:${cfg.port} (${cfg.name})`);
      return _transporter;
    } catch (e) {
      console.log(`[EMAIL] ✗ ${cfg.name} : ${e.message}`);
    }
  }

  console.error('[EMAIL] ❌ Aucune config SMTP fonctionnelle');
  return null;
}

// ─── Template HTML de base ────────────────────────────────────────────────────
function wrapHtml(title, body) {
  return `<!DOCTYPE html><html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title></head>
<body style="margin:0;padding:0;background:#F0F2F5;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0"
  style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
  <tr><td style="background:linear-gradient(135deg,#00875A,#006644);padding:28px 40px;text-align:center;">
    <div style="color:#fff;font-size:22px;font-weight:800;">MRDPSTOCK</div>
    <div style="color:rgba(255,255,255,.6);font-size:11px;margin-top:3px;letter-spacing:2px;text-transform:uppercase;">Gestion de stock</div>
  </td></tr>
  <tr><td style="padding:36px 40px;">${body}</td></tr>
  <tr><td style="background:#F8FAFC;padding:16px 40px;text-align:center;border-top:1px solid #E8ECF1;">
    <div style="color:#8B9BB4;font-size:11px;">© ${new Date().getFullYear()} MRDPSTOCK — Email automatique, ne pas répondre.</div>
  </td></tr>
</table></td></tr></table></body></html>`;
}

// ─── Envoi générique ──────────────────────────────────────────────────────────
async function send({ to, subject, html, text, attachments }) {
  const t = await getTransporter();
  if (!t) return { ok: false, reason: 'SMTP non configuré' };
  try {
    await t.sendMail({ from: FROM, to, subject, html, text, attachments });
    return { ok: true };
  } catch (e) {
    _transporter = null;
    console.error('[EMAIL] Erreur :', e.message);
    return { ok: false, reason: e.message };
  }
}

// ─── Invitation ───────────────────────────────────────────────────────────────
async function sendInvitation({ to, name, invitedBy, token, role }) {
  const link      = `${APP_URL}/activate?token=${token}`;
  const roleLabel = { admin: 'Administrateur', viewer: 'Lecteur' }[role] || 'Utilisateur';

  const body = `
    <h2 style="margin:0 0 10px;color:#0D1B2A;font-size:20px;">Vous êtes invité !</h2>
    <p style="color:#4A5568;font-size:14px;line-height:1.7;margin:0 0 20px;">
      <strong>${invitedBy}</strong> vous invite à rejoindre <strong>MRDPSTOCK</strong>
      en tant que <strong>${roleLabel}</strong>.
    </p>
    <div style="background:#F0FDF4;border:1px solid #ABF5D1;border-radius:10px;padding:14px 18px;margin-bottom:24px;">
      <div style="font-size:11px;color:#006644;font-weight:700;text-transform:uppercase;margin-bottom:3px;">Votre compte</div>
      <div style="font-size:15px;font-weight:700;color:#0D1B2A;">${name}</div>
      <div style="font-size:13px;color:#4A5568;">${to}</div>
    </div>
    <p style="color:#4A5568;font-size:14px;line-height:1.7;margin:0 0 24px;">
      Cliquez ci-dessous pour activer votre compte et choisir votre mot de passe.<br>
      <strong>Ce lien expire dans 48 heures.</strong>
    </p>
    <div style="text-align:center;margin-bottom:24px;">
      <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#00875A,#006644);
        color:#fff;text-decoration:none;padding:13px 34px;border-radius:10px;font-size:15px;font-weight:700;">
        Activer mon compte
      </a>
    </div>
    <p style="color:#8B9BB4;font-size:12px;text-align:center;margin:0;word-break:break-all;">
      Lien direct : <a href="${link}" style="color:#00875A;">${link}</a>
    </p>`;

  return send({
    to, subject: 'Invitation MRDPSTOCK — Activez votre compte',
    html: wrapHtml('Invitation MRDPSTOCK', body),
    text: `Bonjour ${name},\n\n${invitedBy} vous invite sur MRDPSTOCK (${roleLabel}).\n\nActivez votre compte : ${link}\n\nCe lien expire dans 48h.`,
  });
}

// ─── Alerte stock bas ─────────────────────────────────────────────────────────
async function sendLowStockAlert({ to, name, alerts }) {
  const rows = alerts.slice(0, 20).map((a, i) => `
    <tr style="background:${i % 2 === 0 ? '#fff' : '#F8FAFC'}">
      <td style="padding:9px 12px;border-bottom:1px solid #E8ECF1;font-weight:600;color:#0D1B2A;">${a.designation}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #E8ECF1;color:#4A5568;font-size:12px;">${a.reference}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #E8ECF1;color:#4A5568;font-size:12px;">${a.base_name}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #E8ECF1;text-align:center;">
        <span style="background:#FFEBE6;color:#BF2600;font-weight:700;padding:2px 9px;border-radius:20px;font-size:12px;">${a.quantite}</span>
      </td>
      <td style="padding:9px 12px;border-bottom:1px solid #E8ECF1;text-align:center;color:#4A5568;font-size:12px;">${a.seuil}</td>
    </tr>`).join('');

  const body = `
    <div style="background:#FFFAE6;border:1px solid #FFE380;border-radius:10px;padding:14px 18px;margin-bottom:24px;">
      <div style="font-weight:700;color:#974F0C;font-size:15px;">⚠️ ${alerts.length} article${alerts.length > 1 ? 's' : ''} en alerte de stock</div>
      <div style="font-size:13px;color:#4A5568;margin-top:4px;">Bonjour ${name}, voici les stocks critiques.</div>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E8ECF1;border-radius:8px;overflow:hidden;font-size:13px;">
      <thead><tr style="background:#F8FAFC;">
        <th style="padding:9px 12px;text-align:left;font-size:11px;color:#8B9BB4;text-transform:uppercase;">Article</th>
        <th style="padding:9px 12px;text-align:left;font-size:11px;color:#8B9BB4;text-transform:uppercase;">Réf.</th>
        <th style="padding:9px 12px;text-align:left;font-size:11px;color:#8B9BB4;text-transform:uppercase;">Base</th>
        <th style="padding:9px 12px;text-align:center;font-size:11px;color:#8B9BB4;text-transform:uppercase;">Qté</th>
        <th style="padding:9px 12px;text-align:center;font-size:11px;color:#8B9BB4;text-transform:uppercase;">Seuil</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${alerts.length > 20 ? `<p style="text-align:center;color:#8B9BB4;font-size:12px;margin-top:10px;">… et ${alerts.length - 20} autres articles</p>` : ''}
    <div style="text-align:center;margin-top:24px;">
      <a href="${APP_URL}" style="display:inline-block;background:linear-gradient(135deg,#00875A,#006644);
        color:#fff;text-decoration:none;padding:11px 28px;border-radius:9px;font-size:14px;font-weight:600;">
        Voir le tableau de bord
      </a>
    </div>`;

  return send({
    to, subject: `⚠️ MRDPSTOCK — ${alerts.length} alerte${alerts.length > 1 ? 's' : ''} stock bas`,
    html: wrapHtml('Alertes stock bas', body),
    text: `Bonjour ${name},\n\n${alerts.length} article(s) en alerte :\n\n${alerts.slice(0,10).map(a => `- ${a.designation} (${a.reference}) : ${a.quantite}/${a.seuil} — ${a.base_name}`).join('\n')}\n\n${APP_URL}`,
  });
}

// ─── Rapport par email ────────────────────────────────────────────────────────
async function sendReport({ to, name, subject, pdfBuffer, filename }) {
  const body = `
    <p style="color:#4A5568;font-size:14px;line-height:1.7;">Bonjour <strong>${name}</strong>,</p>
    <p style="color:#4A5568;font-size:14px;line-height:1.7;margin-bottom:24px;">
      Votre rapport MRDPSTOCK est disponible en pièce jointe.
    </p>
    <div style="text-align:center;">
      <a href="${APP_URL}" style="display:inline-block;background:linear-gradient(135deg,#00875A,#006644);
        color:#fff;text-decoration:none;padding:11px 28px;border-radius:9px;font-size:14px;font-weight:600;">
        Accéder à MRDPSTOCK
      </a>
    </div>`;

  return send({
    to, subject,
    html: wrapHtml(subject, body),
    text: `Bonjour ${name},\nVotre rapport est en pièce jointe.\n${APP_URL}`,
    attachments: pdfBuffer ? [{ filename, content: pdfBuffer, contentType: 'application/pdf' }] : [],
  });
}

module.exports = { sendInvitation, sendLowStockAlert, sendReport, getTransporter };
