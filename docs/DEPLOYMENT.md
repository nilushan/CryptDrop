# Worker + static assets deployment

[Project README](../README.md) · [Cloudflare static assets documentation](https://developers.cloudflare.com/workers/static-assets/)

## Layout and request flow

`code/frontend/` is a static Astro/React browser application. `code/backend/` is a Hono API Worker. They are separate npm workspaces but share a single deployment, configured only by `code/wrangler.toml`. Package/lockfiles, Vitest and pnpm workspace configuration also live in `code/`; paths inside these configs are relative to that directory:

```text
Browser → Cloudflare Worker deployment
          ├── /api and /api/* → code/backend/src/index.ts → Hono → D1 / Resend / keyserver
          └── other paths    → code/frontend/dist static assets
```

Cloudflare serves matching static assets without invoking application code. Worker code explicitly delegates non-API misses to `ASSETS`, preserving asset redirects and 404s. Unknown API paths return JSON 404s, never the frontend HTML. This is a pre-rendered multipage site, **not** a single-page application or Astro SSR deployment.

`code/frontend/public/_headers` ships with the assets and retains the static site's CSP and security headers. `_headers` does not apply to Worker-generated API responses. The old Pages forwarding Function, service binding, `_routes.json`, and backend-only Wrangler config are no longer used.

## Local development

Run application commands from `code/`:

```bash
cd code
npm install
cp -n .dev.vars.example .dev.vars
npm run db:migrate:local
npm run dev:worker
```

Visit `http://localhost:8787`: this serves the actual built frontend and local API together. It uses local D1, not the remote production database. Leave `RESEND_API_KEY` empty in local `.dev.vars` to avoid real email delivery. Set local `SITE_URL` to `http://localhost:8787` (or `http://localhost:4321` when using Astro HMR).

For frontend HMR, keep that Worker running and start `npm run dev` in another terminal. Visit `http://localhost:4321`; Astro proxies `/api` to the local Worker on port 8787, so the browser uses same-origin URLs in both development and production. API source changes reload in Wrangler; frontend changes use Astro HMR. Restart `npm run dev:worker` to rebuild the production-like static assets.

Local Worker state now lives in `code/.wrangler/state`. If migrating an existing checkout with local data previously in `packages/server/.wrangler/state` (or root `.wrangler/state`), stop Wrangler, back up that directory, and move it to `code/.wrangler/state` only if the destination does not already exist. Do not overwrite either copy; local databases are not production backups. Move local `.dev.vars`/`.env` from the old backend directory (or repository root) to `code/`, without committing them.

The repository also supports pnpm workspaces (`pnpm install --frozen-lockfile`). Keep both committed lockfiles synchronized when changing dependencies.

## Validation (no deployment)

```bash
npm test
npm run typecheck
npm run deploy:dry-run
npm run test:deployment
```

`test:deployment` builds and starts a real local Worker with temporary D1 state, applies local migrations, and checks static assets/headers, clean URLs, API routing, CORS and registry operations. It overrides the email key with a dummy value and exercises no email or keyserver calls; temporary state is removed afterwards.

The dry run builds `code/frontend/dist` and bundles the API Worker without uploading or deploying it. It does not prove live domain, D1 or email configuration. Full local serving is available through `npm run preview` (alias of `dev:worker`); `npm run preview -w frontend` serves static output only and does not include the API.

## Production deployment

The configuration intentionally retains the existing **`cryptdrop-server`** Worker and the existing **`cryptdrop-db`** database ID. No database recreation or data-copy migration is needed for this folder/deployment refactor. Existing production secrets on that same Worker are retained.

Before the first unified deployment:

1. Confirm the Cloudflare account, existing Worker name, and D1 database ID in `code/wrangler.toml`.
2. Set `SITE_URL` to the public origin users will actually visit. It is currently the existing Pages origin to avoid silently changing email destinations before cutover. Do not leave that value pointing at a retired Pages project.
3. Ensure `RESEND_API_KEY` exists on the target Worker. If needed, set it explicitly from `code/` with `npx wrangler secret put RESEND_API_KEY`. Never put it in frontend configuration or a `PUBLIC_*` variable.
4. Check D1 migration status. This refactor adds no migrations. Apply outstanding production migrations only with approval: `npm run db:migrate:remote`.
5. Run the validation commands above.

Then, with deployment approval:

```bash
npm run deploy
```

This builds the frontend and deploys Worker code plus its assets as one version. D1 migration application is deliberately **not** part of the deploy command.

For Cloudflare Git integration, use **Workers Builds**, set the project/build root directory to **`code`**, and use `npm ci` for installation. Either use `npm run deploy` as the deploy command with no separate build command, or use `npm run build` followed by `npx wrangler deploy`. Do not leave an old Pages-only `astro build` command configured for this new layout.

## Cut over from Pages

Do not delete the existing Pages project or change DNS automatically.

1. Deploy and test the combined app at the Worker's configured hostname. Configure a Workers hostname/custom domain explicitly if the existing API Worker has none.
2. Verify `/`, `/app`, `/how-it-works`, `/security`, and `/invite?token=...`; inspect CSS/JS, headers, clean URLs and real 404s.
3. Verify `/api/health`, API JSON 404s and approved public-key/invitation flows. Tests should use designated test identities; email tests can send real messages if a real key is configured.
4. Configure the intended public custom domain on the Worker. If the domain is attached to Pages, coordinate removing that association and attaching it to the Worker. Confirm TLS/DNS and `SITE_URL` agree.
5. Disable automatic Pages deployments and remove the obsolete Pages service binding after cutover. Keep the previous deployment available until verification is complete; remove it later with approval.

An existing `*.pages.dev` hostname belongs to Pages and cannot simply be assigned to a Worker. Users of the old demo URL need an intentional redirect strategy or the old Pages deployment retained. Existing Pages APIs can still forward to the same Worker during transition because the `/api/*` contract remains unchanged.

**Browser storage is origin-scoped.** Keep the public origin unchanged where possible. Moving from a Pages hostname to a Workers/custom hostname does not transfer remembered private keys, contacts or history. Warn users to verify an encrypted private-key backup before changing origins; never try to migrate private keys through the backend. The old origin's browser storage is not automatically deleted by this refactor.

## Previews and rollback

Do not enable PR/branch deployments that bind untrusted preview code to production D1 or the production email key. Configure a separate Worker/environment and test database/secrets first, with a matching `SITE_URL`. Wrangler environment bindings/variables need explicit environment configuration; changing the Worker name alone does not isolate D1.

Code and static assets deploy together and can be rolled back together through Worker versions/deployments. **D1 data and schema migrations are not rolled back with code**, nor are DNS/domain changes or external email delivery. Keep schema changes backward-compatible and plan any database recovery separately.

Historical design evidence under `docs/design-system-evidence/` records the old layout and commands. Current equivalents: root `src/`, `public/`, `tests/` → `code/frontend/`; `packages/server/` → `code/backend/`; root `dist/` → `code/frontend/dist/`. Package/lockfiles and shared build/deployment configs have moved from the repository root to `code/`.
