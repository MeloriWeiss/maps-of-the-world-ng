# Сброс тестовых карт перед включением Workshop v4

Эта инструкция относится к текущему production-развёртыванию из
`/opt/gm-helper/backend` с базой `gmhelper_prod` (см. `DEPLOYMENT.md`). Она
удаляет **все** карты, включая опубликованные, лайки и комментарии к ним.
Аккаунты и наборы текстур остаются. Не запускайте development seed на production:
он очищает всю main-базу.

1. На сервере сделайте свежие резервные копии PostgreSQL и объектного хранилища
   штатными сервисами и проверьте успешный статус и наличие новых снимков:

   ```bash
   sudo systemctl start gmhelper-postgresql-backup.service
   sudo systemctl start gmhelper-object-storage-backup.service
   sudo systemctl status gmhelper-postgresql-backup.service gmhelper-object-storage-backup.service --no-pager
   sudo ls -lt /var/backups/gm-helper/postgresql
   sudo ls -lt /var/backups/gm-helper/object-storage
   ```

2. Получите версию репозитория с `tools/sql/workshop-delete-all-maps.sql`.
   Остановите API на время сброса, чтобы в старом формате не появились новые
   карты между удалением и обновлением:

   ```bash
   cd /opt/gm-helper/backend
   git pull --ff-only
   docker compose -f docker/docker-compose.prod.yml stop api
   ```

3. Убедитесь, что подключились к нужной базе, и посмотрите число удаляемых строк:

   ```bash
   sudo -u postgres psql -d gmhelper_prod -c 'SELECT current_database(), count(*) AS maps FROM maps;'
   sudo -u postgres psql -d gmhelper_prod -c 'SELECT count(*) AS map_comments FROM map_comments;'
   ```

4. Выполните **один раз** подготовленный SQL в транзакции. При ошибке `psql`
   завершится с ненулевым кодом, а транзакция откатится:

   ```bash
   sudo -u postgres psql -v ON_ERROR_STOP=1 -d gmhelper_prod < tools/sql/workshop-delete-all-maps.sql
   sudo -u postgres psql -d gmhelper_prod -c 'SELECT count(*) AS maps_after_reset FROM maps;'
   ```

   Последний запрос должен вернуть `0`. Не применяйте миграцию через `db push`.

5. Удалите старые _preview_ карты из настроенного S3-хранилища. Они находятся
   только под префиксом `maps/`; оригиналы наборов текстур находятся в другом
   префиксе и не затрагиваются. Сначала просмотрите содержимое именно этого
   префикса. Для MinIO и R2 используется один и тот же файл
   `docker/.env.object-storage.prod`; команда работает в сети Compose:

   ```bash
   docker run --rm --network docker_default --env-file docker/.env.object-storage.prod --entrypoint /bin/sh quay.io/minio/mc:latest -c 'mc alias set source "$OBJECT_STORAGE_ENDPOINT" "$OBJECT_STORAGE_ACCESS_KEY" "$OBJECT_STORAGE_SECRET_KEY" && mc ls --recursive "source/$OBJECT_STORAGE_BUCKET/maps/"'
   ```

   После проверки имени bucket и списка объектов удалите только этот префикс:

   ```bash
   docker run --rm --network docker_default --env-file docker/.env.object-storage.prod --entrypoint /bin/sh quay.io/minio/mc:latest -c 'mc alias set source "$OBJECT_STORAGE_ENDPOINT" "$OBJECT_STORAGE_ACCESS_KEY" "$OBJECT_STORAGE_SECRET_KEY" && mc rm --recursive --force "source/$OBJECT_STORAGE_BUCKET/maps/"'
   ```

6. Запустите штатное развёртывание из `DEPLOYMENT.md`. Его контейнер `migrate`
   применит миграции Workshop для видов текстур, сцены v4, восстановления
   сохранения, индекса покрытия контейнеров и ссылок на текстуры, затем запустится API:

   ```bash
   gmhelper-deploy
   ```

   При Cloudflare R2 запускайте `GMHELPER_STORAGE_MODE=r2 gmhelper-deploy`.
   Если на сервере команда установлена под другим именем, используйте описанный
   в `DEPLOYMENT.md` способ запуска `scripts/deploy-production.sh`. Проверьте
   `api-migrate-prod` со статусом `Exited (0)` и endpoint `/api/health`. Только
   после успешного развёртывания создавайте новые карты.

   Перед первым сохранением большой карты обновите Nginx по разделу «Reverse
   proxy» в `DEPLOYMENT.md`: маршрут bundle требует тело до 270 МБ и длительный
   timeout. Если перед Nginx работает ещё один proxy/CDN, проверьте его лимит
   загрузки для этого маршрута.

Скрипт не выполняется автоматически. Резервные копии позволяют восстановить
старые карты вместе с их preview при ошибке выбора базы или окружения.
