# Deployment and live-system operations

[README](../README.md) · [Local development and full script reference](DEVELOPMENT.md) · [Pages custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/) · [Pages service bindings](https://developers.cloudflare.com/pages/functions/bindings/#service-bindings)

All application commands run from **`code/`**, unless a snippet explicitly changes directories. Local setup is separate from Cloudflare provisioning. Nothing in install, build, test, `check`, or `setup:local` deploys or modifies a remote database.

## Architecture and targets

```text
Browser → Pages (code/frontend/): static Astro HTML/JS/CSS/images
          └── /api and /api/* → Pages Function → CRYPTDROP_API service binding
                                               → API Worker (code/backend/)
                                                 → D1 / Resend / keyserver
```

| Deployment | Config | Checked-in target |
| --- | --- | --- |
| Pages frontend | `code/frontend/wrangler.toml` | `cryptdrop-site`; proxy binding targets `cryptdrop-server` |
| API Worker | `code/backend/wrangler.toml` | `cryptdrop-server`; D1 `cryptdrop-db` / binding `DB` |

The configs are relative to their own workspaces. There is no shared Wrangler config, static-asset Worker binding or combined deployment. Pages serves explicit static 404s; the API returns JSON 404s. Frontend calls stay same-origin, so the API Worker needs **no custom domain, public API URL or frontend secret**.

**These are existing production resource names and a real D1 database ID, not placeholders for a new account.** For the deployed system, preserve them. For a brand-new account, use the fresh-provisioning section and replace the database ID before remote commands.

## A. Maintain the already-deployed system

### 1. Verify the target and validate locally

```bash
cd code
npm ci
npx wrangler login   # interactive local authentication, if not already authenticated
npx wrangler whoami
npm run check
```

Confirm the Cloudflare account, Worker name, Pages project, D1 name/id, public frontend origin and branch before any live operation. For non-interactive CI, provide a scoped Cloudflare API token/account ID through the build system's secret/environment settings; do not run interactive login or commit credentials. An explicit `CLOUDFLARE_ACCOUNT_ID` can pin the intended account.

`npm run check` covers unit/UI/operational tests, both typechecks, backend dry run, Pages Function compilation and a real isolated local Pages/Worker/D1 smoke test. It does not validate live credentials, domain configuration, email delivery or production schema drift.

### 2. Inspect and back up before a schema change

```bash
npm run db:status:remote
npm run db:backup:remote
```

Neither command applies application migrations. Wrangler may initialize its migration-tracking table when listing status on a new database; status is not a guarantee of zero metadata writes. The backup helper reads live schema/data into a unique directory under **`code/.wrangler/backups/`**, never replacing an earlier export. A failed/empty export is not reported as a usable backup. Exports contain public-key identities, emails, invitation tokens and other personal/operational metadata: keep them private, copy them to protected off-device storage, and do not commit or publish them.

An SQL export is not a complete disaster-recovery policy or a verified restore. Check the export, test restoration into a separate database, and review D1 Time Travel/recovery options. Never blindly import an export into the running production database. There is no automatic restore/reset script.

### 3. Apply only reviewed, pending migrations

If status shows no pending migration, skip this step:

```bash
npm run db:migrate:remote
npm run db:status:remote
```

This **changes live schema/data** according to the SQL files. Do not edit/rename already-applied migrations, clear migration history, recreate `cryptdrop-db`, or run local seed SQL remotely. Add new migration files for new changes. The application requires no production seed or bootstrap admin account; registration populates the public-key registry.

For an upgrade, an additive/backward-compatible migration may run before deploying compatible API code. Destructive or multi-step changes need an expand/contract rollout: keep the currently deployed frontend/API working throughout. Neither independent code rollback reverses D1 data/schema changes or email delivery.

### 4. Publish only what changed

```bash
npm run deploy:backend
npm run deploy:frontend
```

These are **independent releases**, not a required pair on every update. Backend deployment never builds the frontend; frontend deployment builds Astro and uploads only Pages assets/Function. For changes spanning both, keep the API backward-compatible and normally deploy/verify the backend first, then Pages.

**Branch targeting differs:** Worker deployment targets the configured Worker regardless of your Git branch. Pages CLI deployment normally derives its branch from your checkout; a feature branch may create a preview rather than update production. Verify the Pages production branch in Cloudflare; to intentionally target it, use `npm run deploy:frontend -- --branch <your-production-branch>`. Never assume a branch named `main` or run a branch override without confirming the target. Preview deployments can still reach production through the service binding unless isolated (see below).

There is no automatic migration in either deploy command. Existing Worker secrets remain on the same Worker; local `.dev.vars` is not uploaded. Do not put `RESEND_API_KEY` in Pages or `PUBLIC_*` variables.

### 5. Verify and observe

Check the public Pages `/`, `/app`, `/security`, `/invite`, `/api/health`, static security headers and JSON API 404s. `/api/health` is a liveness check only: it does **not** prove D1 schema, email delivery or every workflow is working. Test designated key/invitation workflows only when approved; a real email key can send real messages.

```bash
npm run logs:backend
```

This streams logs from the configured live Worker. Treat captured logs as operational data, not material to publish indiscriminately.

## B. Provision a brand-new Cloudflare deployment

**Do not follow this section for the existing production system.** A fresh local checkout is not a reason to create new cloud resources.

1. Install dependencies with `npm ci` from `code/`, authenticate with `npx wrangler login`, and inspect the intended account with `npx wrangler whoami`. From `code/backend/`, run `npx wrangler d1 list` to inspect existing databases. If the intended database/Worker/Pages project already exists, reuse it and follow section A.
2. Only when a new database is actually required, from `code/backend/` run:

   ```bash
   npx wrangler d1 create cryptdrop-db --update-config=false
   ```

   This creates a **remote resource**, not a local emulator. Replace `database_id` in `code/backend/wrangler.toml` with the returned ID, preserving binding `DB` and migration directory `migrations`. Do not deploy to another account with the checked-in production ID. If choosing a different database name, update the config, backend DB scripts and `scripts/operations.mjs` together.
3. Choose the Worker and Pages names. If they differ from the checked-in names, update both Wrangler configs and the Pages `CRYPTDROP_API` service target together. Set backend `SITE_URL` to the intended public frontend origin (initially the chosen Pages URL or your existing custom domain). This affects invitation/notification links and allowed CORS origin; it is not the API URL.
4. From `code/`, inspect/apply the migrations to the new remote database:

   ```bash
   npm run db:status:remote
   npm run db:migrate:remote
   ```

   Start with an empty registry. **Do not seed demo contacts, private keys or invitations into production.**
5. Deploy the backend once with `npm run deploy:backend` (or connect Workers Builds below). For a fresh Worker, configure the Resend secret on that Worker before exposing email workflows. From `code/backend/`:

   ```bash
   npx wrangler secret put RESEND_API_KEY
   ```

   The Worker can answer liveness checks before email is configured, but that does not mean email workflows are ready. Configure/verify the Resend sender identity separately; the existing sender address in `backend/src/services/email.ts` belongs to the current system and must be changed/verified for another operator.
6. For the intended Git-based workflow, **create/connect Pages through Git integration** using the settings below after the backend exists. Do not auto-create a direct-upload Pages project as part of setup; that is a different project workflow and may require a new project to adopt Git integration later. Both projects and the service binding must be in the same Cloudflare account.
7. Verify the deployed Pages-to-Worker flow, D1 and approved email workflows before directing real users to it. Store account tokens/secrets in the deployment system, never in Git.

Fresh account provisioning is deliberately explicit rather than an automatic `setup`/`deploy` side effect. No DNS change, database creation, remote migration or secret upload happens just by running local setup.

## C. Git integrations (same repository, two projects)

The shared dependency lockfiles live in `code/`, not in the workspace subdirectories. The explicit `npm --prefix .. ci` installs using that shared lockfile. These build commands have been validated from each project's root in a clean checkout. Use Node 24 LTS for consistent local/build behavior (configure the build environment's Node version if necessary).

