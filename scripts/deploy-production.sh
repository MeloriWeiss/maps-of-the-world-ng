#!/usr/bin/env bash

set -Eeuo pipefail

readonly PROJECT_DIR='/opt/gm-helper/backend'
readonly LOCK_FILE='/run/lock/gmhelper/maintenance.lock'
readonly LOCK_WAIT_SECONDS="${GMHELPER_MAINTENANCE_LOCK_WAIT_SECONDS:-7200}"
readonly MIN_FREE_KIB="${GMHELPER_DEPLOY_MIN_FREE_KIB:-5242880}"
readonly STORAGE_MODE="${GMHELPER_STORAGE_MODE:-minio}"

if [[ ! "${LOCK_WAIT_SECONDS}" =~ ^[1-9][0-9]*$ ]] || [[ ! "${MIN_FREE_KIB}" =~ ^[1-9][0-9]*$ ]]; then
  printf 'Lock wait and minimum free space must be positive integers\n' >&2
  exit 1
fi

if [[ "${STORAGE_MODE}" != 'minio' && "${STORAGE_MODE}" != 'r2' ]]; then
  printf 'GMHELPER_STORAGE_MODE must be either "minio" or "r2"\n' >&2
  exit 1
fi

exec 9> "${LOCK_FILE}"
printf 'Waiting for the GM Helper maintenance lock...\n'
flock --wait "${LOCK_WAIT_SECONDS}" 9

cd "${PROJECT_DIR}"

if [[ -n "$(git status --porcelain)" ]]; then
  printf 'Refusing to deploy from a dirty Git working tree\n' >&2
  exit 1
fi

if (( $(df --output=avail "${PROJECT_DIR}" | tail -n 1) < MIN_FREE_KIB )); then
  printf 'Not enough free space for production build\n' >&2
  exit 1
fi

git pull --ff-only

compose_args=(-f docker/docker-compose.prod.yml)
if [[ "${STORAGE_MODE}" == 'minio' ]]; then
  compose_args+=(--profile minio)
fi

docker compose "${compose_args[@]}" config --quiet
docker compose "${compose_args[@]}" up -d --build

if [[ "$(docker inspect --format '{{.State.ExitCode}}' api-migrate-prod)" != '0' ]]; then
  printf 'Database migrator did not finish successfully\n' >&2
  exit 1
fi

for _ in {1..24}; do
  if [[ "$(docker inspect --format '{{.State.Health.Status}}' api-prod 2>/dev/null || true)" == 'healthy' ]]; then
    docker compose "${compose_args[@]}" ps -a
    curl --fail --silent --show-error http://127.0.0.1:3000/api/health
    printf '\nProduction deployment completed successfully\n'
    exit 0
  fi

  sleep 5
done

docker compose "${compose_args[@]}" logs --tail=100 api >&2
printf 'API did not become healthy within 120 seconds\n' >&2
exit 1
