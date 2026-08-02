# Codex Local Memory

## Project

- Repository: `maps-of-the-world-ng`.
- Product: DnD/world map modelling app.
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
- `libs/api/users`: users controller/service.
- `libs/api/database-main`: Prisma service, schema, migrations, seed scripts.
- `libs/api/api-shared`: env/config helpers.
- `libs/web/auth`: login/register UI, auth guards, interceptor, initializer.
- `libs/web/layout`: base/auth layouts, header/footer.
- `libs/web/home`, `libs/web/profile`, `libs/web/forum`, `libs/web/mods`: feature libs.
- `libs/web/data-access`: frontend services/interfaces/tokens.
- `libs/web/common-ui`: shared UI, pipes, SCSS mixins/functions.
- `libs/web/workshop`: main map editor/canvas workspace.

## Domain

- Prisma schema is at `libs/api/database-main/src/lib/prisma/schema.prisma`.
- Current models include `User`, `UserSession`, `PersonalAccount`, `Map`, `MapLike`, `MapComment`, `Forum`, `ForumComment`, `TexturePack`, `TexturePackLike`, and `Texture`.
- Backend endpoints cover auth, users, accounts/profiles, owned and published maps, texture packs, and texture files; forum endpoints are not implemented yet.
- Auth uses access/refresh JWT cookies, refresh rotation, session storage, logout, logout-all, and sessions listing.
- `libs/api/maps` implements map persistence, publication, public viewing, and deletion:
  - `GET /api/maps` lists the public map catalog. Legacy `catalog` and `published` aliases remain temporarily for backward compatibility.
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
  - `GET /api/texture-packs` lists published packs for the public catalog.
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
- Profile avatars also use the existing object-storage abstraction; PostgreSQL stores only `PersonalAccount.avatarUrl`, not image bytes.
  - `POST /api/accounts/me/avatar` immediately uploads or replaces the current avatar.
  - `DELETE /api/accounts/me/avatar` clears the database reference and removes the stored image.

## Docker and Object Storage

- Root `.env` is development-only and is created from `.env.example`.
- `yarn start:api-deps:docker` runs Docker Compose in attached mode and always starts PostgreSQL, MinIO, `minio-init`, and pgAdmin.
  - Logs remain in the terminal.
  - `Ctrl+C` stops the development services.
  - PostgreSQL is published at `localhost:5433`.
  - MinIO S3 API is at `http://localhost:9000`; Console is at `http://localhost:9001`.
  - pgAdmin is at `http://localhost:5050`; connect from pgAdmin to host `db`, port `5432`.
- `minio-init` is a short-lived idempotent container. It creates the bucket and application user, attaches the policy, then exits successfully. It has no volume or legacy texture mount.
- Production uses `docker/docker-compose.prod.yml`:
  - `yarn deploy:api:prod:docker:minio` starts migrator, API, MinIO, and `minio-init`.
  - `yarn deploy:api:prod:docker:cloudflare-r2` starts only migrator and API and uses external R2.
  - The one-shot migrator runs `prisma migrate deploy`; API waits for successful migrations.
  - API binds only to `127.0.0.1:3000`, runs as the non-root `node` user, and has a healthcheck.
  - pgAdmin is not a production service.
- Production secrets live in ignored files:
  - `docker/.env.prod`, based on `docker/examples/.env.prod.example`;
  - `docker/.env.minio.prod`, based on `docker/examples/.env.minio.prod.example`, only for self-hosted MinIO administration.
- Documentation roles:
  - `README.md`: local setup, development, and builds.
  - `DEPLOYMENT.md`: end-to-end Linux server deployment, MinIO/R2 choice, verification, backup, and update procedure.
  - `OBJECT_STORAGE.md`: S3 terminology and the internal storage architecture; do not duplicate operational instructions there.

## Angular Routing

