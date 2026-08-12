# Развёртывание на сервере

Эта инструкция рассчитана на первый и последующие запуски проекта на Linux-сервере. API
запускается в Docker. PostgreSQL, frontend, reverse proxy, домен и TLS
настраиваются отдельно.

Если явно не указано иное, команды проекта выполняются из корня репозитория —
каталога, в котором находится `package.json`. Значения в угловых скобках,
например `<password>`, являются заглушками: их необходимо заменить своими
значениями без угловых скобок. Не вводите пометки `[локально]` и `[на сервере]`
как часть команды.

## Подключение к серверу по SSH

Создайте SSH-ключ локально, если отдельного ключа для сервера ещё нет:

```bash
ssh-keygen -t ed25519 -C "ваша_почта@example.com"
```

Закрытый ключ остаётся на локальном компьютере. Передайте системному
администратору только публичный ключ из файла с расширением `.pub`.

Подключение с нестандартным портом:

```bash
ssh -i <путь-к-закрытому-ключу> <server-user>@<server-ip> -p <ssh-port>
```

Для установки и обслуживания backend пользователю необходимы `sudo` и доступ
к Docker. После добавления пользователя в группы `sudo` и `docker` полностью
завершите SSH-сеанс и подключитесь заново, затем проверьте права:

```bash
id
sudo whoami
docker ps
```

Не передавайте закрытый SSH-ключ, его парольную фразу и production-секреты
другим людям и не добавляйте их в Git.

## Frontend

Перед сборкой проверьте `apiUrl` в
`apps/web/src/environments/environment.prod.ts`. Он должен указывать на
публичный HTTPS-адрес API.

Краткая сводка команд для быстрого помещения сборки на сервер:

```bash
yarn build:web:prod [локально]
ssh -i <путь к домашней директории пользователя>\.ssh\<название ключа> <имя пользователя на сервере>@<ip-адрес сервера> -p <порт> [локально]
find /tmp/frontend-build -mindepth 1 -maxdepth 1 -exec rm -rf -- {} + [на сервере]
scp -P <порт> -r dist/apps/web/browser/. <имя пользователя на сервере>@<ip-адрес сервера>:/tmp/frontend-build [локально]
rsync -av --no-perms --delete /tmp/frontend-build/ /var/www/gmhelper-frontend/ [на сервере]
```

Далее идёт более подробная инструкция.

1. Соберите frontend локально:

```bash
yarn build:web:prod
```

Статические файлы появятся в `dist/apps/web/browser`.

