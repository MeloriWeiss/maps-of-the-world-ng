# Codex Local Memory

## Project

- Repository: `maps-of-the-world-ng`.
- Product: **GameMaster Helper**, a browser platform for tabletop-RPG game masters and world authors. It combines a map workshop, public map and texture-pack catalogs, author profiles, likes/comments, a forum, and a private administration area. `Maps-of-the-World` is the historical repository name.
- Stack: Nx monorepo, Angular 19 frontend, NestJS 11 backend, Prisma/PostgreSQL.
- Package manager: Yarn 4 (`packageManager`: `yarn@4.17.0`).

## Main Apps

- `apps/web`: Angular SPA.
  - Serve: `yarn start:web`.
  - Build: `yarn build:web` or `yarn build:web:prod`.
  - Proxy: `/api` -> `http://localhost:3000` via `apps/web/proxy-conf.json`.
- `apps/api`: NestJS HTTP API.
  - Serve: `yarn start:api`.
  - Build: `yarn build:api` or `yarn build:api:prod`.
  - API global prefix: `/api`.
  - Swagger setup exists in the API setup layer.
  - Global validation pipes and exception filters are enabled through `setupApp(app)`.

## Libraries

- `libs/shared/shared`: shared DTOs and interfaces used by web and api.
- `libs/api/api-auth`: auth endpoints, JWT guards/strategies, cookies, sessions.
- `libs/api/admin`: protected administration API, moderation, user management, and audit log.
- `libs/api/users`: users controller/service.
- `libs/api/database-main`: Prisma service, schema, migrations, seed scripts.
- `libs/api/api-shared`: env/config helpers.
- `libs/web/auth`: login/register UI, auth guards, interceptor, initializer.
- `libs/web/layout`: base/auth layouts, header/footer.
- `libs/web/home`, `libs/web/profile`, `libs/web/forum`, `libs/web/mods`: feature libs.
- `libs/web/data-access`: frontend services/interfaces/tokens.
- `libs/web/common-ui`: shared UI, pipes, SCSS mixins/functions.
- `libs/web/workshop`: main map editor/canvas workspace.
- `libs/web/admin`: lazy-loaded administration dashboard and management pages.

## Domain

- Prisma schema is at `libs/api/database-main/src/lib/prisma/schema.prisma`.
- Current models include `User`, `UserSession`, `PersonalAccount`, `Map`, `MapLike`, `MapComment`, `ForumCategory`, `Forum`, `ForumComment`, `ForumLike`, `TexturePack`, `TexturePackLike`, `Texture`, `AdminAuditLog`, and `SiteVisit`.
- Backend endpoints cover auth, users, accounts/profiles, owned and published maps, texture packs/files, and the working forum.
- Auth uses access/refresh JWT cookies, refresh rotation, session storage, logout, logout-all, and sessions listing.
- Password validation intentionally differs by operation:
  - registration enforces the shared 6–30 character limit and at least one uppercase Latin letter on both web and API;
  - login requires a non-empty string but does not reapply registration strength or maximum-length rules, so existing long passwords (including a 64-character production super-admin password) can authenticate;
  - invalid login credentials are handled by bcrypt comparison and return 401.
- `libs/api/maps` implements map persistence, publication, public viewing, and deletion:
  - `GET /api/maps?page=&pageSize=` returns the server-paginated public catalog as `{ items, total, page, pageSize }`; default page size is 9. Legacy `catalog` and `published` aliases remain temporarily for backward compatibility.
  - `GET /api/maps/:id` returns one published map for read-only viewing; `public/:id` and `published/:id` are compatibility aliases.
  - `GET /api/maps/mine` lists the current account's draft and published maps.
  - `GET /api/maps/authors/:userId` lists an author's published maps.
  - `GET /api/maps/mine/:id` loads one owned map.
  - `POST /api/maps` creates a map.
  - `PUT /api/maps/:id` updates an owned map.
  - `PATCH /api/maps/:id/publication` publishes or unpublishes an owned map.
  - `DELETE /api/maps/:id` deletes only an owned map and its comments.
  - `POST /api/maps/:id/like` and `DELETE /api/maps/:id/like` add/remove the current account's like and return the new `isLiked`/`likesCount` state.
  - Public map responses already contain `isLiked` for the optional authenticated account and `likesCount`; clients must not fetch all favourites merely to annotate catalog items.
  - Workshop snapshots are stored in the existing `Map.body` string column.
