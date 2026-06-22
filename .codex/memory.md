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
  - Swagger setup exists in `apps/api/src/swagger/setup-swagger.ts`.
  - `setupPipes(app)` exists but is currently commented in `apps/api/src/main.ts`.

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
- Backend endpoints found so far are mainly auth and users; map/forum backend endpoints appear not yet implemented.
- Auth uses access/refresh JWT cookies, refresh rotation, session storage, logout, logout-all, and sessions listing.

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
- It has tools: `pencil`, `rectangle`, `eraser`, `select`.
- It has shapes, scene graph nodes (`GraphNode`, `LayerNode`, `GroupNode`, `ShapeNode`), layers, quadtree, panning, coords, draw/settings/services, and sidebars.
- Scene graph auto-save currently stores through `WorkshopSceneGraphStorageService`; inspect storage before changing persistence.

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
- The workspace had a clean `git status --short` before creating this memory.
- Prefer existing Nx project patterns and standalone Angular conventions.
