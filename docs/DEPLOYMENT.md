# Separate Pages and Worker deployments

[Project README](../README.md) · [Pages custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/) · [Pages service bindings](https://developers.cloudflare.com/pages/functions/bindings/#service-bindings)

## Layout and request flow

The two workspaces share dependency lockfiles under `code/`, but deploy independently:

```text
Browser → Cloudflare Pages (code/frontend/)
          ├── static HTML, JS, CSS, images
          └── /api and /api/* → Pages Function → CRYPTDROP_API service binding
                                               → cryptdrop-server Worker (code/backend/)
                                                 → D1 / Resend / public keyserver
```

| Deployment | Config | Contents |
| --- | --- | --- |
| Frontend Pages project `cryptdrop-site` | `code/frontend/wrangler.toml` | Astro `dist/`, Pages API proxy, service binding |
| Backend Worker `cryptdrop-server` | `code/backend/wrangler.toml` | Hono API, existing D1 binding and runtime variables |

There is no shared `code/wrangler.toml` and no combined deploy command. The Worker has **no static-asset binding** and does not build or serve the frontend. The frontend cannot access D1 or the Resend secret.

`code/frontend/functions/api/[[catchall]].ts` forwards requests unchanged to the Worker. `public/_routes.json` limits Function invocations to `/api` and `/api/*`; other requests use Pages static hosting. The browser uses same-origin `/api/*` URLs, so no public API hostname, `PUBLIC_API_URL`, or CSP exception is needed. Unknown API paths remain JSON 404s. Astro builds an explicit `404.html` to prevent Pages' implicit SPA fallback on unknown static paths.

## Local development

From the repository root:

```bash
cd code
npm ci
cp -n backend/.dev.vars.example backend/.dev.vars
npm run db:migrate:local
npm run dev:backend
```

The API Worker runs at `http://localhost:8787`. In another terminal, from `code/`:

```bash
npm run dev
```

Visit `http://localhost:4321`. Astro HMR proxies `/api` to the local Worker. To exercise the real Pages Function/service binding instead of Astro's dev proxy, stop Astro, keep the backend running, and run `npm run dev:pages` (also available as `npm run preview`). This builds the frontend and starts Pages on port 4321. `npm run preview -w frontend` is an alternative static-only Astro preview; it does not include API forwarding.

Local secrets belong in ignored `code/backend/.dev.vars`; never copy them into the frontend. Leave the local email key empty to avoid real email delivery. Set local `SITE_URL` to `http://localhost:4321`. Existing secrets previously in `code/.dev.vars` or `code/.env` should be moved to `code/backend/`, without overwriting an existing file or committing them.

The provided backend dev/migration and frontend Pages dev scripts share local persistence at `code/.wrangler/state`, retaining data from the earlier unified configuration. If migrating from `packages/server/.wrangler/state` or root `.wrangler/state`, stop local servers, back up the old state and move it only if the destination does not already exist. Never overwrite a local database; local state is not a production backup.

The repository also supports `pnpm install --frozen-lockfile` from `code/`. Keep both committed lockfiles synchronized when changing dependencies.

## Validation (no deployment)

Run from `code/`:

```bash
npm test
npm run typecheck
npm run deploy:backend:dry-run
npm run check:pages
npm run test:deployment
```

The dry run bundles **only** the backend, without uploading or deploying it. `check:pages` compiles the proxy Function without deploying. The deployment smoke test builds Astro and runs two real local Wrangler processes with an isolated service registry and temporary D1 state. It checks Pages assets/security headers/404s, proxy forwarding, API-only Worker behavior, CORS, and D1 registration/lookup. It overrides the email key with a dummy value, calls no keyserver/email endpoints, and removes temporary state afterwards. These checks do not validate live Cloudflare account, domain, secret or email-delivery configuration.

## Link the repository to Cloudflare later

Create or reconnect **two projects to the same repository**. Each project uses its own subdirectory as its build root. The explicit parent-directory `npm ci` uses the shared lockfile in `code/`; there is intentionally no separate lockfile in either workspace.

### 1. Backend: Workers Builds

| Setting | Value |
| --- | --- |
| Worker | `cryptdrop-server` (reuse the existing Worker) |
| Root directory | `code/backend` |
| Build command | `npm --prefix .. ci && npm run typecheck` |
| Deploy command | `npm run deploy` |
| Production branch | The reviewed branch you intend to ship |

From that root, `npm run deploy` runs `wrangler deploy` using the backend-only config. Do not point this project at the old unified `code/` config. The existing Worker name, D1 database name/id, and compatibility date are retained. No database recreation or data-copy migration is needed.

Before deploying, confirm the account/database ID and set backend `SITE_URL` to the real frontend origin users visit. The checked-in value remains the existing `https://cryptdrop-site.pages.dev`; update it if your existing Pages custom domain is the intended public origin. Ensure `RESEND_API_KEY` exists as a secret on **this Worker**, not on Pages. Existing secrets on the same Worker are retained; local `.dev.vars` values are never uploaded automatically.

To set the secret manually, with approval:

```bash
cd code/backend
npx wrangler secret put RESEND_API_KEY
```

### 2. Frontend: Pages Git integration

| Setting | Value |
| --- | --- |
| Pages project | `cryptdrop-site` (reuse the existing project/domain where possible) |
| Root directory | `code/frontend` |
| Framework preset | Astro (or None with the explicit command below) |
| Build command | `npm --prefix .. ci && npm run build` |
| Build output directory | `dist` |
| Production branch | The reviewed branch you intend to ship |

Pages discovers the frontend `wrangler.toml` and `functions/` directory from this root. Its `CRYPTDROP_API` service binding targets `cryptdrop-server`; the Worker must exist in the **same Cloudflare account**. Deploy/verify the backend first, then Pages. The API-only Worker needs no custom domain: Pages reaches it through the service binding.

For both projects, optionally restrict build watch paths to the relevant workspace plus shared package/lockfiles. Disable preview/non-production branch deployments initially (see below). Do not create Git integrations, push changes or deploy automatically as part of this refactor.

## Manual deployment alternative

With approval, from `code/`:

```bash
npm run deploy:backend
npm run deploy:frontend
```

These are **separate commands and releases**. Backend deployment does not build the frontend; frontend deployment builds Astro and uploads only Pages assets and the forwarding Function. There is no generic `npm run deploy` at the workspace root, to avoid unintentionally publishing both.

D1 migrations remain a separate explicit operation: `npm run db:migrate:remote` from `code/`. This refactor adds no migrations; check outstanding migration status before applying anything remotely. A deployment does not apply migrations automatically.

## Domains, previews and rollback

Keep the existing public Pages origin where possible. For externally hosted DNS, Pages supports a custom **subdomain** via a CNAME after adding it to the Pages project. Its standard apex-domain setup still requires Cloudflare nameservers. The API Worker requires neither an externally managed domain nor a public API URL.

Browser storage is origin-scoped: changing the public origin does not transfer remembered private keys, contacts or history. Warn users to verify an encrypted private-key backup before any origin change. Do not move private keys through the backend.

**Disable Pages preview/branch builds and Worker non-production branch deployments until isolated resources are configured.** The checked-in Pages service binding names the production Worker and may be inherited by previews. A preview must instead target a separate test Worker with a separate D1 database, email credentials/disablement, and matching `SITE_URL`. A different preview URL or Worker name alone does not isolate the database. Missing bindings fail the request; there is no public-API fallback.

Frontend and backend releases/rollbacks are independent again. Keep API contracts compatible with the currently deployed frontend. Neither code rollback reverses D1 data/schema changes or email delivery. Coordinate schema migrations and recovery separately.

After deployment, verify the public Pages `/`, `/app`, `/security`, `/invite`, `/api/health`, static security headers and JSON API 404s; test designated public-key/invitation flows only with approval. Nothing in these instructions requires changing DNS, deleting the old Pages project, or creating a new database.

Historical design evidence under `docs/design-system-evidence/` retains old command outputs. Current paths are `code/frontend/` and `code/backend/`, with shared package/lockfiles and test orchestration in `code/`.