- API JSON request bodies accept up to 10 MB to accommodate workshop snapshots.
- Textures are not standalone user-library entities. Every texture belongs to a `TexturePack`; do not restore a UI or API for creating ungrouped textures.
- `libs/api/textures` implements texture-pack management:
  - `GET /api/texture-packs?page=&pageSize=` returns the server-paginated public catalog as `{ items, total, page, pageSize }`; default page size is 9.
  - `GET /api/texture-packs/authors/:userId` lists an author's published packs.
  - `GET /api/texture-packs/:id` returns public details of one published pack; `public/:id` and `published/:id` remain compatibility aliases.
  - `GET /api/texture-packs/:id/textures?page=&pageSize=` returns a paginated public texture page; drafts must return 404.
  - `GET /api/texture-packs/mine` lists all packs owned by the current account.
  - `GET /api/texture-packs/mine/:id` reads one owned pack.
  - `GET /api/texture-packs/mine/:id/textures?page=&pageSize=` reads a paginated page of textures from an owned pack; consumers should request individual textures/pages rather than download the whole pack.
  - `POST /api/texture-packs` creates a draft pack.
  - `PATCH /api/texture-packs/:id` updates an owned pack's name and description.
  - `POST /api/texture-packs/:id/textures` accepts up to 50 multipart PNG/JPEG/WebP files, each up to 5 MB.
  - `DELETE /api/texture-packs/:id/textures/:textureId` deletes an owned texture and its object-storage file. Removing the final texture automatically unpublishes the pack.
  - `DELETE /api/texture-packs/:id` deletes an owned pack, its texture metadata, and all associated object-storage files.
  - `PATCH /api/texture-packs/:id/publication` publishes or unpublishes an owned pack; empty packs cannot be published.
  - `POST /api/texture-packs/:id/like` and `DELETE /api/texture-packs/:id/like` add/remove a like and return the new state.
  - Public texture-pack responses contain `isLiked` and `likesCount`, using the optional authenticated account directly in the backend query.
  - `GET /api/textures/:id` reads texture metadata and `GET /api/textures/:id/file` streams one image by opaque UUID.
  - Pack list responses currently include at most eight recent `previewTextures`, not all pack contents.
  - PostgreSQL stores pack/texture metadata, ownership, publication state, like counters, and the unique texture `objectKey`; binary image contents are stored in S3-compatible object storage.
  - `TexturesService` depends on the `ObjectStorage` contract. `S3ObjectStorageService` is the current adapter and signs MinIO/R2 requests with AWS Signature Version 4 without an additional SDK dependency.
  - Object storage configuration is required; there is no local-directory fallback.
  - Development always uses MinIO from `docker/docker-compose.dev.yml`.
  - Production can use either self-hosted MinIO or Cloudflare R2 without API code changes.
  - Switching providers does not migrate existing objects; preserve all `objectKey` values when copying a bucket.
  - The former one-time import from `.data/textures` has been removed and must not be restored.
  - `TexturesModule` imports `DatabaseMainModule`, `ApiAuthModule`, and the shared `ObjectStorageModule`; importing them only in root `AppModule` does not expose their providers in the feature module.
- `libs/api/forum` implements the working forum API:
  - `GET /api/forum-categories` lists categories.
  - `GET /api/forum-discussions?page=&pageSize=&search=&category=` returns a paginated/searchable/category-filtered list.
  - `GET /api/forum-discussions/:id` returns one discussion with its nested comment tree and optional authenticated like state.
  - `POST /api/forum-discussions` creates a discussion for an authenticated account.
  - `POST /api/forum-discussions/:id/comments` creates a top-level comment or reply through optional `parentId`.
  - `POST /api/forum-discussions/:id/likes` and `DELETE /api/forum-discussions/:id/likes` update the current account's like.
- Profile avatars also use the existing object-storage abstraction; PostgreSQL stores only `PersonalAccount.avatarUrl`, not image bytes.
  - `POST /api/accounts/me/avatar` immediately uploads or replaces the current avatar.
  - `DELETE /api/accounts/me/avatar` clears the database reference and removes the stored image.

## Administration

- Administration is a private, non-indexable section under `/admin`, implemented in `libs/web/admin` and lazy-loaded from the application routes.
- Roles are `USER`, `ADMIN`, and `SUPER_ADMIN`; user statuses are `ACTIVE` and `BLOCKED`.
- The authenticated user's current role and status are read from the database for protected requests. Blocking a user invalidates that user's sessions.
- Only `SUPER_ADMIN` can grant or revoke the `ADMIN` role. Administrators cannot change their own role/status, and a super-administrator cannot be blocked or demoted through the regular admin API.
- The first super-administrator is created explicitly with `yarn admin:create-super`. The command requires `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_USERNAME`, and a `SUPER_ADMIN_PASSWORD` of at least 12 characters; it refuses to create a second super-administrator and can promote a matching existing user.
- The API is exposed below `/api/admin` and provides dashboard statistics, user/traffic analytics, paginated/searchable users, role/status changes, map/texture-pack/forum moderation, filtered audit records, and system status.
- Content moderation is reversible: `Map`, `TexturePack`, and `Forum` use `isHidden`; public queries exclude hidden content. Administration does not physically delete moderated content.
- `AdminAuditLog` records role/status changes and content hide/restore actions. Audit responses resolve target names in batches; the web presenter translates technical actions/details and falls back to type plus id when the target no longer exists.
- Admin web pages include the dashboard, users, content moderation, and audit log. All list pages support pagination and hide it when there is only one page.
- Admin list/filter state is URL-backed where applicable:
  - users support search;
  - content supports tabs plus search, author, visibility, publication status, and forum category;
  - audit supports actor nickname/username/email, action, target type/id, and date range.
