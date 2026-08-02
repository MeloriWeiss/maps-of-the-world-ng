# Развёртывание на сервере

Эта инструкция рассчитана на первый запуск проекта на Linux-сервере. API
запускается в Docker. PostgreSQL, frontend, reverse proxy, домен и TLS
настраиваются отдельно.

Команды выполняются из корня репозитория — каталога, в котором находится
`package.json`. Значения в угловых скобках, например `<password>`, являются
заглушками: их необходимо заменить своими значениями без угловых скобок.

## Что выбрать

- **MinIO** — если нужно полностью собственное объектное хранилище и вы готовы
  самостоятельно отвечать за диск, обновления и резервные копии.
- **Cloudflare R2** — если хранение объектов можно передать внешнему сервису.
  На сервере тогда запускаются только migrator и API.

Для одного окружения выбирается только один вариант. Переключение не требует
изменения API-кода: отличаются ENV-переменные и команда запуска.

## Архитектура

Доступны два сценария:

| Сценарий    | Контейнеры                       | Объектное хранилище    |
| ----------- | -------------------------------- | ---------------------- |
| Self-hosted | migrator, API, MinIO, minio-init | MinIO на Docker volume |
| Cloudflare  | migrator, API                    | Cloudflare R2          |

PostgreSQL разворачивается отдельно: как системный сервис на сервере, на
другом сервере либо как managed database. pgAdmin постоянно в production не
запускается.

Перед API всегда запускается одноразовый migrator-контейнер. Он выполняет
`prisma migrate deploy` и не создаёт новые миграции. API запускается только
после успешного применения существующих миграций.

## Требования

- Linux-сервер с актуальными Docker Engine и Docker Compose;
- Git;
- Node.js версии из `.nvmrc`, Corepack и Yarn;
- доступ к production PostgreSQL;
- домен и reverse proxy, например Nginx или Caddy;
- отдельное место для резервных копий;
- закрытые production-секреты, не хранящиеся в Git.

Проверьте окружение:

```bash
node --version
docker --version
docker compose version
corepack enable
yarn --version
```

API публикуется только на `127.0.0.1:3000`. Reverse proxy должен принимать
внешний HTTPS-трафик и передавать его на этот адрес.

## 1. Подготовка проекта

Получите исходный код на сервере:

```bash
git clone <repository-url>
cd <repository-directory>
```

Установите зависимости:

```bash
yarn install --immutable
```

В production нельзя запускать проект из каталога, в котором находятся
незакоммиченные изменения. Разворачивайте заранее проверенный commit или tag.

## 2. Подготовка PostgreSQL

Создайте отдельные production-базу и пользователя. Пользователь должен иметь
право подключаться к базе и применять миграции Prisma. Не используйте
development-логин и пароль из `.env.example`.

PostgreSQL может находиться:

- на том же сервере как системный сервис;
- на отдельном сервере в закрытой сети;
- в managed database.

Если PostgreSQL запущен непосредственно на том же сервере, из контейнера он
доступен через `host.docker.internal`, а не через `localhost`:

```env
MAIN_DATABASE_URL=postgresql://<user>:<password>@host.docker.internal:5432/<database>?schema=public
```

Для PostgreSQL на другом сервере используйте его внутренний DNS или IP:

```env
MAIN_DATABASE_URL=postgresql://<user>:<password>@<database-host>:5432/<database>?schema=public
```

Перед продолжением убедитесь, что сервер разрешает подключение к PostgreSQL.
Ограничьте доступ к порту БД firewall-правилами.

## 3. Общая конфигурация API

Создайте `docker/.env.prod` как копию
`docker/examples/.env.prod.example` и замените все демонстрационные значения.
Не редактируйте сам example-файл и не добавляйте `docker/.env.prod` в Git.

```bash
cp docker/examples/.env.prod.example docker/.env.prod
chmod 600 docker/.env.prod
```

Критичные параметры:

