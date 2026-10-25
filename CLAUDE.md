# CLAUDE.md

Guidance for coding agents working in this repository.

## Commands (from `code/`)

The repository root contains documentation; `code/` contains all application workspaces, package/lockfiles and build/deployment configuration. Run `cd code` before these commands (or `npm --prefix code run <script>` from the repository root).

```bash
npm ci                              # Install both workspaces from the lockfile
npm run setup:local                 # Preserve local env; apply local-only pending migrations
npm run db:seed:local               # Optional local demo rows; no private keys or mail
npm run dev                         # Start backend + Astro HMR together; Ctrl+C stops both
npm run dev:frontend                # Astro HMR alone at :4321; proxies /api to :8787
npm run dev:backend                 # API-only local Worker at localhost:8787
npm run dev:pages                   # Build frontend, run Pages proxy at :4321; needs backend
npm run build                       # Static Astro build → frontend/dist/
npm run check                       # Complete validation, never deploys
npm test                            # Both Vitest projects, one-shot
npm run test:watch                  # Both Vitest projects in watch mode
npm run test:deployment             # Real local Pages + Worker + D1 smoke test (isolated)
npm run typecheck                   # Astro check (frontend) + tsc (backend)
npm run deploy:backend:dry-run      # Bundle API Worker only; no deployment
npm run check:pages                 # Compile Pages Function; no deployment
npm run deploy:backend              # Deploy API Worker independently
npm run deploy:frontend             # Build and deploy Pages independently
npm run db:migration:create -- name  # Create a new versioned migration; does not apply it
npm run db:status:local              # List pending local migrations
npm run db:migrate:local             # Apply D1 migrations locally
npm run db:status:remote             # Inspect pending migrations on the configured live DB
npm run db:backup:remote             # Export live SQL to unique ignored .wrangler/backups/
npm run db:migrate:remote            # Apply D1 migrations remotely (explicit approval)
npm run logs:backend                # Stream logs from the configured live Worker
```

Run one suite: `npx vitest run frontend/tests/utility-functions.test.ts`.
Select a workspace: `npx vitest run --project backend`.
Match test names: `npx vitest run -t "should format bytes"`.

Never deploy, create cloud resources, export/read live data, apply remote migrations, stream live logs, or change production domains without approval. `setup:local` and `db:seed:local` must stay strictly local; there is no production seed or destructive reset. Use `docs/DEVELOPMENT.md` for local workflows and `docs/DEPLOYMENT.md` for existing-production versus fresh-account provisioning.

## Architecture and boundaries

CryptDrop has two npm workspaces under `code/`, deployed separately: frontend to Cloudflare Pages and backend to a Cloudflare Worker. All encryption, decryption, key generation and file handling stays in the browser. The backend receives public-key/identity, lookup, invitation and notification data, never private keys or file contents.

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
- `public/_headers`: Pages static response security headers.
- `public/_routes.json`: invokes Pages Functions only for `/api` and `/api/*`.
- `functions/api/[[catchall]].ts`: forwards the original request through the `CRYPTDROP_API` service binding. No public API hostname or frontend secret is needed.
- `src/pages/404.astro`: explicit static 404 page to prevent Pages' implicit SPA fallback.

Frontend code must not import backend implementation or Worker bindings/secrets. Browser code uses HTTP API calls instead.

### Backend (`code/backend/`)

Cloudflare Worker using Hono, Cloudflare D1 (SQLite), and Resend.

| File | Purpose |
|------|---------|
| `src/index.ts` | API-only Worker entry, re-exports the Hono app |
| `src/app.ts` | Hono app, CORS, route mounting and JSON API 404s |
| `src/routes/register.ts` | `POST /api/register`: store public key and accept invitations |
| `src/routes/lookup.ts` | `GET /api/lookup/:email`: D1 first, public keyserver fallback |
| `src/routes/invite.ts` | `POST /api/invite`, `GET /api/invite/:token` |
| `src/routes/notify.ts` | `POST /api/notify`: decrypt-instructions email |
| `src/routes/health.ts` | `GET /api/health` |
| `src/services/` | Resend wrapper and random tokens |
| `src/db/schema.ts` | Typed D1 query helpers |
| `src/middleware/` | Origin-based CORS and D1-backed rate limits |
| `migrations/` | Versioned users, invitations and rate-limit migrations; never edit applied files |
| `seeds/local.sql` | Optional non-overwriting local fixtures with a public-only demo key |

Backend code must not import frontend source. There is no `ASSETS` binding; non-API paths return JSON 404s rather than frontend HTML.

### Deployment and environment

There are **two** deployment configs: `code/frontend/wrangler.toml` (Pages assets and `CRYPTDROP_API` service binding) and `code/backend/wrangler.toml` (API Worker, D1, variables). Paths are relative to each config's workspace. The existing Pages project `cryptdrop-site`, Worker `cryptdrop-server`, database id and compatibility date are retained. There is no shared `code/wrangler.toml` or combined deploy command.

Backend binding: `DB`. Backend runtime environment: `SITE_URL` (public Pages/custom-domain origin for email links/CORS), `RESEND_API_KEY` (Worker secret). Local values live in ignored `code/backend/.dev.vars`; start with `code/backend/.dev.vars.example`. Dev/migration scripts retain shared local persistence in `code/.wrangler/state`. No `PUBLIC_API_URL` is required. Never put backend secrets in the frontend or `PUBLIC_*` variables.

`code/scripts/operations.mjs` handles exclusive-copy local environment setup, strictly local seeding and explicit read-only remote SQL export. Local helpers reject remote/config/env overrides; the test-only local persistence override never changes the remote target. Backups are personal/operational data, not files to commit. Setup never creates cloud resources; deploy never applies migrations. Production needs no bootstrap seed/admin.

Read `docs/DEPLOYMENT.md` for exact Git integration settings, a safe existing-system upgrade sequence and separate fresh-account provisioning. Pages root: `code/frontend`; Worker root: `code/backend`. Each build uses the shared parent lockfile via `npm --prefix .. ci`. Pages can retain an externally managed DNS subdomain; the API Worker needs no custom domain. Code rollbacks do not reverse D1 migrations. Disable preview/branch deployments until separate non-production service bindings, Worker, database and secrets are configured; otherwise previews can reach production through the service binding.

### Tests

`code/vitest.config.ts` runs frontend (jsdom/RTL) and backend (Node) projects. Tests live in each workspace's `tests/`; frontend RTL setup is `code/frontend/tests/rtl-setup.ts`. Design-evidence tests reference root `docs/`; the marketing suite builds Astro output in a temporary directory. Backend `.test.mjs` suites exercise operational helpers with mocked Wrangler calls; remote export is never executed by tests. Seed public-key validity is tested, and the deployment smoke test validates fresh/repeated local migrations, seed idempotency and preservation of edited data in temporary D1. `npm run typecheck` checks both workspaces separately to keep browser and Worker types isolated.

Documentation and retained design evidence stay in root `docs/`. Historical inline paths/command outputs may describe the pre-workspace layout; current source is in `code/frontend/` and `code/backend/`.
