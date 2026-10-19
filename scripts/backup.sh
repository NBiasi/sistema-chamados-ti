#!/bin/bash
set -euo pipefail

# Carrega variáveis do .env (relativo à raiz do projeto)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../.env"

BACKUP_DIR="/var/backups/sistema_chamados"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
CONTAINER_NAME="sistema_chamados_mysql"
DB_NAME="sistema_chamados_ti"

mkdir -p "$BACKUP_DIR"

docker exec "$CONTAINER_NAME" /usr/bin/mysqldump \
  -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$DB_NAME" \
  | gzip > "$BACKUP_DIR/backup_$TIMESTAMP.sql.gz"

find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +30 -delete

echo "Backup concluído: backup_$TIMESTAMP.sql.gz"