2. Подключитесь к серверу по инструкции из раздела
   [«Подключение к серверу по SSH»](#подключение-к-серверу-по-ssh). Далее команды
   выполняются на сервере, если явно не указано иное.

3. Если вы уже загружали frontend, проверьте, нет ли старых файлов сборки во
   временной директории:

```bash
ls -l /tmp/frontend-build
```

Если директории не существует, то файлы тоже отсутствуют.

Если файлы есть, то необходимо сначала удалить содержимое директории во избежание оставления старых ненужных файлов:

```bash
find /tmp/frontend-build -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +
```

4. Загрузите файлы полученной сборки на сервер в директорию своего пользователя. Команда выполняется локально (не на сервере), из корня репозитория.

```bash
scp -P <порт> -r dist/apps/web/browser/. <имя пользователя на сервере>@<ip-адрес сервера>:/tmp/frontend-build
```

Скопируйте файлы сборки из временных файлов вашего пользователя в созданную директорию:

```bash
rsync -av --no-perms --delete \
  /tmp/frontend-build/ \
  /var/www/gmhelper-frontend/
```

Если команда `rsync` не найдена, воспользуйтесь альтернативой:

```bash
find /var/www/gmhelper-frontend \
  -mindepth 1 -maxdepth 1 \
  -exec rm -rf -- {} +

cp -r /tmp/frontend-build/. \
  /var/www/gmhelper-frontend/
```

Проверьте наличие перемещённых файлов и ассетов:

```bash
ls -la /var/www/gmhelper-frontend
find /var/www/gmhelper-frontend -type f -iname 'new-logo.png' -print
```

Проверьте права каталогов, если в загруженном приложении в браузере не отображаются картинки (при наличии [настроенного Nginx](#настройка-nginx)):

```bash
namei -l /var/www/gmhelper-frontend/assets
namei -l /var/www/gmhelper-frontend/assets/imgs
```

У каталогов в пути должны быть права прохода, например: `drwxr-xr-x`.

Если статика загружена, но права ещё не исправлены:

```bash
sudo chmod 755 /var/www/gmhelper-frontend/assets
sudo chmod 755 /var/www/gmhelper-frontend/assets/imgs
```

Если в браузере приложение отдаёт страницу с 403 ошибкой (при наличии [настроенного Nginx](#настройка-nginx)), выдайте директории фронтенда необходимые права:

```bash
find /var/www/gmhelper-frontend -type d \
  -exec printf 'chmod 755 "%s"\n' {} \;

find /var/www/gmhelper-frontend -type f \
  -exec printf 'chmod 644 "%s"\n' {} \;
```

### Настройка Nginx

Настройте Nginx, Caddy или другой веб-сервер на раздачу этого каталога, если постановка приложения на сервер выполняется впервые. Для маршрутов Angular
необходимо возвращать `index.html`, если запрошенный статический файл не
найден.

Необходимо проверить, нет ли уже созданной конфигурации Nginx:

```bash
ls -la /etc/nginx/sites-available/
ls -la /etc/nginx/sites-enabled/
```

Найдите конфигурации, где встречается домен `gm-helper.ru`:

```bash
sudo grep -RIn "gm-helper.ru" /etc/nginx
```

Если домен уже используется в какой-либо из конфигураций, её необходимо отключить, либо использовать эту конфигурацию и не создавать новую.

Создайте конфигурацию Nginx, если таковой не было:

```bash
sudo nano /etc/nginx/sites-available/gmhelper
```

Настройте Nginx-конфигурацию.

Сохранение в nano:

```bash
Ctrl+O
Enter
Ctrl+X
```

Далее необходимо включить новую конфигурацию.

Создаёте символическую ссылку:

```bash
sudo ln -s \
  /etc/nginx/sites-available/gmhelper \
  /etc/nginx/sites-enabled/gmhelper
```

Проверьте:

```bash
ls -la /etc/nginx/sites-enabled/
```

Должно появиться:

```bash
gmhelper-frontend -> /etc/nginx/sites-available/gmhelper
```

Проверьте синтаксис конфигурации:

```bash
sudo nginx -t
```

Если ошибок нет, перезапустите Nginx:

```bash
sudo systemctl reload nginx
```

После создания отдельного конфига получается:

```bash
/etc/nginx/
├── sites-available/
│   ├── default
│   ├── default.backup
│   └── gmhelper
└── sites-enabled/
    └── gmhelper -> /etc/nginx/sites-available/gmhelper
```

Сам фронтенд находится здесь:

```bash
/var/www/gmhelper-frontend
```

А новый сайт обрабатывается конфигом:

```bash
/etc/nginx/sites-available/gmhelper
```

Проверка:

Проверка картинки через активный HTTPS-виртуальный хост:

```bash
curl -k -i --resolve gm-helper.ru:443:127.0.0.1 \
  https://gm-helper.ru/assets/imgs/new-logo.png
```

Ожидается:

```bash
HTTP/1.1 200 OK
Content-Type: image/png
```

Проверка Angular:

```bash
curl -k -i --resolve gm-helper.ru:443:127.0.0.1 \
  https://gm-helper.ru/
```

Ожидается:

```bash
HTTP/1.1 200 OK
Content-Type: text/html
```

Проверка Angular-маршрута:

```bash
curl -k -i --resolve gm-helper.ru:443:127.0.0.1 \
  https://gm-helper.ru/home
```

Далее необходимо проверить, как фронтенд обрабатывает ответы на запросы, пока бэкенд не запущен:

```bash
curl -k -i --resolve gm-helper.ru:443:127.0.0.1 \
  https://gm-helper.ru/api/users/me
```

Ожидаемый ответ:

```bash
HTTP/1.1 502 Bad Gateway
```

## Backend

Backend состоит из системного PostgreSQL, Docker-контейнеров migrator и API и
одного S3-совместимого объектного хранилища. Основной проверенный сценарий этой
инструкции использует MinIO. Вместо него можно подключить Cloudflare R2.

PostgreSQL и данные MinIO живут отдельно от образа API. Пересборка и замена
контейнера API не удаляет данные. Одноразовый migrator перед каждым запуском
выполняет только существующие Prisma-миграции через `prisma migrate deploy`.

### Быстрая установка новой версии

Команды выполняются на сервере из корня backend-репозитория
`/opt/gm-helper/backend`. До обновления создайте резервные копии БД и объектного
хранилища. `gmhelper-deploy` можно вызвать из любого каталога, но переход в
корень нужен для следующих команд `docker compose`.

```bash
cd /opt/gm-helper/backend
gmhelper-deploy
curl --fail --silent --show-error https://gm-helper.ru/api/health
docker compose -f docker/docker-compose.prod.yml logs --tail=100 api
docker image ls --filter dangling=true
docker image prune -f
docker system df
```

Только после намеренного force-push в `master`, если `gmhelper-deploy` не может
выполнить fast-forward:

```bash
cd /opt/gm-helper/backend
git status --short
git fetch origin master
git reset --hard origin/master
gmhelper-deploy
```

Перед `reset --hard` вывод `git status --short` должен быть пустым. При обычном
обновлении этот блок не выполняйте.

Команды очистки находятся после `gmhelper-deploy`: выполняйте их только если
deploy и healthcheck завершились успешно. На общем сервере не запускайте
`docker system prune -a`, `docker volume prune` и
`docker compose down --volumes`: эти команды могут затронуть другие проекты
или удалить пользовательские файлы MinIO.

### Архитектура и каталоги

| Компонент            | Размещение                   | Постоянные данные          |
| -------------------- | ---------------------------- | -------------------------- |
| Исходный код backend | `/opt/gm-helper/backend`     | Git и закрытые ENV-файлы   |
| API                  | Docker, `127.0.0.1:3000`     | нет                        |
| Migrator             | одноразовый Docker-контейнер | нет                        |
| PostgreSQL           | системный сервис             | `/var/lib/postgresql`      |
| MinIO                | Docker                       | volume `docker_minio_data` |
| Frontend             | `/var/www/gmhelper-frontend` | статическая сборка         |

MinIO не публикует порты `9000` и `9001` на хост. API доступен снаружи только
через HTTPS reverse proxy. Node.js, Corepack и Yarn на сервер устанавливать не
нужно: они используются внутри Docker builder-образа.

### 1. Проверка сервера

Подключитесь по SSH и проверьте окружение, занятые порты и существующие
контейнеры. Не останавливайте чужие сервисы.

```bash
cat /etc/os-release
uname -m
docker --version
docker compose version
git --version
sudo ss -lntp
docker ps -a --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
docker volume ls
df -h /
free -h
```

Для описанного сценария должны быть свободны `127.0.0.1:3000` и внутренний
порт PostgreSQL `5432`. Занятый на хосте порт `9000` не конфликтует с MinIO,
поскольку MinIO не публикует его наружу.

### 2. Установка проекта

Создайте production-каталог и клонируйте репозиторий. Если репозиторий
приватный, используйте GitLab/GitHub deploy key или access token с минимальными
правами. Не сохраняйте пароль аккаунта в Git.

```bash
sudo mkdir -p /opt/gm-helper
sudo chown <server-user>:<server-user> /opt/gm-helper
cd /opt/gm-helper
git clone <repository-url> backend
cd backend
git status
git log -1 --oneline
```

Разворачивайте только проверенный commit или tag при чистом рабочем дереве.
Если репозиторий сначала клонировали в домашний каталог и контейнеры ещё не
запущены, перенесите единственную копию, сохранив закрытые ENV-файлы:

```bash
sudo mkdir -p /opt/gm-helper
sudo mv /home/<server-user>/<repository-directory> /opt/gm-helper/backend
sudo chown -R <server-user>:<server-user> /opt/gm-helper/backend
```

### 3. Установка PostgreSQL

Для Ubuntu установите PostgreSQL как системный сервис:

```bash
sudo apt update
sudo apt install -y postgresql postgresql-client
sudo systemctl enable --now postgresql
sudo systemctl status postgresql --no-pager
```

Создайте отдельную роль `gmhelper_api` и базу `gmhelper_prod`:

```bash
sudo -u postgres psql
```

В консоли PostgreSQL:

```sql
CREATE ROLE gmhelper_api LOGIN;
\password gmhelper_api
CREATE DATABASE gmhelper_prod OWNER gmhelper_api;
\q
```

Сгенерируйте пароль командой `openssl rand -hex 32`, сохраните его в менеджере
паролей и дважды введите после `\password`. Hex-пароль можно безопасно
использовать в URL без percent-encoding.

Проверьте локальное подключение:

```bash
psql -h 127.0.0.1 -U gmhelper_api -d gmhelper_prod
```

Выполните `\conninfo`, затем `\q`. Роль приложения не должна быть superuser.

### 4. Доступ к PostgreSQL из Docker

Определите внутренний Docker gateway:

```bash
docker network inspect bridge --format '{{range .IPAM.Config}}{{.Gateway}}{{end}}'
```

Для стандартного адреса `172.17.0.1` настройте PostgreSQL слушать только
localhost и Docker gateway:

```bash
sudo -u postgres psql -c "ALTER SYSTEM SET listen_addresses = 'localhost,172.17.0.1';"
sudo -u postgres psql -Atc "SHOW hba_file;"
```

Добавьте в полученный `pg_hba.conf` одно правило для production-роли и базы:

```text
host gmhelper_prod gmhelper_api 172.16.0.0/12 scram-sha-256
```

Например:

```bash
HBA_FILE="$(sudo -u postgres psql -Atc 'SHOW hba_file;')"
grep -qxF 'host gmhelper_prod gmhelper_api 172.16.0.0/12 scram-sha-256' "$HBA_FILE" || echo 'host gmhelper_prod gmhelper_api 172.16.0.0/12 scram-sha-256' | sudo tee -a "$HBA_FILE"
sudo systemctl restart postgresql
sudo ss -lntp | grep ':5432'
```

PostgreSQL не должен слушать `0.0.0.0:5432`. Ожидаются `127.0.0.1:5432` и
адрес Docker gateway.

Если UFW активен, сначала выполните первый запуск из раздела 6. Compose создаст
сеть до запуска migrator; первый migrator при этом может завершиться с
`P1001`. После этого определите созданную подсеть:

```bash
docker network inspect docker_default --format '{{range .IPAM.Config}}{{.Subnet}} gateway={{.Gateway}}{{end}}'
```

Разрешите этой подсети доступ только к внутреннему адресу PostgreSQL. Пример
для Compose-сети `172.19.0.0/16` и gateway `172.17.0.1`:

```bash
sudo ufw allow from 172.19.0.0/16 to 172.17.0.1 port 5432 proto tcp comment 'gmhelper Docker to PostgreSQL'
```

Не копируйте пример буквально, если адреса отличаются. Если firewall
обслуживает другой администратор, согласуйте правило с ним. Порт `5432` не
нужно открывать для `Anywhere`.

### 5. Production ENV

Создайте закрытые конфигурационные файлы:

```bash
cd /opt/gm-helper/backend
cp docker/examples/.env.prod.example docker/.env.prod
cp docker/examples/.env.minio.prod.example docker/.env.minio.prod
chmod 600 docker/.env.prod docker/.env.minio.prod
```

Сгенерируйте два разных JWT-секрета и два разных секрета MinIO:

```bash
openssl rand -hex 64
openssl rand -hex 64
openssl rand -hex 32
openssl rand -hex 32
```

Не публикуйте результаты. Настройте `docker/.env.prod`:

```env
NODE_ENV=production
MAIN_DATABASE_URL=postgresql://gmhelper_api:<postgres-password>@host.docker.internal:5432/gmhelper_prod?schema=public
JWT_ACCESS_SECRET=<jwt-access-secret>
JWT_REFRESH_SECRET=<different-jwt-refresh-secret>
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=30d
MAIN_API_PORT=3000
OBJECT_STORAGE_ENDPOINT=http://minio:9000
OBJECT_STORAGE_REGION=us-east-1
OBJECT_STORAGE_BUCKET=maps-of-the-world-prod
OBJECT_STORAGE_ACCESS_KEY=gmhelper-api
OBJECT_STORAGE_SECRET_KEY=<minio-application-secret>
OBJECT_STORAGE_FORCE_PATH_STYLE=true
```

Настройте `docker/.env.minio.prod`:

```env
MINIO_ROOT_USER=gmhelper-admin
MINIO_ROOT_PASSWORD=<different-minio-admin-secret>
```

Пользователь приложения MinIO и администратор MinIO должны иметь разные
секреты. Проверьте права и отсутствие демонстрационных значений, не печатая
секреты:

```bash
stat -c '%a %n' docker/.env.prod docker/.env.minio.prod
if grep -Eq 'replace-with|root_prod|FDGGJHG|CXVCVSA' docker/.env.prod docker/.env.minio.prod; then echo 'ОШИБКА: остались демонстрационные значения'; else echo 'OK: демонстрационных значений нет'; fi
docker compose -f docker/docker-compose.prod.yml --profile minio config --quiet
```

### 6. Первый запуск с MinIO

Соберите и запустите backend. Первая сборка скачивает образы и зависимости и
может занять несколько минут:

```bash
docker compose -f docker/docker-compose.prod.yml --profile minio up -d --build
```

Compose создаёт сеть `docker_default` и volume `docker_minio_data`. Если
migrator сообщает `P1001`, проверьте сеть и firewall:

```bash
docker compose -f docker/docker-compose.prod.yml run --rm --no-deps --entrypoint sh migrate -c 'echo "HOST:"; getent hosts host.docker.internal; echo "ROUTES:"; ip route; echo "PORT:"; nc -vz -w 3 host.docker.internal 5432'
```

Если возникает `P1000`, пароль роли `gmhelper_api` в PostgreSQL не совпадает с
паролем внутри `MAIN_DATABASE_URL`. Исправьте пароль и пересоздайте контейнеры:

```bash
docker compose -f docker/docker-compose.prod.yml --profile minio up -d --force-recreate
```

### 7. Первый запуск с Cloudflare R2

Для R2 не создавайте `docker/.env.minio.prod`. Настройте в
`docker/.env.prod` endpoint, bucket и ограниченный API token:

```env
OBJECT_STORAGE_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
OBJECT_STORAGE_REGION=auto
OBJECT_STORAGE_BUCKET=maps-of-the-world-prod
OBJECT_STORAGE_ACCESS_KEY=<r2-access-key-id>
OBJECT_STORAGE_SECRET_KEY=<r2-secret-access-key>
OBJECT_STORAGE_FORCE_PATH_STYLE=false
```

Запустите только migrator и API:

```bash
docker compose -f docker/docker-compose.prod.yml up -d --build
```

### 8. Проверка backend

Для MinIO проверьте все контейнеры, включая одноразовые:

```bash
docker compose -f docker/docker-compose.prod.yml --profile minio ps -a
```

Ожидаемые состояния:

- `api-prod` — `Up (healthy)`;
- `minio-prod` — `Up (healthy)`;
- `api-migrate-prod` — `Exited (0)`;
- `minio-init-prod` — `Exited (0)`.

Проверьте логи и health endpoint:

```bash
docker compose -f docker/docker-compose.prod.yml logs --tail=100 migrate
docker compose -f docker/docker-compose.prod.yml logs --tail=100 api
docker compose -f docker/docker-compose.prod.yml --profile minio logs --tail=100 minio-init
curl --fail --silent --show-error http://127.0.0.1:3000/api/health
curl --fail --silent --show-error https://<domain>/api/health
```

Ожидаемый ответ health endpoint:

```json
{ "status": "ok" }
```

Проверьте миграции и постоянный volume:

```bash
sudo -u postgres psql -d gmhelper_prod -c '\dt'
docker volume inspect docker_minio_data --format '{{.Name}}: {{.Mountpoint}}'
```

После технических проверок зарегистрируйте тестового пользователя, войдите,
обновите страницу, загрузите изображение и убедитесь, что авторизация и файл
сохранились. Не запускайте production seed без отдельного решения о загрузке
демонстрационных данных.

### 9. Reverse proxy

API публикуется только на `127.0.0.1:3000`. Nginx должен перенаправлять `/api`
на этот адрес:

```nginx
location /api {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 50M;
}
```

Проверьте и примените конфигурацию:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Порт `3000` не открывайте в firewall. TLS завершается на Nginx или другом
reverse proxy.

### 10. Повторный запуск и обновление

Установите production deploy-скрипт и общий maintenance-lock. Этот же lock
используют backup-сервисы, поэтому обновление и backup не выполняются
одновременно:

```bash
cd /opt/gm-helper/backend
sudo install -m 0755 -o root -g root scripts/deploy-production.sh /usr/local/sbin/gmhelper-deploy
sudo install -m 0644 -o root -g root scripts/systemd/gmhelper-maintenance.conf /etc/tmpfiles.d/gmhelper-maintenance.conf
sudo systemd-tmpfiles --create /etc/tmpfiles.d/gmhelper-maintenance.conf
```

Пользователь, запускающий deploy, должен входить в группу `docker`. Обычное
обновление с MinIO запускается без `sudo`:

```bash
gmhelper-deploy
```

Для Cloudflare R2:

```bash
GMHELPER_STORAGE_MODE=r2 gmhelper-deploy
```

Скрипт ожидает освобождения lock до двух часов, требует чистое Git-дерево и не
менее 5 ГиБ свободного места, выполняет только `git pull --ff-only`, проверяет
Compose, migrator и `/api/health`. Он не удаляет старые образы автоматически.

#### Что делает `gmhelper-deploy`

1. Ожидает общий maintenance-lock, чтобы не пересечься с backup.
2. Проверяет параметры запуска, чистоту Git-дерева и свободное место.
3. Получает новую версию только через `git pull --ff-only`.
4. Проверяет итоговую Compose-конфигурацию.
5. Собирает новые Docker-образы, пока старый API продолжает работать.
6. Запускает migrator с `prisma migrate deploy`.
7. Только после успешной миграции заменяет контейнер API.
8. Ожидает состояние `healthy` и проверяет локальный `/api/health`.

Не выполняйте `docker compose down` перед обновлением: это создаст лишний
простой. Nginx продолжает раздавать frontend во время deploy, PostgreSQL и
MinIO не останавливаются. При замене `api-prod` API может быть недоступен
несколько секунд. Текущая схема не является zero-downtime deployment.

#### Совместимость API и production-миграций

Во время применения миграции предыдущая версия API ещё может обслуживать
запросы. Поэтому изменения схемы должны быть совместимы как со старой, так и с
новой версией API. Используйте подход expand–migrate–contract:

1. **Expand:** добавьте новую таблицу или nullable-колонку, не удаляя и не
   переименовывая используемые элементы схемы.
2. **Migrate:** выпустите API, который понимает новую схему, и при необходимости
   перенесите или заполните существующие данные отдельной миграцией.
3. **Contract:** только в следующем релизе удалите старую колонку, таблицу или
   временную совместимость, когда предыдущий API их больше не использует.

Не удаляйте и не переименовывайте используемую колонку в том же обычном
релизе, где API переключается на её замену. Добавление обязательной колонки
выполняйте сначала как nullable или со значением по умолчанию, затем заполните
данные и лишь в последующем релизе добавляйте `NOT NULL`. Большие или заведомо
несовместимые миграции требуют отдельного окна обслуживания и заранее
проверенного плана отката.

Если история `master` была намеренно перезаписана через force-push, обычный
`git pull --ff-only` и `gmhelper-deploy` безопасно завершатся с ошибкой до
пересборки контейнеров. Синхронизируйте deployment-копию вручную:

```bash
cd /opt/gm-helper/backend
git status --short
git fetch origin master
git reset --hard origin/master
gmhelper-deploy
```

Перед `reset --hard` вывод `git status --short` должен быть пустым. Команда
удаляет незакоммиченные изменения отслеживаемых файлов репозитория, но не
затрагивает игнорируемые production ENV, PostgreSQL, Docker volumes и
работающие контейнеры. Не используйте `git clean -fd`: эта команда может
удалить неотслеживаемые серверные файлы.

Новый migrator применит только ещё не применённые миграции. PostgreSQL и
`docker_minio_data` сохраняются. Не используйте `prisma db push` в production.

После успешной проверки найдите старые dangling-образы:

```bash
docker image ls --filter dangling=true
```

На общем сервере убедитесь, что список появился именно после текущей сборки,
и только затем удалите эти образы:

```bash
docker image prune -f
docker system df
```

Команда `docker image prune -f` не удаляет volumes, но действует на весь Docker
daemon, поэтому её нельзя выполнять до проверки списка.

### 11. Остановка без потери данных

Остановить контейнеры MinIO-сценария:

```bash
docker compose -f docker/docker-compose.prod.yml --profile minio down
```

Запустить снова:

```bash
docker compose -f docker/docker-compose.prod.yml --profile minio up -d
```

Обычный `down` сохраняет volume. Никогда не добавляйте `--volumes`, если не
требуется безвозвратно удалить файлы MinIO.

### 12. Контроль диска и логов

Логи API и MinIO ротируются Docker: три файла максимум по 10 МБ на контейнер.
Контролируйте фактическое использование диска:

```bash
docker system df
sudo du -sh /var/lib/docker
sudo du -sh /var/lib/docker/volumes/docker_minio_data/_data
sudo du -sh /var/lib/postgresql
sudo du -h "$(docker inspect --format '{{.LogPath}}' api-prod)" "$(docker inspect --format '{{.LogPath}}' minio-prod)"
```

Рост `docker_minio_data` и `/var/lib/postgresql` является ростом
пользовательских данных, а не мусором. Не очищайте эти каталоги вручную.

### 13. Резервное копирование

Минимальная политика:

- ежедневный `pg_dump` с несколькими поколениями копий;
- ежедневное зеркалирование S3-совместимого хранилища через `mc mirror`;
- контроль успешности и свободного места;
- периодическая проверка восстановления;
- внешняя копия на другом физическом сервере, NAS или S3-хранилище.

Локальная копия на том же диске защищает от ошибочного изменения или миграции,
но не от потери диска и не является полноценной резервной копией.

PostgreSQL и объектное хранилище копируются независимыми скриптами и systemd
timers. Ошибка одного источника не блокирует запуск backup другого. Скрипт
объектного хранилища читает текущие `OBJECT_STORAGE_*` из `docker/.env.prod` и
работает как с MinIO, так и с Cloudflare R2 через S3 API.

Установите оба контура backup:

```bash
cd /opt/gm-helper/backend
sudo install -m 0750 -o root -g root scripts/backup-postgresql-production.sh /usr/local/sbin/gmhelper-postgresql-backup
sudo install -m 0750 -o root -g root scripts/backup-object-storage-production.sh /usr/local/sbin/gmhelper-object-storage-backup
sudo install -m 0644 -o root -g root scripts/systemd/gmhelper-postgresql-backup.service /etc/systemd/system/gmhelper-postgresql-backup.service
sudo install -m 0644 -o root -g root scripts/systemd/gmhelper-postgresql-backup.timer /etc/systemd/system/gmhelper-postgresql-backup.timer
sudo install -m 0644 -o root -g root scripts/systemd/gmhelper-object-storage-backup.service /etc/systemd/system/gmhelper-object-storage-backup.service
sudo install -m 0644 -o root -g root scripts/systemd/gmhelper-object-storage-backup.timer /etc/systemd/system/gmhelper-object-storage-backup.timer
sudo install -m 0644 -o root -g root scripts/systemd/gmhelper-maintenance.conf /etc/tmpfiles.d/gmhelper-maintenance.conf
sudo mkdir -p /var/backups/gm-helper
sudo chmod 700 /var/backups/gm-helper
printf 'GMHELPER_POSTGRES_BACKUP_RETENTION_DAYS=14\nGMHELPER_OBJECT_STORAGE_BACKUP_RETENTION_DAYS=14\nGMHELPER_MAINTENANCE_LOCK_WAIT_SECONDS=7200\nGMHELPER_BACKUP_MIN_FREE_KIB=1048576\n' | sudo tee /etc/default/gmhelper-backup
sudo systemd-tmpfiles --create /etc/tmpfiles.d/gmhelper-maintenance.conf
sudo systemctl daemon-reload
```

Ручной тест каждого backup обязателен:

```bash
sudo systemctl start gmhelper-postgresql-backup.service
sudo systemctl status gmhelper-postgresql-backup.service --no-pager
sudo journalctl -u gmhelper-postgresql-backup.service -n 100 --no-pager
sudo systemctl start gmhelper-object-storage-backup.service
sudo systemctl status gmhelper-object-storage-backup.service --no-pager
sudo journalctl -u gmhelper-object-storage-backup.service -n 100 --no-pager
sudo find /var/backups/gm-helper -maxdepth 3 -printf '%M %u:%g %s %p\n'
```

Только после успешного ручного теста включите расписание:

```bash
sudo systemctl enable --now gmhelper-postgresql-backup.timer gmhelper-object-storage-backup.timer
systemctl list-timers 'gmhelper-*-backup.timer' --all
```

Структура каталога:

```text
/var/backups/gm-helper/
├── postgresql/
│   └── YYYY-MM-DD_HH-MM-SS.dump
└── object-storage/
    └── YYYY-MM-DD_HH-MM-SS/
```

Корневой каталог имеет права `700` и намеренно недоступен обычному
пользователю. Просматривайте его через `sudo`, не ослабляя права:

```bash
sudo ls -la /var/backups/gm-helper
sudo find /var/backups/gm-helper -maxdepth 3 -printf '%M %u:%g %s %p\n'
sudo du -sh /var/backups/gm-helper /var/backups/gm-helper/postgresql /var/backups/gm-helper/object-storage
```

Для временной интерактивной работы внутри каталога можно открыть root shell,
а после просмотра сразу выйти:

```bash
sudo -i
cd /var/backups/gm-helper
exit
```

PostgreSQL запускается ежедневно около `03:30`, объектное хранилище — около
`04:00`. `RandomizedDelaySec=10m` немного разносит нагрузку с другими задачами
сервера. Сроки хранения настраиваются независимо в
`/etc/default/gmhelper-backup`:

```env
GMHELPER_POSTGRES_BACKUP_RETENTION_DAYS=14
GMHELPER_OBJECT_STORAGE_BACKUP_RETENTION_DAYS=14
GMHELPER_MAINTENANCE_LOCK_WAIT_SECONDS=7200
GMHELPER_BACKUP_MIN_FREE_KIB=1048576
```

Например, для хранения в течение трёх суток укажите:

```env
GMHELPER_POSTGRES_BACKUP_RETENTION_DAYS=3
GMHELPER_OBJECT_STORAGE_BACKUP_RETENTION_DAYS=3
```

Новое значение применяется при следующем запуске соответствующего сервиса.
Скрипты удаляют только свои backup-файлы и snapshot-каталоги старше указанного
срока. Production-БД, MinIO, R2 и `docker_minio_data` они не удаляют.

`GMHELPER_MAINTENANCE_LOCK_WAIT_SECONDS` задаёт максимальное ожидание общего
lock, а `GMHELPER_BACKUP_MIN_FREE_KIB` — минимальный остаток свободного места
перед backup. Значение `1048576` соответствует 1 ГиБ. При недостатке места
новая копия не создаётся, а существующие копии не удаляются.

Оба backup-сервиса и `gmhelper-deploy` используют один exclusive lock. Поэтому
они ожидают завершения уже запущенной операции и не меняют PostgreSQL, MinIO
или контейнеры одновременно. Пользовательские записи API при этом не
блокируются: `pg_dump` создаёт согласованный снимок, а `mc mirror` копирует
только завершённые S3-объекты.

При переходе с MinIO на R2 обновите `OBJECT_STORAGE_*` в `docker/.env.prod` и
выполните ручной тест `gmhelper-object-storage-backup.service`. PostgreSQL timer
и его настройки менять не требуется.

Временно остановить расписание без удаления настроек:

```bash
sudo systemctl stop gmhelper-postgresql-backup.timer gmhelper-object-storage-backup.timer
```

Снова запустить расписание:

```bash
sudo systemctl start gmhelper-postgresql-backup.timer gmhelper-object-storage-backup.timer
```

Полностью отключить автозапуск таймера:

```bash
sudo systemctl disable --now gmhelper-postgresql-backup.timer gmhelper-object-storage-backup.timer
```

Остановить выполняющийся прямо сейчас backup:

```bash
sudo systemctl stop gmhelper-postgresql-backup.service gmhelper-object-storage-backup.service
```

Полностью удалить автоматизацию backup, сохранив уже созданные копии:

```bash
sudo systemctl disable --now gmhelper-postgresql-backup.timer gmhelper-object-storage-backup.timer
sudo systemctl stop gmhelper-postgresql-backup.service gmhelper-object-storage-backup.service
sudo rm -f /etc/systemd/system/gmhelper-postgresql-backup.timer /etc/systemd/system/gmhelper-postgresql-backup.service /etc/systemd/system/gmhelper-object-storage-backup.timer /etc/systemd/system/gmhelper-object-storage-backup.service
sudo rm -f /usr/local/sbin/gmhelper-postgresql-backup /usr/local/sbin/gmhelper-object-storage-backup /etc/default/gmhelper-backup
sudo systemctl daemon-reload
sudo systemctl reset-failed
```

Файлы в `/var/backups/gm-helper` этими командами не удаляются. Удаление самих
резервных копий является отдельной необратимой операцией. Перед ней убедитесь,
что каталог содержит только backup GM Helper:

```bash
sudo find /var/backups/gm-helper -maxdepth 3 -printf '%M %u:%g %s %p\n'
```

Общий maintenance-lock нужен также для `gmhelper-deploy`, поэтому при удалении
только backup-автоматизации не удаляйте `/etc/tmpfiles.d/gmhelper-maintenance.conf`
и `/run/lock/gmhelper/maintenance.lock`.

После изменения backup-скрипта или systemd units повторите команды `install`,
выполните `sudo systemctl daemon-reload` и снова запустите ручной тест.

### Частые ошибки

- **`P1001: Can't reach database server`:** проверьте, что PostgreSQL слушает
  Docker gateway, `host.docker.internal` разрешается в нужный адрес и UFW
  разрешает Compose-подсеть к внутреннему порту `5432`.
- **`P1000: Authentication failed`:** синхронизируйте пароль роли
  `gmhelper_api` и пароль в `MAIN_DATABASE_URL`.
- **Migrator завершился с ошибкой:** не запускайте API вручную в обход
  миграций. Исправьте причину и повторите Compose-команду.
- **MinIO отвечает `Access Denied`:** проверьте `OBJECT_STORAGE_*` и повторите
  запуск профиля MinIO, чтобы `minio-init` создал пользователя и политику.
- **API остаётся `unhealthy`:** проверьте `/api/health` и логи `api-prod`.
- **Frontend обращается к старому API:** проверьте production `apiUrl`,
  пересоберите frontend и очистите кэш браузера/CDN.
