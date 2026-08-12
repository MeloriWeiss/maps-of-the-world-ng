#!/usr/bin/env bash

set -Eeuo pipefail

readonly BACKUP_DIR='/var/backups/gm-helper/postgresql'
readonly LOCK_FILE='/run/lock/gmhelper/maintenance.lock'
readonly LOCK_WAIT_SECONDS="${GMHELPER_MAINTENANCE_LOCK_WAIT_SECONDS:-7200}"
readonly MIN_FREE_KIB="${GMHELPER_BACKUP_MIN_FREE_KIB:-1048576}"
readonly RETENTION_DAYS="${GMHELPER_POSTGRES_BACKUP_RETENTION_DAYS:-14}"
readonly TIMESTAMP="$(date '+%Y-%m-%d_%H-%M-%S')"
readonly TEMP_FILE="${BACKUP_DIR}/.${TIMESTAMP}.dump.tmp"
readonly BACKUP_FILE="${BACKUP_DIR}/${TIMESTAMP}.dump"

cleanup() {
  rm -f -- "${TEMP_FILE}"
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
  printf 'Not enough free space for PostgreSQL backup\n' >&2
  exit 1
fi
runuser -u postgres -- pg_dump --format=custom --compress=9 --dbname=gmhelper_prod > "${TEMP_FILE}"
pg_restore --list "${TEMP_FILE}" > /dev/null
mv -- "${TEMP_FILE}" "${BACKUP_FILE}"
find "${BACKUP_DIR}" -type f -name '*.dump' -mmin "+$((RETENTION_DAYS * 24 * 60))" -delete

trap - EXIT
printf 'Created PostgreSQL backup: %s\n' "${BACKUP_FILE}"
