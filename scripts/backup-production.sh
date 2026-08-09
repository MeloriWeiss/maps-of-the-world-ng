#!/usr/bin/env bash

set -Eeuo pipefail

readonly PROJECT_DIR='/opt/gm-helper/backend'
readonly BACKUP_ROOT='/var/backups/gm-helper'
readonly POSTGRES_BACKUP_DIR="${BACKUP_ROOT}/postgresql"
readonly MINIO_BACKUP_DIR="${BACKUP_ROOT}/minio"
readonly RETENTION_DAYS="${GMHELPER_BACKUP_RETENTION_DAYS:-14}"
readonly TIMESTAMP="$(date '+%Y-%m-%d_%H-%M-%S')"
readonly POSTGRES_TEMP_FILE="${POSTGRES_BACKUP_DIR}/.${TIMESTAMP}.dump.tmp"
readonly POSTGRES_BACKUP_FILE="${POSTGRES_BACKUP_DIR}/${TIMESTAMP}.dump"
readonly MINIO_TEMP_DIR="${MINIO_BACKUP_DIR}/.${TIMESTAMP}.tmp"
readonly MINIO_SNAPSHOT_DIR="${MINIO_BACKUP_DIR}/${TIMESTAMP}"
readonly MINIO_ENV_FILE="$(mktemp)"

cleanup() {
  rm -f -- "${POSTGRES_TEMP_FILE}"
  rm -rf -- "${MINIO_TEMP_DIR}"
  rm -f -- "${MINIO_ENV_FILE}"
}

trap cleanup EXIT
umask 077

if [[ ! "${RETENTION_DAYS}" =~ ^[1-9][0-9]*$ ]]; then
  printf 'GMHELPER_BACKUP_RETENTION_DAYS must be a positive integer\n' >&2
  exit 1
fi

mkdir -p -- "${POSTGRES_BACKUP_DIR}" "${MINIO_BACKUP_DIR}"

runuser -u postgres -- pg_dump --format=custom --compress=9 --dbname=gmhelper_prod > "${POSTGRES_TEMP_FILE}"
pg_restore --list "${POSTGRES_TEMP_FILE}" > /dev/null
mv -- "${POSTGRES_TEMP_FILE}" "${POSTGRES_BACKUP_FILE}"

mkdir -- "${MINIO_TEMP_DIR}"
grep -E '^OBJECT_STORAGE_(ENDPOINT|BUCKET|ACCESS_KEY|SECRET_KEY)=' "${PROJECT_DIR}/docker/.env.prod" > "${MINIO_ENV_FILE}"
[[ "$(wc -l < "${MINIO_ENV_FILE}")" -eq 4 ]]
docker run --rm --network docker_default --env-file "${MINIO_ENV_FILE}" --volume "${MINIO_TEMP_DIR}:/backup" --entrypoint /bin/sh quay.io/minio/mc:latest -c 'mc alias set source "$OBJECT_STORAGE_ENDPOINT" "$OBJECT_STORAGE_ACCESS_KEY" "$OBJECT_STORAGE_SECRET_KEY" && mc mirror --overwrite "source/$OBJECT_STORAGE_BUCKET" /backup'
mv -- "${MINIO_TEMP_DIR}" "${MINIO_SNAPSHOT_DIR}"

find "${POSTGRES_BACKUP_DIR}" -type f -name '*.dump' -mmin "+$((RETENTION_DAYS * 24 * 60))" -delete
find "${MINIO_BACKUP_DIR}" -mindepth 1 -maxdepth 1 -type d -mmin "+$((RETENTION_DAYS * 24 * 60))" -exec rm -rf -- {} +

trap - EXIT

printf 'Created PostgreSQL backup: %s\n' "${POSTGRES_BACKUP_FILE}"
printf 'Created MinIO snapshot: %s\n' "${MINIO_SNAPSHOT_DIR}"
