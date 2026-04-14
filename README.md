# 📦 MRDPSTOCK v2.0 — Logiciel de gestion de stock

Logiciel de gestion de stock professionnel — déploiement VPS avec backend sécurisé.

---

## 🏗️ Architecture

```
mrdpstock/
├── server/              # Backend Node.js + Express + SQLite
│   ├── db/init.js       # Schéma base de données
│   ├── middleware/auth.js  # JWT + sessions
│   ├── routes/
│   │   ├── auth.js      # Login / logout / changement mdp
│   │   ├── bases.js     # Bases de stock (CRUD)
│   │   ├── items.js     # Articles (CRUD + import en masse)
│   │   ├── history.js   # Historique des actions
│   │   ├── users.js     # Gestion utilisateurs
│   │   ├── settings.js  # Paramètres application
│   │   └── export.js    # Export Excel
│   └── index.js         # Serveur Express
├── client/              # Frontend React + Vite
│   └── src/
│       ├── components/views/  # Vues (Dashboard, Stock, Alertes…)
│       ├── hooks/useAuth.js   # Hook d'authentification
│       └── utils/api.js       # Client HTTP centralisé
├── docker-compose.yml
├── Dockerfile
└── scripts/backup.sh    # Sauvegarde automatique
```

---

## 🔐 Sécurité — Ce qui a changé vs v1

| Aspect | v1 (ancienne) | v2 (nouvelle) |
|--------|---------------|---------------|
| Stockage données | localStorage (navigateur) | SQLite sur serveur |
| Auth | Hash custom en JS | bcrypt + JWT signé |
| Sessions | Aucune | Table sessions — révocation possible |
| Rôles | Admin / User | **Admin / User / Viewer (lecture seule)** |
| Mots de passe | Hardcodé `admin1234` | Changement obligatoire au 1er login |
| Rate limiting | Aucun | 5 tentatives / 15 min sur login |
| Logs | Aucun | Historique complet avec IP |
| Headers HTTP | Aucun | Helmet (CSP, HSTS, etc.) |

---

## 🚀 Déploiement sur VPS

### Prérequis
- Docker + Docker Compose installés
- Ubuntu 20.04+ / Debian 11+
- Ports 80 et 3001 ouverts

### Étape 1 — Cloner et configurer

```bash
git clone <votre-repo> /opt/mrdpstock
cd /opt/mrdpstock

# Créer le fichier .env
cp server/.env.example server/.env
nano server/.env
```

**Modifiez obligatoirement dans `.env` :**
```env
# Générez une vraie clé secrète :
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

JWT_SECRET=votre_cle_aleatoire_generee_ici
```

### Étape 2 — Build et lancement

```bash
# Build et démarrage
docker-compose up -d --build

# Vérifier que ça tourne
docker-compose ps
docker-compose logs -f mrdpstock
```

### Étape 3 — Premier accès

1. Ouvrez `http://votre-ip:3001`
2. Connectez-vous avec : **Admin** / `admin1234`
3. **Changez immédiatement le mot de passe** (obligatoire au premier login)
4. Créez vos autres utilisateurs dans `Paramètres → Utilisateurs`

---

## 🔄 Développement local

### Prérequis
- Node.js 20+

### Lancement

```bash
# Installer toutes les dépendances
cd server && npm install && cd ..
cd client && npm install && cd ..

# Copier et configurer le .env
cp server/.env.example server/.env
# Éditez server/.env avec une clé JWT

# Lancer les deux serveurs en parallèle
npm run dev  # Lance server (port 3001) + client Vite (port 5173)
```

Le frontend est accessible sur `http://localhost:5173` et proxifie automatiquement les appels API vers `localhost:3001`.

---

## 💾 Sauvegarde automatique

```bash
# Rendre le script exécutable
chmod +x scripts/backup.sh

# Test manuel
./scripts/backup.sh

# Automatiser avec cron (tous les jours à 2h du matin)
crontab -e
# Ajouter :
# 0 2 * * * /opt/mrdpstock/scripts/backup.sh >> /var/log/mrdpstock-backup.log 2>&1
```

---

## 👥 Rôles utilisateurs

| Rôle | Voir | Créer/Modifier | Supprimer | Admin |
|------|------|----------------|-----------|-------|
| **Admin** | ✅ | ✅ | ✅ | ✅ |
| **User** | ✅ | ✅ | ✅ bases | ❌ |
| **Viewer** | ✅ | ❌ | ❌ | ❌ |

---

## 🌐 HTTPS avec Let's Encrypt (recommandé en production)

```bash
# Installer Certbot
apt install certbot -y

# Obtenir un certificat
certbot certonly --standalone -d votre-domaine.fr

# Activer Nginx avec SSL dans docker-compose.yml
docker-compose --profile with-nginx up -d
```

Décommentez ensuite le bloc HTTPS dans `docker/nginx.conf`.

---

## 🔧 Mise à jour

```bash
cd /opt/mrdpstock
git pull

# Sauvegarde avant mise à jour
./scripts/backup.sh

# Rebuild et restart
docker-compose down
docker-compose up -d --build
```

---

## 📊 API REST

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/auth/login` | Connexion |
| POST | `/api/auth/logout` | Déconnexion |
| POST | `/api/auth/change-password` | Changer mdp |
| GET | `/api/bases` | Liste des bases |
| POST | `/api/bases` | Créer une base |
| GET | `/api/items?base_id=` | Articles d'une base |
| POST | `/api/items` | Créer un article |
| PUT | `/api/items/:id` | Modifier un article |
| DELETE | `/api/items/:id` | Supprimer un article |
| POST | `/api/items/bulk` | Import en masse |
| GET | `/api/items/alerts` | Alertes stock bas |
| GET | `/api/history` | Historique |
| GET | `/api/export/base/:id` | Export Excel (une base) |
| GET | `/api/export/all` | Export Excel (tout) |
| GET | `/api/health` | Healthcheck |

Toutes les routes (sauf login) nécessitent le header :
```
Authorization: Bearer <votre-token-jwt>
```

---

## ❓ Support

- Vérifiez les logs : `docker-compose logs mrdpstock`
- Healthcheck : `curl http://localhost:3001/api/health`
