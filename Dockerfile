# ─── Stage 1 : Build du frontend ─────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /app/client
COPY client/package.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# ─── Stage 2 : Image de production ───────────────────────────────────────────
FROM node:20-alpine

# Infos image
LABEL org.opencontainers.image.title="MRDPSTOCK"
LABEL org.opencontainers.image.description="Logiciel de gestion de stock"
LABEL org.opencontainers.image.version="2.0.0"

# Créer utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S mrdp && adduser -S -u 1001 -G mrdp mrdp

WORKDIR /app

# Installer dépendances serveur uniquement
COPY server/package.json ./server/
RUN cd server && npm install --production

# Copier le serveur
COPY server/ ./server/

# Copier le frontend buildé
COPY --from=frontend-builder /app/client/dist ./client/dist

# Créer les dossiers nécessaires
RUN mkdir -p /app/server/data && chown -R mrdp:mrdp /app

# Changer vers l'utilisateur non-root
USER mrdp

# Variables d'environnement par défaut
ENV NODE_ENV=production \
    PORT=3001 \
    DB_PATH=/app/server/data/mrdpstock.db

# Port exposé
EXPOSE 3001

# Volume pour la persistance de la BDD
VOLUME ["/app/server/data"]

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

WORKDIR /app/server
CMD ["node", "index.js"]
