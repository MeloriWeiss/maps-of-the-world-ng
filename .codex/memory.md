# Project memory

Updated: 2026-09-14. Keep this file short; update only on explicit user request.

## Working agreements

- Explicit project decision: do not implement SSR, server-rendered HTML or prerendering for now. SEO requirements do not authorize adding them; revisit only on the user's explicit request. Keep the existing Nginx setup and one site-wide sitemap.
- Communicate in Russian. Follow AGENTS.md; do not duplicate its full rules here.
- Experimental mode is active until explicitly cancelled: no new tests or test/build/typecheck/lint runs without explicit user request. Default to diff review, browser if available, and git diff --check. Agree risk-sensitive checks first. AGENTS.md defines priority over ordinary checks, including lint:workspace.
- Forum uses HTTP only: no WebSocket or periodic polling.
- Never assume local work is deployed. Server configuration changes are a separate task.
- Do not store credentials or secrets here. Preserve unrelated working-tree changes.

## Project map

- Product: GameMaster Helper, tools for tabletop-RPG game masters and world authors.
- Nx monorepo: Angular 19 web, NestJS 11 API, Prisma/PostgreSQL; Yarn 4.
- Apps: apps/web and apps/api. Feature libraries: `libs/web/<library>` and `libs/api/<library>`.
- Platform Nx names: web-<library>, api-<library>; aliases @wm/web/<library>, @wm/api/<library>.
- Shared contracts: libs/shared/shared. Naming validation command: yarn lint:workspace; explicit request required during experimental mode.
- Prisma schema/migrations: libs/api/database-main/src/lib/prisma.
- Web HTTP services/state: libs/web/data-access. Shared UI: libs/web/common-ui.
- Web SEO and themes: libs/web/shared. Palette: apps/web/src/styles/variables.scss.
- Themes: light, dark, steampunk, neon-sunset. Use semantic CSS tokens.
- Workshop state/rendering: libs/web/workshop. Preserve its scene graph, nested layers/groups, selection and serialization contracts; inspect current code before changing these.

## Stable domain constraints

- Authentication: access/refresh JWT cookies, rotating sessions; current role/status verified server-side.
- Roles: USER, ADMIN, SUPER_ADMIN. Only SUPER_ADMIN grants ADMIN; blocking invalidates sessions.
- Login validates presence of password, not registration strength/length, to preserve existing accounts.
- Admin area /admin is noindex. Moderation is reversible via isHidden; audit log records changes.
- Maps and texture packs have public paginated catalogs, owned drafts, publication and likes.
- Public responses include current-account like state; do not load favourites to annotate catalogs.
- Map.body stores workshop snapshots; API body limit accommodates map data.
- Textures belong to packs. Do not restore standalone texture creation.
- Image bytes belong in S3-compatible storage, never PostgreSQL; metadata/objectKey stay in DB.
- ObjectStorage abstraction supports local-development MinIO and production MinIO/R2; no local-file fallback.
- Avatars use the same storage. Provider switches must preserve object keys.
- Operational scripts belong in scripts/; workspace tooling belongs in tools/.

## Forum implemented September 2026

- Details and deployment notes: libs/web/forum/README.md.
- API: libs/api/forum; web: libs/web/forum; HTTP/state: libs/web/data-access/src/lib/forum.
- Six sections covering maps, worldbuilding, game mastering, textures, editor help, feedback.
- Routes: /forum, /forum/sections/:slug, /forum/new, /forum/:id, /forum/:id/edit.
- Existing /forum/:id and ?create=true links remain supported.
- List: search title/body/author, category, active/new/unanswered sorting, own topics, pagination.
- Editor: create/edit own topic, preview, per-user/per-topic local draft, unsaved-exit protection.
- Replies: paginated HTTP loading, parent reference/permalink, own-message editing, retained text on failure.
- ForumListStore, ForumThreadStore, ForumEditorStore own scenario state; components handle forms/navigation.
- Submit-only forms without FormGroup use native (submit), not unbound (ngSubmit).
- Login/register support validated internal returnUrl, returning users to the forum.
- Admins pin/close topics and hide/restore comments; hidden text is withheld but reply chains survive.
- Publication/editing locks the topic row in a transaction; closed/hidden topics reject writes.
- lastActivityAt changes on new replies, not likes or moderation.
- Migration 20260913120000_expand_forum adds fields/categories without deleting data; applied locally.
- Legacy detail API still defaults to a comment tree. New UI requests includeComments=false and paginated /forum-discussions/:id/comments.
- Tombstones count in pagination, preserving links and parent relationships.
- SEO: title/description/canonical/OG/Twitter; DiscussionForumPosting JSON-LD; noindex editor/private/filter/paginated views.
- Forum stays an Angular SPA without SSR. Use the single static public/sitemap.xml for the whole site; forum sections are included, dynamic topic export is not implemented.
- User explicitly rejected separate forum sitemap and Nginx configuration. Added HTML renderer and deployment snippets were removed; existing Nginx needs no changes.
- No deployment or server configuration changes were performed. Production still needs the normal API/web deployment and migration; do not assume the local migration was applied there.

## Forum UI and scrolling updates, September 14