- Dangerous admin actions use confirmation modals and pending-button guards. Server authorization remains authoritative: UI confirmation is not a security boundary.
- Loading failures are rendered separately from empty states and offer retry actions; failed mutations are also visible to administrators.
- Site traffic is recorded once per browser session through the public visit endpoint. `SiteVisit.sessionId` makes recording idempotent; optional `visitorId` is used for unique-visitor counts and is not derived from registered users.
- `GET /api/admin/user-analytics` returns registrations, visits, and unique visitors for arbitrary date ranges. Supported requested/effective intervals are hour/day/week/month/year; the API automatically coarsens overly detailed ranges toward roughly 400 points and returns the effective interval.
- `GET /api/admin/system-status` is protected by admin roles and checks PostgreSQL plus S3-compatible object storage independently with a three-second timeout. It also returns API uptime, version, response times, and check time. There is no polling: the dashboard calls it on page creation and when the administrator presses the refresh button.
- `ObjectStorage.checkAvailability()` performs a read-only signed S3 `HEAD` request against the configured bucket. Implementations and test fakes must preserve this contract.
- The dashboard uses `ng2-charts@8.0.0` with `chart.js@4.5.1`. Chart registration stays inside the lazy admin route so it does not increase the initial public bundle.
- `admin-web` now has its own standard Jest target/configuration. Current focused suites cover the admin guard, audit presenter, admin API rules/filters/analytics/system status, S3 availability, and texture storage consumers.
- The admin route declares `index: false`; child routes inherit the parent SEO metadata and are emitted as `noindex, nofollow`.

## Docker and Object Storage

- Root `.env` is development-only and is created from `.env.example`.
- Development Docker Compose currently runs infrastructure only; it does not build or run the NestJS API container.
- Run the development API locally with `yarn start:api` after starting its dependencies with `yarn start:api-deps:docker`.
- There is no `apps/api/dev.Dockerfile`, `start:api:docker` script, development API healthcheck, Compose Watch source synchronization, or Docker-based API hot reload in the current revision.
- `yarn start:api-deps:docker` runs Docker Compose in attached mode and always starts PostgreSQL, MinIO, `minio-init`, and pgAdmin.
  - Logs remain in the terminal.
  - `Ctrl+C` stops the development services.
  - PostgreSQL is published at `localhost:5433`.
  - MinIO S3 API is at `http://localhost:9000`; Console is at `http://localhost:9001`.
  - pgAdmin is at `http://localhost:5050`; connect from pgAdmin to host `db`, port `5432`.
- `minio-init` is a short-lived idempotent container. It creates the bucket and application user, attaches the policy, then exits successfully. It has no volume or legacy texture mount.
- Production uses `docker/docker-compose.prod.yml`:
  - The verified server layout keeps the repository at `/opt/gm-helper/backend` and frontend static files at `/var/www/gmhelper-frontend`.
  - Node.js and Yarn are not required on the production host; Docker builder stages run Corepack/Yarn.
  - `docker compose -f docker/docker-compose.prod.yml --profile minio up -d --build` starts migrator, API, MinIO, and `minio-init`.
  - Without the `minio` profile, Compose starts migrator and API for external Cloudflare R2.
  - The one-shot migrator runs `prisma migrate deploy`; API waits for successful migrations.
  - API binds only to `127.0.0.1:3000`, runs as the non-root `node` user, and uses strict `GET /api/health` health checks.
  - API and MinIO Docker JSON logs rotate at three files of 10 MiB each.
  - MinIO data persists in named volume `docker_minio_data`; never use `down --volumes`, `docker volume prune`, or manually edit its internal files.
  - pgAdmin is not a production service.
- The verified production PostgreSQL runs as an Ubuntu system service rather than in Docker:
  - database `gmhelper_prod`, application role `gmhelper_api`;
  - data lives under `/var/lib/postgresql`;
  - PostgreSQL listens on localhost and the Docker gateway, not on `0.0.0.0`;
  - containers connect through `host.docker.internal:5432`;
  - UFW permits only the GM Helper Compose subnet to the internal Docker-gateway address on port 5432.
- Production deployment is managed by `/usr/local/sbin/gmhelper-deploy`, installed from `scripts/deploy-production.sh`:
  - it can be invoked from any directory but internally uses `/opt/gm-helper/backend`;
  - it acquires `/run/lock/gmhelper/maintenance.lock` before reading or changing the repository and holds it for the full deployment;
  - another deploy or backup waits for the same lock for up to 7200 seconds by default (`GMHELPER_MAINTENANCE_LOCK_WAIT_SECONDS` overrides the positive-integer timeout), preventing concurrent Git, image-build, migration, and container-replacement races;
  - it requires a clean worktree, at least 5 GiB free, `git pull --ff-only`, valid Compose, successful migrator, and healthy API;
  - it does not run `docker image prune`; inspect dangling images and prune only after successful deployment;
  - after an intentional force-push, use `git fetch origin master` and `git reset --hard origin/master` only when `git status --short` is empty, then rerun `gmhelper-deploy`; never use `git clean -fd` on the server.
- Do not stop containers before normal deployment. Images build while the old API runs, then API replacement may cause a few seconds of API downtime; frontend, PostgreSQL, and MinIO remain available.
- Production schema changes must follow expand-migrate-contract because the old API may run while migrations apply. Add compatible nullable/defaulted structures first, migrate data, and remove old structures or add `NOT NULL` only in a later release.
- Production secrets live in ignored files:
  - `docker/.env.prod`, based on `docker/examples/.env.prod.example`;
  - `docker/.env.minio.prod`, based on `docker/examples/.env.minio.prod.example`, only for self-hosted MinIO administration.