- Routes are in `apps/web/src/app/app.routes.ts`.
- Authenticated area uses `BaseLayoutComponent` and `canActivateAuth`.
- Lazy/feature routes include `home`, `profile/:id`, `forum`, `mods`, `/maps`, and the `/texture-packs` catalog.
- `/texture-packs/:id` is the read-only public pack details page; `/texture-packs/:id/edit` is the separate owner editor. Keep the `/edit` route before the generic `/:id` route.
- `workshop` loads `WorkshopPageComponent` directly.
- `login` and `register` use `AuthLayoutComponent` and `canActivateNonAuth`.

## UI Notes

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
- `ToggleComponent` (`wm-toggle`) in `common-ui` is the reusable signal-friendly switch. It accepts `checked`, `disabled`, and `ariaLabel`, emits `checkedChange`, and receives its visible label through content projection.

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
- Deploy production API with self-hosted MinIO: `yarn deploy:api:prod:docker:minio`.
- Deploy production API with Cloudflare R2: `yarn deploy:api:prod:docker:cloudflare-r2`.
- Lint all: `yarn lint`.
- Test all: `yarn test`.
- Generate docs: `yarn docs:gen`.

## Caveats

- PowerShell displayed `README.md` and some Russian strings as mojibake during inspection; be careful with file encoding.
- The working tree is not clean. Existing user changes include `.husky/post-merge`, the tool factory/disposal work in `WorkshopToolsService`, and optional `Tool.dispose()`. Preserve them.
- Workshop changes are currently uncommitted and span layout, sidebars, context settings, zoom/panning, selection transforms, shapes, and settings services. Preserve them as one ongoing body of user work.
- Current production checks pass: `yarn build:web` and `yarn build:api`.
- Relevant lint checks pass for `profile`, `texture-packs`, `textures`, and `common-ui`; `common-ui` still reports pre-existing warnings in unrelated components.
- `yarn nx test textures --runInBand` currently passes 14 tests covering uploads, ownership, individual/full-pack deletion, and public-pack visibility.
- The authenticated map API was smoke-tested end-to-end: login, create, read, and update succeeded; the temporary test map was removed.
- `git diff --check` succeeds; Git only reports expected LF-to-CRLF conversion warnings on Windows.
- Prefer existing Nx project patterns and standalone Angular conventions.
- Before implementing a feature, identify which entity owns the state and behavior.
- Prefer encapsulation and polymorphism over central switches or mappings that must change whenever a new subtype is introduced.
- Services should coordinate entities rather than know every concrete entity type.
- Create reusable UI abstractions when the current problem and likely future uses share a clear stable contract; avoid abstractions without a concrete reuse case.
- Keep fixes narrowly scoped. Do not change adjacent layout or behavior unless it is necessary for the requested result.

## Backend Repair Notes (2026-07-27)

- The local PostgreSQL database originally contained legacy PascalCase tables while Prisma expected snake_case tables. This caused login to fail with a Prisma error and HTTP 500.
- The migration chain is now registered and applied locally. The refactor migration preserves legacy data by renaming/converting tables and foreign keys instead of dropping them.
- The migration chain currently contains ten migrations through `20260729190000_add_texture_pack_likes`, including texture packs, publication, and pack-like counters.
- The local database previously matched the Prisma schema but had no `_prisma_migrations` table because it had been created outside the migration chain. The six pre-texture migrations were safely baselined after `prisma migrate diff` confirmed that the only schema delta was `textures`; the texture migration was then deployed.
- The invalid historical seed bcrypt placeholder was replaced. Demo credentials are `admin@example.com` / `admin123`.
- Login validation intentionally does not enforce registration password-strength rules; invalid credentials return 401.
- `GlobalExceptionFilter` now sends the status calculated for Prisma errors, maps common database failures, and does not expose unexpected internal error messages.
- API bootstrap failures are caught and logged.
- `apps/api/project.json` regenerates the Prisma client before API builds.
- A backend process may already occupy port 3000 during development; use another `MAIN_API_PORT` for isolated smoke tests rather than stopping an unknown user process.