- Standard forum buttons must match the profile: opacity-only hover, no shadow/translation/filter. Use .forum-button; the global .button has unwanted hover effects. Admin is the reference for the non-search select, not buttons.
- Rounded topic/message cards; common-ui PaginationComponent/PaginationService. Page changes clear the comment permalink parameter; visible pagination no longer allocates every page in large result sets.
- Reuse common-ui selects. Forum editor category uses wm-select/wm-option without search; state and validation stay in its existing form/store.
- common-ui AvatarComponent renders the image or an initial fallback. Forum list mapping retains avatarUrl; the current user's avatar comes from CurrentAccountStore when the profile is loaded.
- API avatarPublicUrl in libs/api/accounts converts stored keys to versioned /api/accounts/profiles/:userId/avatar URLs. AvatarsService and forum responses share it. Never use storage keys as image URLs.
- Forum/admin inputs use common-ui field-focus SCSS mixin: no outline, focus indicated by border color.
- List/thread loading follows NavigationEnd and relevant parameter changes, ignoring fragment-only and unrelated query changes. Same-discussion content remains visible during reload.
- Editor draft writes are debounced by 400 ms and flushed on pagehide/destruction; successful publication cancels pending writes.
- App RouterScrollService owns scroll handling. app.config disables built-in restoration/anchor actions but keeps router Scroll events. Forum list/section/thread routes opt into preserveScrollOnQueryChange: same-path query changes retain position. Other forward navigation scrolls to top; history restores position; fragments target anchors.
- common-ui RouteAnchorDirective (wmRouteAnchor) handles asynchronously rendered comment/composer targets afterNextRender, excluding popstate navigation.
- Persistent forum lag was repeatedly reported. Extra requests, per-keystroke storage writes and scroll jumps were addressed in code, but the actual persistent-lag cause and runtime improvement remain unconfirmed without browser observation.

## Account settings and latest UI, September 14

- `/settings` is guarded/noindex, linked from avatar/mobile menus. AccountSettingsComponent: web-profile; AccountSettingsStore/device labels: data-access/auth. Sidebar switches Password/Sessions without resetting the form.
- GET auth/sessions marks the current session; DELETE auth/sessions/:id is owner-scoped and clears cookies for the current session. PUT auth/password requires the current password and transactionally ends other sessions; login is serialized with password changes.
- New JWTs include sid; access checks session existence/expiry. Refresh uses unique jti and SHA-256 before bcrypt (72-byte truncation fix). Legacy tokens require fresh login after deployment. No migration/deployment performed.
- Settings reuses registration's validatePassword and shared authConfig.password, also used by API DTO. Field errors sit 4px below inputs. Keep existing-password login free of new-password strength rules.
- Login/register styles restored from 5992bfd using current theme tokens; no form glows/blur/shadows. Submit buttons override global .button shadows/lift/filter. Admin sidebar has no theme switcher; orphan styles removed.
- Forum visual pass: flatter hero/cards, clearer category/count badges, stronger titles and more readable messages. Reply toggle uses an aria-hidden SVG aligned with inline-flex; preserve 44px touch targets. Behavior/routes unchanged.
- Email verification, password recovery and VK login were discussed only. User declined auth tests; session security changes remain untested at runtime.

## Commands and cautions

- yarn start:web; yarn start:api (applies migrations first).
- yarn build:web; yarn build:api.
- yarn nx lint <project>; yarn nx test <project> --runInBand.
- yarn db:main:generate; yarn db:main:deploy.
- Development infrastructure: yarn start:api-deps:docker.
- NEVER run yarn db:main:seed just to update schema: it truncates/recreates the development dataset.
- Use migrations, not db push, for production.
- An API may already use port 3000; use a different port for isolated checks.
- Deployment/storage/backups: DEPLOYMENT.md and OBJECT_STORAGE.md.
- Production host is shared; never stop unknown services or use global Docker/volume cleanup.
- Do not assume old backup/deployment status is current; inspect when needed.

## Latest verification and remaining limitations

- Before experimental mode, targeted forum API/page and pagination tests passed, including avatar URL/store regressions. These results predate the latest buttons/select, navigation, autosave, input-focus and scroll changes; they do not verify current code.
- Since experimental mode: no tests added or run, no build/typecheck/lint. Latest changes received source/diff review and git diff --check, which passed.
- Browser inventory was empty. Visual/mobile checks, actual scrolling behavior and persistent-lag measurements remain unverified. Do not claim visual QA or measured Core Web Vitals.
- Latest settings/forum color tokens were checked in all four themes; visual/contrast verification remains unavailable.
- Earlier sitemap check found 12 URLs and a single /sitemap.xml reference in robots.txt; these files were not changed in the UI follow-ups.
- Existing opt-in forum PostgreSQL test uses test identities and rolls back fixtures; FORUM_DATABASE_TESTS=1 enables it. Run only on explicit request.
- Earlier web build had initial-bundle and existing home/header style-budget warnings. No current build was run.

## Map catalog likes and refresh-token clarification, September 14

- Map catalog previously disabled every like button during any like request; disabled opacity caused all likes to flicker. It did not refetch likes or the catalog on a like click.
- Catalog now updates the selected map's like/count optimistically, reconciles with the mutation response, and rolls back those fields on error. Pending IDs are tracked per map, so different maps can be liked independently; repeat clicks on a pending map are blocked.
- User rejected a separate store for this small fix. The temporary store was removed; state and handlers remain in MapsCatalogPageComponent. Prefer a proportionate local solution for this scenario.
- Removed hover translation and hover shadow amplification from public catalog map cards. User dislikes cards lifting on hover; the shared common-ui map-card was not changed in this session.
- Refresh-token comparison previously loaded all user sessions and ran bcrypt.compare against every stored hash via Promise.all. bcrypt considers only the first 72 bytes, so different valid JWTs with a common prefix could match the wrong session or undermine rotation/revocation.
- Current refresh flow checks one session by signed sid + userId + expiry and compares bcrypt against SHA-256 hex of the entire token (64 ASCII bytes). Creation/rotation uses the same digest; random jti makes each issued refresh token distinct. Legacy tokens without sid require sign-in after deployment.
- Source/diff review and git diff --check passed. No tests/build/typecheck/lint ran. Browser inventory was empty; runtime behavior remains unverified. Catalog markup/routes/SEO and theme colors were unchanged by the hover fix.
