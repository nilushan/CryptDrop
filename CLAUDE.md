# CLAUDE.md

Guidance for coding agents working in this repository.

## Commands (from `code/`)

The repository root contains documentation; `code/` contains all application workspaces, package/lockfiles and build/deployment configuration. Run `cd code` before these commands (or `npm --prefix code run <script>` from the repository root).

```bash
npm install                         # Install both workspaces
npm run dev                         # Astro HMR at localhost:4321; proxies /api to :8787
npm run dev:worker                  # Build frontend, run full app locally at localhost:8787
npm run build                       # Static Astro build → frontend/dist/
npm run preview                     # Same full-stack local workflow as dev:worker
npm test                            # Both Vitest projects, one-shot
npm run test:watch                  # Both Vitest projects in watch mode
npm run test:deployment             # Real local Worker/assets/D1 smoke test (isolated state)
npm run typecheck                   # Astro check (frontend) + tsc (backend)
npm run deploy:dry-run              # Build and bundle Worker/assets; no deployment
npm run deploy                      # Build and deploy one Worker with assets
npm run db:migrate:local             # Apply D1 migrations locally
npm run db:migrate:remote            # Apply D1 migrations remotely (explicit approval)
```

Run one suite: `npx vitest run frontend/tests/utility-functions.test.ts`.
Select a workspace: `npx vitest run --project backend`.
Match test names: `npx vitest run -t "should format bytes"`.

Never deploy, apply remote migrations, or change production domains without approval.

## Architecture and boundaries

CryptDrop has two npm workspaces under `code/`, deployed together as one Cloudflare Worker with static assets. All encryption, decryption, key generation and file handling stays in the browser. The backend receives public-key/identity, lookup, invitation and notification data, never private keys or file contents.

### Frontend (`code/frontend/`)

Static Astro 5 with React 19 islands, Nano Stores, OpenPGP.js 6 and TypeScript. No SSR adapter is needed. Astro config, tsconfig, public assets and frontend tests live inside this workspace.

- `src/pages/app/index.astro`: mounts Encrypt, Decrypt, KeyRing, AddressBook and Wizard islands plus toast/status UI.
- `src/components/`: domain compositions and reusable UI primitives.
- `src/stores/`: key, contacts, history, toast and active-tab state.
- `src/lib/app-navigation.ts`: tab/Keyring navigation and focus/URL state.
- `src/lib/openpgp-helpers.ts`: key generation/import, encryption/decryption and lookup.
- `src/lib/api.ts`: same-origin `/api/*` client; no environment-specific API hostname.
- `src/lib/file-helpers.ts`: file formatting, downloads and folder handling.
- `src/lib/key-storage.ts`, `key-backup.ts`, `key-security.ts`: local key persistence, backup verification and safeguards.
- `src/styles/`: custom CSS, not Tailwind. Layout imports tokens; app imports app catalog and workspace styles; marketing has its own scoped catalog.
- `public/_headers`: static response security headers, included in the Worker asset build.

Frontend code must not import backend implementation or Worker bindings/secrets. Browser code uses HTTP API calls instead.

### Backend (`code/backend/`)

Cloudflare Worker using Hono, Cloudflare D1 (SQLite), and Resend.

| File | Purpose |
|------|---------|
| `src/index.ts` | Worker entry: `/api` and `/api/*` → Hono; other requests → `ASSETS.fetch()` |
| `src/app.ts` | Hono app, CORS, route mounting and JSON API 404s |
| `src/routes/register.ts` | `POST /api/register`: store public key and accept invitations |
| `src/routes/lookup.ts` | `GET /api/lookup/:email`: D1 first, public keyserver fallback |
| `src/routes/invite.ts` | `POST /api/invite`, `GET /api/invite/:token` |
| `src/routes/notify.ts` | `POST /api/notify`: decrypt-instructions email |
| `src/routes/health.ts` | `GET /api/health` |
| `src/services/` | Resend wrapper and random tokens |
| `src/db/schema.ts` | Typed D1 query helpers |
| `src/middleware/` | Origin-based CORS and D1-backed rate limits |
| `migrations/` | Existing users, invitations and rate-limit migrations |

Backend code must not import frontend source. `ASSETS` is a deployment binding, not an application-source dependency.

### Deployment and environment

`code/wrangler.toml` is the **only** deployment config. Paths inside it are relative to `code/`. It keeps the existing `cryptdrop-server` Worker name and `cryptdrop-db` binding/id; uploads `frontend/dist`; runs Worker code first only for API paths. Non-API assets use Cloudflare's asset service. This is a static multipage Astro site: do not enable SPA index fallback.

Bindings: `ASSETS` and `DB`. Runtime environment: `SITE_URL` (public origin for email links/CORS), `RESEND_API_KEY` (Worker secret). Local values live in ignored `code/.dev.vars`; start with `code/.dev.vars.example`. No `PUBLIC_API_URL` is required. Never put secrets in `frontend/` or `PUBLIC_*` variables.

Read `docs/DEPLOYMENT.md` before changing deployment, previews or domains. Retain the old Pages project until cutover is verified. Code rollbacks do not reverse D1 migrations. Preview deployments need separate non-production bindings and secrets.

### Tests

`code/vitest.config.ts` runs frontend (jsdom/RTL) and backend (Node) projects. Tests live in each workspace's `tests/`; frontend RTL setup is `code/frontend/tests/rtl-setup.ts`. Design-evidence tests reference root `docs/`; the marketing suite builds Astro output in a temporary directory. `npm run typecheck` checks both workspaces separately to keep browser and Worker types isolated.

Documentation and retained design evidence stay in root `docs/`. Historical inline paths/command outputs may describe the pre-workspace layout; current source is in `code/frontend/` and `code/backend/`.