```env
NODE_ENV=production
MAIN_DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<database>?schema=public
JWT_ACCESS_SECRET=<long-random-secret>
JWT_REFRESH_SECRET=<different-long-random-secret>
MAIN_API_PORT=3000
```

Создайте два разных случайных JWT-секрета. Не используйте значения из
example-файла. Параметры `JWT_ACCESS_EXPIRES` и `JWT_REFRESH_EXPIRES`
определяют срок действия access- и refresh-токенов.

Если логин, пароль или имя базы в `MAIN_DATABASE_URL` содержат специальные
символы, их необходимо percent-encode как компоненты URL.

## 4. Настройка объектного хранилища

Выполните только один из двух следующих подразделов.

### Вариант A: собственный MinIO

Создайте `docker/.env.minio.prod` как копию
`docker/examples/.env.minio.prod.example`. Этот файл содержит
административные данные MinIO и не передаётся API-контейнеру.

```bash
cp docker/examples/.env.minio.prod.example docker/.env.minio.prod
chmod 600 docker/.env.minio.prod
```

В `docker/.env.prod` настройте доступ API:

```env
OBJECT_STORAGE_ENDPOINT=http://minio:9000
OBJECT_STORAGE_REGION=us-east-1
OBJECT_STORAGE_BUCKET=maps-of-the-world-prod
OBJECT_STORAGE_ACCESS_KEY=<application-access-key>
OBJECT_STORAGE_SECRET_KEY=<application-secret-key>
OBJECT_STORAGE_FORCE_PATH_STYLE=true
```

В `docker/.env.minio.prod` задайте отдельные административные данные:

```env
MINIO_ROOT_USER=<admin-user>
MINIO_ROOT_PASSWORD=<different-long-admin-secret>
```

Значения `OBJECT_STORAGE_ACCESS_KEY` и `OBJECT_STORAGE_SECRET_KEY` — данные
пользователя приложения. Они должны отличаться от `MINIO_ROOT_USER` и
`MINIO_ROOT_PASSWORD`.

Первый запуск:

```bash
yarn deploy:api:prod:docker:minio
```

Команда:

1. собирает migrator и API;
2. запускает MinIO;
3. создаёт бакет и пользователя приложения;
4. применяет Prisma-миграции;
5. запускает API после успешной инициализации.

MinIO не публикует S3 API и Console наружу. Его данные находятся в Docker
volume `minio_data`.

### Вариант B: Cloudflare R2

Создайте бакет и API token в Cloudflare. Ограничьте token нужным бакетом и
правами чтения, записи и удаления объектов.

Замените в `docker/.env.prod` блок хранилища:

```env
OBJECT_STORAGE_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
OBJECT_STORAGE_REGION=auto
OBJECT_STORAGE_BUCKET=maps-of-the-world-prod
OBJECT_STORAGE_ACCESS_KEY=<r2-access-key-id>
OBJECT_STORAGE_SECRET_KEY=<r2-secret-access-key>
OBJECT_STORAGE_FORCE_PATH_STYLE=true
```

Файл `docker/.env.minio.prod` не требуется.

Первый запуск:

```bash
yarn deploy:api:prod:docker:cloudflare-r2
```

Профиль MinIO не включается, поэтому запускаются только migrator и API.

## 5. Проверка контейнеров

Проверьте состояние:

```bash
docker compose -f docker/docker-compose.prod.yml ps
```

API должен перейти в состояние `healthy`, migrator и `minio-init` — завершиться
с кодом `0`.

Если API не стал healthy, посмотрите логи:

```bash
docker compose -f docker/docker-compose.prod.yml logs migrate
docker compose -f docker/docker-compose.prod.yml logs api
```

Для варианта с MinIO дополнительно доступны:

```bash
docker compose -f docker/docker-compose.prod.yml --profile minio logs minio
docker compose -f docker/docker-compose.prod.yml --profile minio logs minio-init
```

До настройки reverse proxy API можно проверить непосредственно на сервере:

```bash
curl http://127.0.0.1:3000/api
```

Ответ с HTTP-статусом ниже `500` означает, что контейнер доступен. Это ещё не
заменяет проверку авторизации, базы данных и загрузки файлов.