- Backup automation exists in the repository but is intentionally not enabled on the current server yet:
  - PostgreSQL and object storage have independent scripts, systemd services, timers, logs, and retention settings;
  - object-storage backup reads `OBJECT_STORAGE_*` and works with either MinIO or Cloudflare R2 through S3 API;
  - both jobs use the same maintenance lock as deploy and enforce minimum free space;
  - local backups live under root-only `/var/backups/gm-helper`; inspect them with `sudo`, do not weaken directory permissions;
  - local copies protect against operator errors but not physical disk loss; external backup remains future work.
- Documentation roles:
  - `README.md`: local setup, development, and builds.
  - `DEPLOYMENT.md`: end-to-end Linux server deployment, MinIO/R2 choice, verification, backup, and update procedure. It has a table of contents and a dedicated anchored section `Быстрые команды постановки frontend на сервер`.
  - `OBJECT_STORAGE.md`: S3 terminology and the internal storage architecture; do not duplicate operational instructions there.

## Angular Routing

- `apps/web/src/app/app.routes.ts` is the composition root. Public route definitions live in `apps/web/src/app/routing/public.routes.ts`, and authentication routes live in `apps/web/src/app/routing/auth.routes.ts`.
- `apps/web/src/app/app.config.ts` enables `withInMemoryScrolling` with browser-history scroll restoration and anchor scrolling.
- Authenticated area uses `BaseLayoutComponent` and `canActivateAuth`.
- Lazy/feature routes include `home`, `profile/:id`, `forum`, `mods`, `/maps`, the `/texture-packs` catalog, and the guarded `/admin` section.
- `/texture-packs/:id` is the read-only public pack details page; `/texture-packs/:id/edit` is the separate owner editor. Keep the `/edit` route before the generic `/:id` route.
- `workshop` loads `WorkshopPageComponent` directly.
- `login` and `register` use `AuthLayoutComponent` and `canActivateNonAuth`.

## SEO

- SEO requirements are part of root `AGENTS.md`; apply them to every public route and route/content change.
- `SeoService` in `libs/web/shared/src/lib/seo` is the single metadata service and Angular `TitleStrategy`.
- Route data supplies static `title`, description, canonical path, indexing and page type; dynamic detail pages update metadata from loaded entities.
- The service owns title, meta description, robots, canonical, Open Graph, and Twitter Card tags. Canonical URLs strip query parameters by default, including pagination/search parameters.
- `apps/web/src/index.html` contains safe initial metadata for crawlers and social previews; do not let it drift from runtime defaults.
- Public route changes must also consider `public/robots.txt`, `public/sitemap.xml`, semantic headings, internal links, and redirects.

## UI Notes

- The current public home page is a live HTML/CSS composition rather than a canvas-only experience. It has an interactive atlas hero, a three-step story section, three featured maps loaded through `MapsService`, and a final manifesto CTA.
- Hovering the circular atlas map replaces the cursor with a route-point marker; featured-map previews currently keep their normal cursor behavior.
- The public About page contains intro, mission, principles, ecosystem navigation, and invitation sections. It intentionally has no authors/founders section; its adjacent sections use distinct backgrounds.

- Shared input component: `libs/web/common-ui/src/lib/components/form-input`.
- `wm-form-input` is a ControlValueAccessor and supports `type`, `placeholder`, and optional `[showPasswordToggle]="true"`.
- Password visibility toggle is implemented inside `wm-form-input` using `eye` / `eye-off` SVG assets from `public/assets/svg`.
- Auth login/register password fields enable the toggle via `[showPasswordToggle]="true"`.
- Reusable popovers/context menus are implemented by `PopoverComponent` in `libs/web/common-ui`.
  - Content is projected through `wmPopoverTrigger` and `wmPopoverContent`.
  - It supports alignment, bare/default appearance, fixed positioning, outside-click closing, and Escape.
  - The header profile icon uses it for at least `Профиль` and `Выйти`.
  - Workshop tool settings and scene-node context menus also use it; do not reintroduce separate local popup infrastructure for equivalent interactions.
- `ConfirmationModalComponent` is opened through `ModalService.show(component, inputs)`. Its reusable inputs are `title`, `subtitle`, `agreeBtnText`, and `rejectBtnText`.
  - `BaseModalComponent` owns the fixed overlay, dark translucent backdrop, outside-click closing, and stacking above the header.
  - `modal-wrapper` must remain a neutral shrink-to-fit container; each concrete modal owns its width, background, padding, and visual styling.
- The auth interceptor handles `/auth/refresh` before normal global unauthorized reporting. A failed refresh must not show a transient user-facing `Unauthorized` notification.
- Empty profile tabs use the shared `EmptyStateComponent`; new empty tabs should follow the same pattern.
- Shared client state is built without NgRx through `BaseStore<T>` in `libs/web/data-access/src/lib/store` and Angular signals.
  - `CurrentAccountStore` is the root-scoped authenticated-account store and owns the current `UserResponseDto`, profile summary, avatar URL, and profile-loading state shared by the header and profile pages.
  - `AuthService` synchronizes it after login, registration, refresh, and session restoration, and clears it on logout.
  - During `401 -> refresh -> retry`, the same user may be authenticated twice. `CurrentAccountStore.authenticate()` must not invalidate an active profile request for the same user; request versions change only when the account actually changes or is cleared.
