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
- Current models include `User`, `UserSession`, `PersonalAccount`, `Map`, `MapComment`, `Forum`, `ForumComment`.
- Backend endpoints cover auth, users, accounts, and owned-map persistence; forum endpoints are not implemented yet.
- Auth uses access/refresh JWT cookies, refresh rotation, session storage, logout, logout-all, and sessions listing.
- `libs/api/maps` now implements authenticated map persistence:
  - `GET /api/maps` lists the current account's maps.
  - `GET /api/maps/:id` loads one owned map.
  - `POST /api/maps` creates a map.
  - `PUT /api/maps/:id` updates an owned map.
  - Workshop snapshots are stored in the existing `Map.body` string column.
- API JSON request bodies accept up to 10 MB to accommodate workshop snapshots.

## Angular Routing

- Routes are in `apps/web/src/app/app.routes.ts`.
- Authenticated area uses `BaseLayoutComponent` and `canActivateAuth`.
- Lazy routes: `home`, `profile/:id`, `forum`, `mods`.
- `workshop` loads `WorkshopPageComponent` directly.
- `login` and `register` use `AuthLayoutComponent` and `canActivateNonAuth`.

## UI Notes

- Shared input component: `libs/web/common-ui/src/lib/components/form-input`.
- `wm-form-input` is a ControlValueAccessor and supports `type`, `placeholder`, and optional `[showPasswordToggle]="true"`.
- Password visibility toggle is implemented inside `wm-form-input` using `eye` / `eye-off` SVG assets from `public/assets/svg`.
- Auth login/register password fields enable the toggle via `[showPasswordToggle]="true"`.

## Workshop Notes

- `libs/web/workshop` is a Canvas-based editor.
- The current editor shell is based on `.codex/examples/workshop.png` and targets a 1280x969 viewport:
  - 58px header with logo and drawing controls.
  - 56px left tool rail.
  - Central canvas workspace with a 35px bottom status/zoom bar.
  - Approximately 400px right sidebar split into Objects and Layers panes.
- Both the left tool rail and right sidebar are collapsible. Their components expose a `collapsed` host class; `workshop-page.component.scss` adjusts the grid with `:has(...)`.
- After a sidebar transition, its component measures the new width and calls `WorkshopCanvasSizeService.resizeCanvas()`. Preserve this recalculation when changing sidebar dimensions.
- Tool enum: `select`, `pencil`, `eraser`, `rectangle`, `text`, `texture`.
- Tool switching is managed by `WorkshopToolsService`. Tools are created from factories in an Angular injection context; the previous tool may release resources through optional `Tool.dispose()`.
- The left sidebar is at `feature-workshop-page/workshop-page/workshop-left-sidebar`.
  - Left click selects a tool.
  - Right click opens an anchored tool-settings panel beside the clicked icon.
  - The panel follows the editor mockup and edits line width, opacity, stroke color, and fill color.
  - Texture additionally exposes functional texture scale and rotation controls plus a preview.
  - It closes on an outside click, tool selection, close button, or `Escape`, and is kept inside the viewport.
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
  - The bottom “Show grid” checkbox is functional through `WorkshopCanvasManagerService.showGrid`.
  - Ctrl+wheel zooms around the pointer. The bottom slider zooms around canvas center.
  - `WorkshopPanningService.zoomPercent` is the shared reactive zoom value; wheel and slider keep each other synchronized.
  - Slider range is currently 10%-400%, while the coordinate service supports 10%-1000%.
- It has shapes, scene graph nodes (`GraphNode`, `LayerNode`, `GroupNode`, `ShapeNode`), layers, quadtree, panning, coords, draw/settings/services, and sidebars.
- Scene graph auto-save currently stores through `WorkshopSceneGraphStorageService`; inspect storage before changing persistence.
- `WorkshopSceneGraphStorageService` now supports versioned `exportSnapshot()` and `importSnapshot()` in addition to localStorage auto-save.
- The workshop header has a prototype generation/persistence toolbar:
  - Seed input and `Сгенерировать` invoke `WorkshopWorldGeneratorService`.
  - `Сохранить` and `Загрузить` use `WorkshopMapPersistenceService` and `/api/maps`.
  - The current backend map id is remembered in localStorage under `workshop-map-id`.
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
- The header uses the editor mockup styling. Undo/redo buttons are currently visual only; clear canvas and drawing controls remain connected.
- The bottom full-screen button is currently visual only.

## Commands

- Install dependencies: `yarn install`.
- Start web: `yarn start:web`.
- Start API: `yarn start:api`.
- Start API dependencies: `yarn start:api-deps:docker`.
- Prisma push: `yarn db:main:push`.
- Prisma seed: `yarn db:main:seed`.
- Lint all: `yarn lint`.
- Test all: `yarn test`.
- Generate docs: `yarn docs:gen`.

## Caveats

- PowerShell displayed `README.md` and some Russian strings as mojibake during inspection; be careful with file encoding.
- The working tree is not clean. Existing user changes include `.husky/post-merge`, the tool factory/disposal work in `WorkshopToolsService`, and optional `Tool.dispose()`. Preserve them.
- Workshop changes are currently uncommitted and span layout, sidebars, context settings, zoom/panning, selection transforms, shapes, and settings services. Preserve them as one ongoing body of user work.
- `workshop:lint` succeeds with 11 pre-existing warnings (unused values in quadtree/eraser/text code and one explicit `any` in the scene graph).
- `yarn nx build web --configuration=development` succeeds after the latest sidebar/zoom/context-panel changes.
- `yarn nx build web --configuration=development` and `yarn build:api` succeed after the procedural-generation and map-persistence prototype.
- The authenticated map API was smoke-tested end-to-end: login, create, read, and update succeeded; the temporary test map was removed.
- `git diff --check` succeeds; Git only reports expected LF-to-CRLF conversion warnings on Windows.
- Prefer existing Nx project patterns and standalone Angular conventions.

## Backend Repair Notes (2026-07-27)

- The local PostgreSQL database originally contained legacy PascalCase tables while Prisma expected snake_case tables. This caused login to fail with a Prisma error and HTTP 500.
- The migration chain is now registered and applied locally. The refactor migration preserves legacy data by renaming/converting tables and foreign keys instead of dropping them.
- The database schema reports up to date with six migrations.
- The invalid historical seed bcrypt placeholder was replaced. Demo credentials are `admin@example.com` / `admin123`.
- Login validation intentionally does not enforce registration password-strength rules; invalid credentials return 401.
- `GlobalExceptionFilter` now sends the status calculated for Prisma errors, maps common database failures, and does not expose unexpected internal error messages.
- API bootstrap failures are caught and logged.
- `apps/api/project.json` regenerates the Prisma client before API builds.
- A backend process may already occupy port 3000 during development; use another `MAIN_API_PORT` for isolated smoke tests rather than stopping an unknown user process.