## 6. Frontend

Перед сборкой проверьте `apiUrl` в
`apps/web/src/environments/environment.prod.ts`. Он должен указывать на
публичный HTTPS-адрес API.

Соберите frontend:

```bash
yarn build:web:prod
```

Статические файлы появятся в `dist/apps/web/browser`. Настройте Nginx, Caddy
или другой веб-сервер на раздачу этого каталога. Для маршрутов Angular
необходимо возвращать `index.html`, если запрошенный статический файл не
найден.

## 7. Reverse proxy и TLS

Не публикуйте порт `3000` напрямую в интернет. Reverse proxy должен:

- раздавать собранный frontend;
- обслуживать HTTPS;
- перенаправлять запросы `/api` на `http://127.0.0.1:3000`;
- передавать `Host`, `X-Forwarded-For` и `X-Forwarded-Proto`;
- иметь ограничение размера запроса не меньше лимита загрузки текстур;
- использовать автоматическое обновление TLS-сертификатов.

## 8. Остановка и повторный запуск

Остановить API и контейнеры выбранного сценария без удаления данных:

```bash
docker compose -f docker/docker-compose.prod.yml down
```

Для MinIO его volume сохраняется. Не используйте `down --volumes`, если не
хотите удалить хранящиеся в нём объекты.

Для повторного запуска выполните ту же команду, что и при первом запуске:

```bash
# MinIO
yarn deploy:api:prod:docker:minio

# или Cloudflare R2
yarn deploy:api:prod:docker:cloudflare-r2
```

Запускайте только команду выбранного хранилища.

## 9. Финальная проверка

Проверьте:

1. регистрацию и вход;
2. загрузку PNG, JPEG или WebP;
3. получение текстуры после перезагрузки страницы;
4. сохранение и повторное открытие карты;
5. отсутствие ошибок API, PostgreSQL и хранилища в логах.

## 10. Резервное копирование

Для PostgreSQL необходимы регулярные `pg_dump` или снапшоты managed database.

Для self-hosted MinIO необходима копия объектов на другом физическом сервере
или в другом объектном хранилище. Копия того же Docker volume на том же диске
не является резервной.

Минимальная политика:

- ежедневная автоматическая копия PostgreSQL;
- ежедневная репликация или `mc mirror` бакета MinIO;
- несколько поколений backup;
- мониторинг свободного места;
- регулярная тестовая процедура восстановления.

При Cloudflare R2 отдельно определите политику версионирования и резервной
копии критичных пользовательских данных.

## 11. Обновление

Перед обновлением:

1. создайте backup PostgreSQL и объектного хранилища;
2. проверьте новые Prisma-миграции;
3. получите заранее проверенный commit или tag;
4. выполните `yarn install --immutable`;
5. повторно выполните команду выбранного сценария:
   `yarn deploy:api:prod:docker:minio` или
   `yarn deploy:api:prod:docker:cloudflare-r2`;
6. пересоберите и опубликуйте frontend, если он изменился;
7. проверьте healthcheck, логи и основной пользовательский сценарий.

Не используйте `prisma db push` для production.

## Частые ошибки

- **API не подключается к PostgreSQL:** внутри контейнера `localhost` означает
  сам контейнер. Для БД на том же сервере используйте
  `host.docker.internal`.
- **MinIO запускается, но API получает Access Denied:** проверьте совпадение
  `OBJECT_STORAGE_*` в `docker/.env.prod` и повторите запуск MinIO-сценария,
  чтобы `minio-init` назначил политику.
- **R2 отвечает ошибкой авторизации:** проверьте account ID, ключи, имя бакета
  и права token на этот бакет.
- **Frontend обращается к старому API:** проверьте `apiUrl` в production
  environment, пересоберите frontend и очистите кэш браузера/CDN.
- **Migrator завершился с ошибкой:** не запускайте API вручную в обход
  миграций. Сначала исправьте доступ к БД или саму миграцию и повторите
  выбранную deploy-команду.