- `SearchableSelectComponent` in `common-ui` accepts generic `{ value, label, description? }` options, supports local search, a scrollable list, outside-click closing, and keyboard navigation.
  - Search clear content is projected with `wmSearchableSelectClearIcon`; the dropdown indicator can be projected with `wmSearchableSelectIndicator`.
- `SelectComponent` (`wm-select`) is the light rounded select without search. Options are projected as `wm-option`, so callers retain control of each option's content and styling. Admin analytics and filters use it.
- `TabsComponent` in `common-ui` is the reusable tab navigation used by profile/admin layouts; keep tabs mounted while tab content loads.
- `ToggleComponent` (`wm-toggle`) in `common-ui` is the reusable signal-friendly switch. It accepts `checked`, `disabled`, and `ariaLabel`, emits `checkedChange`, and receives its visible label through content projection.
- `PaginationService` and `PaginationComponent` in `common-ui` are the shared query-parameter pagination implementation. `visiblePages` is computed reactively from both `currentPage` and `maxPage`; do not restore the former `untracked(maxPage)` effect because it hid pagination on initial async loads.
- `DeskListComponent` supports `paginationInHeader`. The forum uses it so pagination sits in the brown header between the discussion count and search; a second paginator remains below the list.
- Public maps and texture-pack catalogs show pagination at the right side of their heading and below the cards. The maps catalog intentionally has no `Создать карту` button in its heading.

## Profile and Catalog Notes

- Profile routes use `/profile/me/...` for the current account and `/profile/:userId/...` for another user.
- The profile header displays the viewed user's nickname, avatar, bio/member-since information, aggregate received likes, and counts of published maps and texture packs.
- Only the current user's profile shows the edit-profile link. The form edits nickname, first name, and bio; no surname field is used.
- Avatar management is intentionally outside the edit form:
  - On `/profile/me/edit`, clicking the avatar opens the shared popover with `Загрузить изображение` and `Удалить изображение`.
  - Selecting PNG/JPEG/WebP up to 5 MB uploads immediately and replaces the visible avatar without submitting the profile form.
  - Deletion uses the shared confirmation modal and immediately restores the placeholder.
  - The avatar popover must escape the profile information card; do not restore `overflow: hidden` on `.profile-header-wrapper`.
- Profile navigation is a horizontal full-width tab bar for maps, texture packs, and favourites.
- Favourites combine maps and texture packs under `GET /api/accounts/me/favourites`; the response is grouped by resource type so future types can be added without mixing card contracts.
- Users can remove an item from favourites directly in the favourites tab. This performs an unlike operation, not entity deletion, and uses the shared confirmation modal plus the crossed-heart action icon.
- Empty-state handling applies both when the entire favourites collection is empty and when an individual resource group has no items.
- Own maps and own texture packs are split into separate `Черновики` and `Опубликованные` lists. Other users expose only published content.
- Every empty list/tab should render a contextual shared empty state rather than a blank region.
- `/texture-packs` is the public catalog and contains only published packs. Own drafts and published packs are managed from the profile texture-pack section.
- `/maps` and `/texture-packs` use backend pagination with 9 cards per page and keep the current page in the `page` query parameter.
- Public catalog cards link by title and `Подробнее о паке` to `/texture-packs/:id`.
- `/texture-packs/:id` displays public pack metadata, author link, description, and all textures through paginated loading; it never exposes editing controls.
- `/texture-packs/:id/edit` is the detailed owner editor for name, description, upload, individual texture deletion, publication, and full-pack deletion.
- Texture-pack cards use `TexturePackPreviewSliderComponent`, which adapts texture data to the existing `ImagesSliderComponent`/`ngx-owl-carousel-o` approach.
  - The profile uses the compact `regular` presentation.
  - The public catalog passes `size="large"` and uses the same responsive carousel configuration as the mods page: 2 items on small screens, 3 from 480px, and 4 from 768px upward.
  - The public carousel intentionally avoids `autoWidth`; mixing `autoWidth` with looping caused clipped initial slides and blank track space.
- Public pack cards occupy the available content width, remain white, use only a subtle shadow, and do not reserve `min-height`.
  - Author links are styled application links rather than browser-default blue links.
- If a pack has no description, the public card omits the description element entirely.
- The header groups growing content sections under the `Библиотека` popover: maps, texture packs, and mods. Do not add each section as another top-level header item.
- Own map cards expose deletion as a neutral trash icon in the preview's top-right corner. It appears via opacity on hover/focus (and remains visible on touch layouts) and opens `ConfirmationModalComponent`; do not add a third full-width action button.

## Workshop Notes

- `libs/web/workshop` is a Canvas-based editor.
- The current editor shell is based on `.codex/examples/workshop.png` and targets a 1280x969 viewport:
  - 58px header with logo and drawing controls.
  - 56px left tool rail.
  - Central canvas workspace with a 35px bottom status/zoom bar.
  - Approximately 400px right sidebar split into Objects and Layers panes.
