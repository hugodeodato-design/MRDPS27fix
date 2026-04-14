#!/bin/bash
# scripts/backup.sh — Sauvegarde automatique de la base de données MRDPSTOCK
# Usage : ./scripts/backup.sh
# Cron (sauvegarde quotidienne à 2h) : 0 2 * * * /opt/mrdpstock/scripts/backup.sh

set -euo pipefail

# ─── Configuration ────────────────────────────────────────────────────────────
BACKUP_DIR="/opt/mrdpstock/backups"
DB_SOURCE="/opt/mrdpstock/data/mrdpstock.db"  # Adaptez selon votre montage
KEEP_DAYS=30   # Nombre de jours de rétention
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/mrdpstock_${DATE}.db"

# ─── Via Docker ───────────────────────────────────────────────────────────────
# Utilise sqlite3 dans le container pour un backup cohérent (WAL mode)
CONTAINER="mrdpstock"

mkdir -p "$BACKUP_DIR"

echo "🔄 Sauvegarde MRDPSTOCK — $(date)"

# Backup avec sqlite3 .backup (safe en mode WAL)
if docker exec "$CONTAINER" sqlite3 /app/server/data/mrdpstock.db ".backup '/tmp/backup_${DATE}.db'" 2>/dev/null; then
    docker cp "${CONTAINER}:/tmp/backup_${DATE}.db" "$BACKUP_FILE"
    docker exec "$CONTAINER" rm -f "/tmp/backup_${DATE}.db"
    echo "✅ Sauvegarde créée : $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"
else
    # Fallback : copie directe du fichier (moins safe mais fonctionnel)
    docker cp "${CONTAINER}:/app/server/data/mrdpstock.db" "$BACKUP_FILE"
    echo "⚠️  Sauvegarde directe : $BACKUP_FILE"
fi

# Compression
gzip "$BACKUP_FILE"
echo "📦 Compressé : ${BACKUP_FILE}.gz"

# Nettoyage des anciennes sauvegardes
DELETED=$(find "$BACKUP_DIR" -name "*.db.gz" -mtime +${KEEP_DAYS} -delete -print | wc -l)
echo "🗑️  $DELETED ancienne(s) sauvegarde(s) supprimée(s) (rétention ${KEEP_DAYS}j)"

# Résumé
COUNT=$(find "$BACKUP_DIR" -name "*.db.gz" | wc -l)
echo "📊 Total : $COUNT sauvegarde(s) conservée(s)"
echo "✅ Terminé — $(date)"
