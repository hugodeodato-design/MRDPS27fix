// db/init.js — Initialisation SQLite MRDPSTOCK v3
'use strict';
const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');
const bcrypt   = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = process.env.DB_PATH || './data/mrdpstock.db';
const dir     = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('synchronous = NORMAL');
    db.pragma('cache_size = -8000');  // 8MB cache
  }
  return db;
}

function initDb() {
  const db = getDb();

  // ── Schéma complet ──────────────────────────────────────────────────────────
  db.exec(`
    -- Utilisateurs (avec email)
    CREATE TABLE IF NOT EXISTS users (
      id                   TEXT PRIMARY KEY,
      name                 TEXT NOT NULL,
      email                TEXT UNIQUE,
      role                 TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin','user','viewer','client')),
      color                TEXT NOT NULL DEFAULT '#00875A',
      password_hash        TEXT,
      must_change_password INTEGER NOT NULL DEFAULT 0,
      email_alerts         INTEGER NOT NULL DEFAULT 1,
      last_login           TEXT,
      created_at           TEXT NOT NULL DEFAULT (datetime('now')),
      is_active            INTEGER NOT NULL DEFAULT 1
    );

    -- Sessions JWT
    CREATE TABLE IF NOT EXISTS sessions (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash  TEXT NOT NULL UNIQUE,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at  TEXT NOT NULL,
      last_seen   TEXT NOT NULL DEFAULT (datetime('now')),
      ip_address  TEXT,
      user_agent  TEXT
    );

    -- Invitations par email
    CREATE TABLE IF NOT EXISTS invitations (
      id           TEXT PRIMARY KEY,
      email        TEXT NOT NULL,
      name         TEXT NOT NULL,
      role         TEXT NOT NULL DEFAULT 'user',
      color        TEXT NOT NULL DEFAULT '#0065FF',
      token        TEXT NOT NULL UNIQUE,
      invited_by   TEXT REFERENCES users(id),
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at   TEXT NOT NULL,
      used_at      TEXT,
      is_used      INTEGER NOT NULL DEFAULT 0,
      client_base_id TEXT REFERENCES bases(id)
    );

    -- Bases clients
    CREATE TABLE IF NOT EXISTS bases (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      created_by  TEXT REFERENCES users(id),
      is_active   INTEGER NOT NULL DEFAULT 1
    );

    -- Articles
    CREATE TABLE IF NOT EXISTS items (
      id            TEXT PRIMARY KEY,
      base_id       TEXT NOT NULL REFERENCES bases(id) ON DELETE CASCADE,
      reference     TEXT NOT NULL,
      designation   TEXT NOT NULL,
      categorie     TEXT,
      emplacement   TEXT,
      quantite      INTEGER NOT NULL DEFAULT 0,
      seuil         INTEGER DEFAULT 0,
      etat          TEXT NOT NULL DEFAULT 'en_stock' CHECK(etat IN ('en_stock','sorti','maintenance','rebut')),
      date_entree   TEXT,
      date_sortie   TEXT,
      autres_infos  TEXT,
      photo         TEXT,
      custom_fields TEXT DEFAULT '{}',
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
      created_by    TEXT REFERENCES users(id)
    );

    -- Mouvements de stock (entrées/sorties/transferts)
    CREATE TABLE IF NOT EXISTS mouvements (
      id            TEXT PRIMARY KEY,
      item_id       TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      base_id       TEXT NOT NULL REFERENCES bases(id),
      type          TEXT NOT NULL CHECK(type IN ('entree','sortie','transfert','ajustement')),
      quantite      INTEGER NOT NULL,
      quantite_avant INTEGER NOT NULL DEFAULT 0,
      quantite_apres INTEGER NOT NULL DEFAULT 0,
      base_dest_id  TEXT REFERENCES bases(id),
      motif         TEXT,
      user_id       TEXT REFERENCES users(id),
      user_name     TEXT NOT NULL,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      ip_address    TEXT
    );

    -- Historique global des actions
    CREATE TABLE IF NOT EXISTS history (
      id          TEXT PRIMARY KEY,
      user_id     TEXT REFERENCES users(id),
      user_name   TEXT NOT NULL,
      action      TEXT NOT NULL,
      detail      TEXT,
      base_id     TEXT REFERENCES bases(id),
      item_id     TEXT,
      ip_address  TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Paramètres application
    CREATE TABLE IF NOT EXISTS settings (
      key         TEXT PRIMARY KEY,
      value       TEXT NOT NULL,
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Configuration colonnes par base
    CREATE TABLE IF NOT EXISTS columns_config (
      base_id     TEXT NOT NULL REFERENCES bases(id) ON DELETE CASCADE,
      config      TEXT NOT NULL DEFAULT '[]',
      updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (base_id)
    );

    -- Index performance
    CREATE INDEX IF NOT EXISTS idx_items_base_id    ON items(base_id);
    CREATE INDEX IF NOT EXISTS idx_items_etat       ON items(etat);
    CREATE INDEX IF NOT EXISTS idx_items_reference  ON items(reference);
    CREATE INDEX IF NOT EXISTS idx_history_created  ON history(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_sessions_token   ON sessions(token_hash);
    CREATE INDEX IF NOT EXISTS idx_mouvements_item  ON mouvements(item_id);
    CREATE INDEX IF NOT EXISTS idx_mouvements_base  ON mouvements(base_id);
    CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
  `);

  // ── Migrations (colonnes ajoutées si absentes) ──────────────────────────────
  const cols = db.prepare(`PRAGMA table_info(users)`).all().map(c => c.name);
  if (!cols.includes('email'))
    db.exec(`ALTER TABLE users ADD COLUMN email TEXT`);
  if (!cols.includes('email_alerts'))
    db.exec(`ALTER TABLE users ADD COLUMN email_alerts INTEGER NOT NULL DEFAULT 1`);
  if (!cols.includes('client_base_id'))
    db.exec(`ALTER TABLE users ADD COLUMN client_base_id TEXT REFERENCES bases(id)`);

  // ── Migration CHECK constraint : ajouter le rôle 'client' si absent ─────────
  // SQLite ne supporte pas ALTER TABLE ... MODIFY COLUMN, on doit recréer la table
  const userSchema = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='users'`).get();
  if (userSchema && !userSchema.sql.includes("'client'")) {
    console.log('⚙️  Migration : ajout du rôle client dans la table users...');
    db.pragma('foreign_keys = OFF');
    db.exec(`
      CREATE TABLE users_migration_tmp (
        id                   TEXT PRIMARY KEY,
        name                 TEXT NOT NULL,
        email                TEXT UNIQUE,
        role                 TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin','user','viewer','client')),
        color                TEXT NOT NULL DEFAULT '#00875A',
        password_hash        TEXT,
        must_change_password INTEGER NOT NULL DEFAULT 0,
        email_alerts         INTEGER NOT NULL DEFAULT 1,
        last_login           TEXT,
        created_at           TEXT NOT NULL DEFAULT (datetime('now')),
        is_active            INTEGER NOT NULL DEFAULT 1,
        client_base_id       TEXT
      );
      INSERT INTO users_migration_tmp SELECT
        id, name, email, role, color, password_hash,
        must_change_password, email_alerts, last_login, created_at, is_active,
        CASE WHEN EXISTS(SELECT 1 FROM pragma_table_info('users') WHERE name='client_base_id')
             THEN client_base_id ELSE NULL END
      FROM users;
      DROP TABLE users;
      ALTER TABLE users_migration_tmp RENAME TO users;
    `);
    db.pragma('foreign_keys = ON');
    console.log('✅ Migration CHECK constraint users terminée');
  }

  // Migration invitations : ajout client_base_id si absent
  const invCols = db.prepare(`PRAGMA table_info(invitations)`).all().map(c => c.name);
  if (!invCols.includes('client_base_id'))
    db.exec(`ALTER TABLE invitations ADD COLUMN client_base_id TEXT REFERENCES bases(id)`);

  // ── Paramètres par défaut ───────────────────────────────────────────────────
  const insertSetting = db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`);
  for (const [k, v] of Object.entries({
    companyName:    'M.R.D.P.S 27',
    lowStockAlert:  'true',
    alertEmail:     '',
    dateFormat:     'DD/MM/YYYY',
    currency:       '€',
    language:       'fr',
    theme:          'dark',
    backupEnabled:  'true',
    backupHour:     '2',
  })) insertSetting.run(k, v);

  // ── Compte Admin (premier démarrage uniquement) ─────────────────────────────
  const existing = db.prepare(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`).get();
  if (!existing) {
    const hash = bcrypt.hashSync('admin1234', 12);
    db.prepare(`
      INSERT INTO users (id, name, email, role, color, password_hash, must_change_password)
      VALUES (?, 'Admin', ?, 'admin', '#00875A', ?, 1)
    `).run(uuidv4(), process.env.ADMIN_EMAIL || 'admin@mrdpstock.local', hash);
    console.log('✅ Admin créé — email:', process.env.ADMIN_EMAIL || 'admin@mrdpstock.local', '/ mdp: admin1234');
    console.log('⚠️  Changez le mot de passe dès la première connexion !');
  } else if (process.env.RESET_ADMIN === 'true') {
    const pwd  = process.env.ADMIN_PASSWORD || 'admin1234';
    const hash = bcrypt.hashSync(pwd, 12);
    db.prepare(`UPDATE users SET password_hash = ?, must_change_password = 1 WHERE role = 'admin'`).run(hash);
    if (process.env.ADMIN_EMAIL)
      db.prepare(`UPDATE users SET email = ? WHERE role = 'admin'`).run(process.env.ADMIN_EMAIL);
    console.log('✅ Admin réinitialisé via RESET_ADMIN=true');
    console.log('⚠️  Supprimez RESET_ADMIN de vos variables d\'env !');
  } else {
    console.log('✅ Admin existant conservé');
  }

  // ── Nettoyage sessions expirées et invitations périmées ─────────────────────
  db.prepare(`DELETE FROM sessions    WHERE expires_at < datetime('now')`).run();
  db.prepare(`DELETE FROM invitations WHERE expires_at < datetime('now') AND is_used = 0`).run();

  console.log(`✅ Base de données initialisée : ${DB_PATH}`);
  return db;
}

module.exports = { getDb, initDb };