- Both the left tool rail and right sidebar are collapsible. Their components expose a `collapsed` host class; `workshop-page.component.scss` adjusts the grid with `:has(...)`.
- After a sidebar transition, its component measures the new width and calls `WorkshopCanvasSizeService.resizeCanvas()`. The size service updates `WorkshopCoordsService.worldViewport` with the existing camera/zoom before redrawing, which prevents blank canvas strips after a sidebar closes. Preserve this recalculation when changing sidebar dimensions.
- Experimental changes to sidebar animation/layout were reverted after they disturbed canvas proportions and zoom. Do not rework sidebar transitions without verifying both opening and closing at the current camera position.
- The Layers pane uses a custom thin dark scrollbar defined in `workshop-right-sidebar.component.scss`.
- The layer tree uses reusable `VirtualListComponent` from `libs/web/common-ui`.
  - It accepts arbitrary items, a projected row template, fixed row height, and overscan.
  - It renders only the visible range while a spacer preserves the full scroll height.
  - Keep rows at a fixed height unless the virtual-list API is extended to support measured variable heights.
- Layers and other tree nodes with children are collapsed by default. Expanding a node exposes its descendants.
- Generated layers carry names in `LayerNode.layerData.name`; the panel displays this value and falls back to the technical id only for unnamed legacy layers.
- Generated layer names are currently `Континенты`, `Реки и горы`, `Дома`, and `Мебель`.
- Shapes have an optional persistent `name` serialized into workshop snapshots.
  - Generated objects receive semantic names such as `Континент`, `Река`, `Гора`, `Дом`, `Стол`, `Шкаф`, `Кровать`, and `Стул`.
  - Default names for manually created shapes belong to their concrete classes and are passed to `BaseShapeShape`; do not restore a central type switch in `WorkshopShapesService`.
  - A shape can be renamed inline from the layer tree by double-clicking its name. Enter/blur saves and Escape cancels.
- Tool enum: `select`, `pencil`, `eraser`, `rectangle`, `text`, `texture`.
- Tool switching is managed by `WorkshopToolsService`. Tools are created from factories in an Angular injection context; the previous tool may release resources through optional `Tool.dispose()`.
- The left sidebar is at `feature-workshop-page/workshop-page/workshop-left-sidebar`.
  - Left click selects a tool.
  - Right click opens an anchored tool-settings panel beside the clicked icon.
  - The panel follows the editor mockup and edits line width, opacity, stroke color, and fill color.
  - Texture additionally exposes functional texture scale and rotation controls plus a preview.
  - It closes on an outside click, tool selection, close button, or `Escape`, and is kept inside the viewport.
  - The left sidebar remains 56px wide. Its tool button may extend to 64px on hover, but the icon stays centered in the original 56px grid column.
  - `.workshop__left-sidebar` uses `overflow: visible` and a z-index above the workspace so the hover extension is drawn over the canvas without changing sidebar width.
- Per-tool drawing profiles are stored in `WorkshopSettingsService.toolStyles`.
  - `WorkshopToolsService.setCurrentTool()` applies the selected profile.
  - Editing an inactive tool only updates its stored profile; editing the active tool also applies it immediately.
  - Pencil and rectangle consume `shapeStyle`; text maps its fill to `textStyle.fillColor`; texture maps stroke color/width to `textureStyle`.
  - The eraser remains a logging stub, so its stored settings do not affect canvas output yet.
- The sidebar previously routed the text, texture, and final icon buttons to `rectangle`; they now select `text`, `texture`, and `eraser` respectively.
- Selection and editing:
  - Shift-click and marquee selection support multiple shapes.
  - A common selection box with eight resize handles is rendered by `WorkshopCanvasManagerService`.
  - Dragging a selection moves it; dragging handles transforms all selected shapes.
  - `ShapeActions.transform(from, to)` is implemented for rectangle, line, text, and texture stroke.
  - The right properties panel applies common fill/stroke/opacity/shadow changes to all selected shapes; single rectangles retain width/height controls.
- Canvas navigation:
  - Middle-button drag pans the world/camera and calls `preventDefault()` to suppress browser auto-scroll.
  - The world background and 100-unit grid are drawn by `WorkshopCanvasManagerService`, so they pan and zoom with shapes.
  - The bottom “Показать сетку” control is the shared `wm-toggle`; the state still belongs to `WorkshopCanvasManagerService.showGrid` and the workspace requests a redraw on change.
  - Ctrl+wheel zooms around the pointer. The bottom slider zooms around canvas center.
  - `WorkshopPanningService.zoomPercent` is the shared reactive zoom value; wheel and slider keep each other synchronized.
  - Slider range is currently 10%-400%, while the coordinate service supports 10%-1000%.
