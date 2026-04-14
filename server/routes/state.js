// routes/state.js — Synchronisation état global frontend ↔ base de données
// Le frontend stocke toute la donnée dans un objet "state" (clients, users, history, settings)
// Ces routes font le pont entre ce modèle et les tables SQLite.
'use strict';
const router   = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/init');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// ─── GET /api/state — Construire l'état complet depuis la DB ──────────────────
router.get('/', (req, res) => {
  try {
    const db = getDb();

    // ── Bases + articles (= "clients" dans le modèle frontend) ──────────────
    const bases = db.prepare(`SELECT * FROM bases WHERE is_active = 1 ORDER BY name`).all();
    const clients = {};

    for (const base of bases) {
      const items = db.prepare(`SELECT * FROM items WHERE base_id = ? ORDER BY designation`).all(base.id)
        .map(item => ({
          ...item,
          custom_fields: item.custom_fields ? JSON.parse(item.custom_fields) : {},
        }));
      clients[base.id] = {
        name:      base.name,
        items,
        createdAt: base.created_at,
      };
    }

    // ── Utilisateurs (sans mots de passe) ────────────────────────────────────
    const users = db.prepare(`
      SELECT id, name, email, role, color, last_login, created_at, is_active,
             must_change_password, client_base_id
      FROM users ORDER BY name
    `).all().map(u => ({ ...u, pwdHash: '***' }));

    // ── Historique (500 dernières entrées) ────────────────────────────────────
    const history = db.prepare(`
      SELECT id, created_at as ts, user_name as user, action,
             COALESCE(detail,'') as detail, base_id, item_id
      FROM history ORDER BY created_at DESC LIMIT 500
    `).all();

    // ── Paramètres ────────────────────────────────────────────────────────────
    const settingRows = db.prepare(`SELECT key, value FROM settings`).all();
    const settings = Object.fromEntries(settingRows.map(r => [r.key, r.value]));

    // ── Config colonnes par base ───────────────────────────────────────────────
    const colRows = db.prepare(`SELECT base_id, config FROM columns_config`).all();
    const columnsMap = {};
    for (const row of colRows) {
      try { columnsMap[row.base_id] = JSON.parse(row.config); } catch {}
    }

    const state = {
      clients,
      users,
      history,
      settings,
      columnsMap,
      activeClient: null,
      activeUser:   null,
    };

    // Version = timestamp de la dernière modification (approximatif)
    const lastMod = db.prepare(`SELECT MAX(created_at) as ts FROM history`).get();
    const version = lastMod?.ts ? new Date(lastMod.ts).getTime() : Date.now();

    res.json({ state, version });
  } catch (err) {
    console.error('[GET /api/state]', err.message);
    res.status(500).json({ error: 'Erreur lors de la lecture de l\'état' });
  }
});

// ─── POST /api/state — Synchroniser l'état frontend vers la DB ───────────────
router.post('/', (req, res) => {
  // Seuls admin et user peuvent pousser des changements
  if (req.user.role === 'viewer' || req.user.role === 'client') {
    return res.status(403).json({ error: 'Accès en lecture seule' });
  }

  const { state } = req.body;
  if (!state) return res.json({ success: true, version: Date.now() }); // no-op

  try {
    const db = getDb();

    // ── Synchroniser les bases et articles ────────────────────────────────────
    if (state.clients && typeof state.clients === 'object') {
      const upsertBase = db.prepare(`
        INSERT INTO bases (id, name, created_by, is_active)
        VALUES (?, ?, ?, 1)
        ON CONFLICT(id) DO UPDATE SET name = excluded.name
      `);
      const insertColCfg = db.prepare(`
        INSERT INTO columns_config (base_id, config, updated_at) VALUES (?, '[]', datetime('now'))
        ON CONFLICT(base_id) DO NOTHING
      `);
      const upsertItem = db.prepare(`
        INSERT INTO items
          (id, base_id, reference, designation, categorie, emplacement,
           quantite, seuil, etat, date_entree, date_sortie, autres_infos, photo,
           custom_fields, created_by, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
          designation   = excluded.designation,
          categorie     = excluded.categorie,
          emplacement   = excluded.emplacement,
          quantite      = excluded.quantite,
          seuil         = excluded.seuil,
          etat          = excluded.etat,
          date_entree   = excluded.date_entree,
          date_sortie   = excluded.date_sortie,
          autres_infos  = excluded.autres_infos,
          photo         = excluded.photo,
          custom_fields = excluded.custom_fields,
          updated_at    = datetime('now')
      `);

      const syncClients = db.transaction(() => {
        for (const [baseId, client] of Object.entries(state.clients)) {
          if (!baseId || !client?.name) continue;
          upsertBase.run(baseId, client.name, req.user.id);
          insertColCfg.run(baseId);

          if (Array.isArray(client.items)) {
            for (const item of client.items) {
              if (!item?.id || !item?.reference) continue;
              upsertItem.run(
                item.id, baseId,
                String(item.reference).trim(),
                String(item.designation || '').trim(),
                item.categorie   || '',
                item.emplacement || '',
                parseInt(item.quantite) || 0,
                parseInt(item.seuil)    || 0,
                item.etat || 'en_stock',
                item.date_entree  || null,
                item.date_sortie  || null,
                item.autres_infos || '',
                item.photo        || '',
                JSON.stringify(item.custom_fields || {}),
                req.user.id
              );
            }
          }
        }
      });
      syncClients();
    }

    // ── Synchroniser les paramètres ───────────────────────────────────────────
    if (state.settings && typeof state.settings === 'object') {
      const upsertSetting = db.prepare(`
        INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
      `);
      for (const [k, v] of Object.entries(state.settings)) {
        if (k && v !== undefined) upsertSetting.run(k, String(v));
      }
    }

    res.json({ success: true, version: Date.now() });
  } catch (err) {
    console.error('[POST /api/state]', err.message);
    res.status(500).json({ error: 'Erreur lors de la synchronisation' });
  }
});

module.exports = router;