### API Worker — Workers Builds

| Setting | Value |
| --- | --- |
| Worker | Existing `cryptdrop-server`, or the explicitly chosen fresh target |
| Root directory | `code/backend` |
| Build command | `npm --prefix .. ci && npm run typecheck` |
| Deploy command | `npm run deploy` |
| Production branch | The reviewed branch you intend to ship |

The deploy command uses the backend-only config. Confirm the D1 ID and `SITE_URL`, and configure the Worker secret. Migrations are a separate reviewed operation, never part of this Git build/deploy command.

### Frontend — Pages Git integration

| Setting | Value |
| --- | --- |
| Pages project | Existing `cryptdrop-site`, or the explicitly chosen fresh target |
| Root directory | `code/frontend` |
| Framework preset | Astro (or None with the explicit command) |
| Build command | `npm --prefix .. ci && npm run build` |
| Build output directory | `dist` |
| Production branch | The reviewed branch you intend to ship |

Pages discovers its Wrangler config and `functions/` directory from this root. The same-account `CRYPTDROP_API` binding must point to the deployed API Worker. Retain an existing Pages project/custom domain instead of replacing it solely because the folders changed.

For optional build watch paths, include the relevant workspace and shared package/lockfiles, plus any scripts that deployment uses. Disable preview/non-production branch deployments initially. Do not automatically link repositories, push changes or deploy while reviewing scripts.

## Domains, previews and rollback safety

- **External DNS:** Pages supports an externally hosted custom **subdomain** through a CNAME after associating it with the Pages project. Its standard apex-domain setup still requires Cloudflare nameservers. The API Worker needs no domain at all for service-binding requests.
- **Origin continuity:** browser storage is origin-scoped. Preserve the public origin where possible; changing it does not transfer remembered private keys, contacts or history. Users must verify their own encrypted private-key backup before an origin change. Never transfer private keys through the backend.
- **Previews:** disable Pages preview/branch deployments and Worker non-production deployments until isolated resources are configured. The checked-in Pages binding names the production Worker and can be inherited by previews. Use a separate test Worker, D1 database, email disablement/credentials and matching `SITE_URL`. A different preview URL/Worker name alone does not isolate D1. Missing bindings fail the request; there is no public-API fallback.
- **Independent rollback:** frontend and backend releases are separate. Keep API contracts compatible with the currently deployed frontend; plan database recovery independently. Rollbacks do not unsend emails or restore database data.

Historical design evidence under `docs/design-system-evidence/` retains old command outputs. Current paths are `code/frontend/` and `code/backend/`, with shared operational/test scripts in `code/`.