- It has shapes, scene graph nodes (`GraphNode`, `LayerNode`, `GroupNode`, `ShapeNode`), layers, quadtree, panning, coords, draw/settings/services, and sidebars.
- Scene graph auto-save currently stores through `WorkshopSceneGraphStorageService`; inspect storage before changing persistence.
- `WorkshopSceneGraphStorageService` now supports versioned `exportSnapshot()` and `importSnapshot()` in addition to localStorage auto-save.
- Texture strokes are part of scene-graph serialization and persist texture id/URL, scale, rotation, color, and points.
- `TextureStrokeShape` uses the uploaded image as a repeating `CanvasPattern`; texture scale affects the pattern transform independently from stroke width.
- The editor is hidden behind an interactive full-page loader while its map and texture assets initialize.
  - `WorkshopCanvasSetupFacade` owns canvas setup, asset-readiness waiting, and the reactive loading status.
  - `WorkshopPageComponent.ngAfterViewInit()` waits for canvas setup, measures the rendered shell, resizes the canvas, waits for referenced texture images, renders the initial fitted frame, and only then tells the facade to mark the editor ready.
  - Preserve this ordering: the editor must not become interactive before its layout, texture assets, and first frame are ready.
- Rendering is layer-buffered: the current `WorkshopCanvasManagerService.#renderLayer()` draws layer children into an offscreen canvas and then composites it onto the main canvas even in the branch used when `useOffscreen` is false. The flag changes buffering behavior rather than simply enabling/disabling all offscreen rendering.
- The workshop header has a generation toolbar plus compact map controls:
  - Seed input and `Сгенерировать` invoke `WorkshopWorldGeneratorService`.
  - The map selector is the shared searchable/scrollable `SearchableSelectComponent` and lists only saved owned maps; creation of a new map is intentionally not an option in this selector.
  - A burger popover beside the logo contains map metadata and actions: editable name and description, `Новая карта`, `Сохранить`, `Перезагрузить`, `Очистить холст`, and a styled `Вернуться к картам` link.
  - `WorkshopMapPersistenceService` owns both `mapName` and `mapDescription`; both are restored from loaded maps and included in save payloads.
  - `Сохранить` and `Перезагрузить` use `WorkshopMapPersistenceService` and `/api/maps`; do not move persistence business logic into the header component.
  - Saving from Workshop creates or updates the map that appears in the current user's profile map lists.
  - Profile map cards link back to Workshop for editing.
  - The current backend map id is remembered in localStorage under `workshop-map-id`.
- Published maps open in Workshop through `viewMapId` as read-only maps:
  - Drawing/editing tools are disabled, but canvas pan and zoom remain available.
  - The canvas keeps its natural aspect ratio and must not stretch to the available width.
  - `Сохранить в мои черновики` creates an editable owned copy and switches out of read-only mode.
- Procedural world prototype:
  - A seed produces a deterministic editable world.
  - Generated object kinds currently include continents, rivers, mountains, houses, tables, wardrobes, beds, and chairs.
  - Generated objects are ordinary line/rectangle shapes, so existing selection, resize, move, and property editing continue to work.
  - The generator creates separate terrain, geography, settlement, and interior layers.
- Level of detail:
  - Shapes have optional `minZoom`, `maxZoom`, and `mapObjectType` metadata.
  - Rendering and selection both respect the current zoom range.
  - Continents appear at world scale, geography at regional scale, houses closer in, and furniture above roughly 210%.
  - Viewport culling remains active.
  - The canvas background now covers the current world viewport and the grid step adapts to zoom instead of being limited to a fixed 2000x2000 area.
- The header uses the editor mockup styling. Undo/redo buttons are currently visual only; drawing controls remain connected.
- The header `Очистить` action removes user-created scene content through `WorkshopCanvasManagerService.clearUserContent()`, creates a fresh active root layer, and redraws. The editor background and grid are renderer-owned and remain visible after clearing.
- The bottom full-screen button is currently visual only.
- Reusable mini-menu/context-menu behavior is provided by the shared `PopoverComponent`; Workshop uses it for tool settings and node menus.

## Commands

- Install dependencies: `yarn install`.
- Start web: `yarn start:web`.
- Start API: `yarn start:api`.
- Start attached development infrastructure (PostgreSQL + MinIO + pgAdmin): `yarn start:api-deps:docker`.
- Create/apply a development migration: `yarn db:main:migrate`.
- Apply existing production migrations: `yarn db:main:deploy`.
- Generate Prisma client: `yarn db:main:generate`.
- Prisma seed: `yarn db:main:seed`.
- Create the first production super-administrator: set `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_USERNAME`, and `SUPER_ADMIN_PASSWORD`, then run `yarn admin:create-super`.
- Deploy production API with self-hosted MinIO: `yarn deploy:api:prod:docker:minio`.
- Deploy production API with Cloudflare R2: `yarn deploy:api:prod:docker:cloudflare-r2`.
- Verified production-server update: `gmhelper-deploy` (MinIO) or `GMHELPER_STORAGE_MODE=r2 gmhelper-deploy` (R2).
- After a successful production update: inspect with `docker image ls --filter dangling=true`, then run `docker image prune -f` and `docker system df`.
- Lint all: `yarn lint`.
- Test all: `yarn test`.
- Generate docs: `yarn docs:gen`.

## Development Seed

