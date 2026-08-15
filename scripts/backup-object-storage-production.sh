#!/usr/bin/env bash

set -Eeuo pipefail

readonly PROJECT_DIR='/opt/gm-helper/backend'
readonly BACKUP_DIR='/var/backups/gm-helper/object-storage'
readonly LOCK_FILE='/run/lock/gmhelper/maintenance.lock'
readonly LOCK_WAIT_SECONDS="${GMHELPER_MAINTENANCE_LOCK_WAIT_SECONDS:-7200}"
readonly MIN_FREE_KIB="${GMHELPER_BACKUP_MIN_FREE_KIB:-1048576}"
readonly RETENTION_DAYS="${GMHELPER_OBJECT_STORAGE_BACKUP_RETENTION_DAYS:-14}"
readonly TIMESTAMP="$(date '+%Y-%m-%d_%H-%M-%S')"
readonly TEMP_DIR="${BACKUP_DIR}/.${TIMESTAMP}.tmp"
readonly SNAPSHOT_DIR="${BACKUP_DIR}/${TIMESTAMP}"
readonly STORAGE_ENV_FILE="$(mktemp)"

cleanup() {
  rm -rf -- "${TEMP_DIR}"
  rm -f -- "${STORAGE_ENV_FILE}"
}

trap cleanup EXIT
umask 077

if [[ ! "${RETENTION_DAYS}" =~ ^[1-9][0-9]*$ ]] || [[ ! "${LOCK_WAIT_SECONDS}" =~ ^[1-9][0-9]*$ ]] || [[ ! "${MIN_FREE_KIB}" =~ ^[1-9][0-9]*$ ]]; then
  printf 'Backup retention, lock wait and minimum free space must be positive integers\n' >&2
  exit 1
fi

exec 9> "${LOCK_FILE}"
flock --wait "${LOCK_WAIT_SECONDS}" 9
mkdir -p -- "${BACKUP_DIR}"
if (( $(df --output=avail "${BACKUP_DIR}" | tail -n 1) < MIN_FREE_KIB )); then
  printf 'Not enough free space for object storage backup\n' >&2
  exit 1
fi
mkdir -- "${TEMP_DIR}"
grep -E '^OBJECT_STORAGE_(ENDPOINT|BUCKET|ACCESS_KEY|SECRET_KEY)=' "${PROJECT_DIR}/docker/.env.object-storage.prod" > "${STORAGE_ENV_FILE}"
[[ "$(wc -l < "${STORAGE_ENV_FILE}")" -eq 4 ]]
docker run --rm --network docker_default --env-file "${STORAGE_ENV_FILE}" --volume "${TEMP_DIR}:/backup" --entrypoint /bin/sh quay.io/minio/mc:latest -c 'mc alias set source "$OBJECT_STORAGE_ENDPOINT" "$OBJECT_STORAGE_ACCESS_KEY" "$OBJECT_STORAGE_SECRET_KEY" && mc mirror --overwrite "source/$OBJECT_STORAGE_BUCKET" /backup'
mv -- "${TEMP_DIR}" "${SNAPSHOT_DIR}"
find "${BACKUP_DIR}" -mindepth 1 -maxdepth 1 -type d -mmin "+$((RETENTION_DAYS * 24 * 60))" -exec rm -rf -- {} +

trap - EXIT
rm -f -- "${STORAGE_ENV_FILE}"
printf 'Created object storage snapshot: %s\n' "${SNAPSHOT_DIR}"