- `yarn db:main:seed` is destructive by design: it truncates the local main database, resets identities, and recreates the complete deterministic development dataset.
- The development seed is explicitly blocked when `NODE_ENV=production`; production super-administration is created only with the one-shot `yarn admin:create-super` command.
- The current seed creates 8 users/accounts, 36 maps (30 published), 15 texture packs (12 published), 192 textures, 55 forum discussions with nested comments, likes, and sessions.
- All demo accounts use the shared `SEED_PASSWORD` constant from `seed/users.ts`: `Admin123`. Primary credentials are `admin@example.com / Admin123` and `user@example.com / Admin123`; the seeded `admin@example.com` account has role `SUPER_ADMIN` for development only.
- Generated texture sources live in `libs/api/database-main/src/lib/prisma/seed/assets/texture-packs`.
- There are 12 thematic top-down fantasy materials and four orientation variants per theme. Packs keep their own theme; variants are repeated as needed to preserve the 62-texture pagination scenario in the first pack.
- `uploadSeedImages()` uploads the real PNG source files to configured S3/MinIO and uploads only the small placeholder for seed avatars.
- Seed texture object keys and deterministic UUIDs are versioned (`v2` / `22...`) because `/api/textures/:id/file` is cached for one year as immutable. Change the seed version whenever the bytes behind deterministic seed texture URLs change.
- The seed requires PostgreSQL; object-storage failures leave metadata populated but images unavailable. A successful current run reports `Object storage seed images: 200`.

## Caveats

- PowerShell displayed `README.md` and some Russian strings as mojibake during inspection; be careful with file encoding.
- Snapshot refreshed on 2026-08-14 after the administration, analytics, documentation, migration, system-status, deployment-safety, and login-validation work. The working tree contains current user/assistant changes; do not assume it is clean and do not discard or restage unrelated files.
- Prefer existing Nx project patterns and standalone Angular conventions.
- Before implementing a feature, identify which entity owns the state and behavior.
- Prefer encapsulation and polymorphism over central switches or mappings that must change whenever a new subtype is introduced.
- Services should coordinate entities rather than know every concrete entity type.
- Create reusable UI abstractions when the current problem and likely future uses share a clear stable contract; avoid abstractions without a concrete reuse case.
- Keep fixes narrowly scoped. Do not change adjacent layout or behavior unless it is necessary for the requested result.
- Production deployment was installed and smoke-tested on 2026-08-09: API health, PostgreSQL persistence, MinIO persistence, container recreation, Nginx HTTPS proxying, migrations, and log rotation worked. Backup timers remained disabled as of 2026-08-12.
- The production host is shared with Mailcow, Nextcloud, and Portainer. Never stop/remove unknown containers or use global destructive cleanup such as `docker system prune -a` or `docker volume prune`.
- The environment-file refactor discussed on 2026-08-12 was fully reverted. Keep the established production split: `docker/.env.prod` contains API/JWT and `OBJECT_STORAGE_*`; `docker/.env.minio.prod` contains only MinIO administration credentials. The four original files in `docker/examples` remain valid examples; do not rename them without a new explicit deployment migration plan.
- The repository migration chain now includes `20260803232703_remove_theme_and_language`, `20260812230000_add_admin_roles`, `20260813190000_add_site_visits`, and `20260813210000_add_site_visit_visitor_id`. Production must apply them with `prisma migrate deploy`; do not replace migration deployment with `db push`.
- The obsolete theme/language columns and values were intentionally removed without backup at the user's request. Do not restore them unless a new feature explicitly requires new schema/data.
- Site-visit analytics requires both the `site_visits` table and its `visitor_id` column. A Prisma `42P01`/missing-table or PostgreSQL `42703`/missing-column error on `/api/admin/user-analytics` means the running database has not applied the complete migration chain.
- Current verification on 2026-08-14 passed: API production build, web production build, `admin-api` lint/tests (12 tests), `admin-web` lint/tests (8 tests), `api-shared` tests (5 tests), `textures` lint/tests (14 tests), and `git diff --check`. `api-shared` has no lint target. The web build retains pre-existing initial-bundle and home-style budget warnings; admin/chart code remains lazy-loaded.

## Backend Repair Notes (2026-07-27)

- The local PostgreSQL database originally contained legacy PascalCase tables while Prisma expected snake_case tables. This caused login to fail with a Prisma error and HTTP 500.
- The migration chain was registered and applied in the database inspected on 2026-07-27. This is historical information and does not describe the current local database noted above.
- The repository migration chain contains the historical migrations listed above plus the later theme/language removal, admin-role, site-visit, and visitor-id migrations. Treat this section as repair history, not a replacement for inspecting the current migration directory.
- The local database previously matched the Prisma schema but had no `_prisma_migrations` table because it had been created outside the migration chain. The six pre-texture migrations were safely baselined after `prisma migrate diff` confirmed that the only schema delta was `textures`; the texture migration was then deployed.
- The invalid historical seed bcrypt placeholder was replaced. Demo credentials are `admin@example.com` / `Admin123`.
- `GlobalExceptionFilter` now sends the status calculated for Prisma errors, maps common database failures, and does not expose unexpected internal error messages.
- API bootstrap failures are caught and logged.
- `apps/api/project.json` regenerates the Prisma client before API builds.
- A backend process may already occupy port 3000 during development; use another `MAIN_API_PORT` for isolated smoke tests rather than stopping an unknown user process.
