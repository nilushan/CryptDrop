# Local development and script reference

[README](../README.md) · [Production deployment and operations](DEPLOYMENT.md)

All commands below run from **`code/`**. Use Node 24 LTS (the validated version). npm is the documented default; use `npm ci` with the committed lockfile. pnpm workspaces are also supported with `pnpm install --frozen-lockfile`. Keep both lockfiles synchronized when changing dependencies.

## First local run

```bash
cd code
npm ci
npm run setup:local
# Optional demo directory and invitation states:
npm run db:seed:local
npm run dev:backend
```

In another terminal, from `code/`:

```bash
npm run dev
```

Open `http://localhost:4321`. The Astro development server forwards same-origin `/api/*` requests to the local API Worker at `http://localhost:8787`. No Cloudflare login, deployed Worker, remote database, or email key is needed for this local setup.

`setup:local` creates `backend/.dev.vars` from its example **only if absent**, then applies pending migrations to **local D1 only**. It never installs dependencies, creates cloud resources, seeds automatically, deletes local state, or overwrites an existing environment file. It is safe to rerun in the sense that only pending migrations are applied; review migration SQL before applying it to local data you need to keep.

The example environment uses the local frontend origin and an empty email key. With an empty key, email workflows cannot deliver mail; invitations can still be saved and their links tested. If you preserve an existing `.dev.vars` containing a real Resend key, UI email actions can send real messages. Local key lookups that miss the registry can still contact the public keyserver.

## Returning to an existing checkout

```bash
cd code
npm ci
npm run db:status:local
npm run db:migrate:local  # apply pending local migrations, if any
npm run dev:backend
# Second terminal, from code/: npm run dev
```

Do not recreate or clear local D1 just because you pulled a code update. `setup:local` is also available as a repeat-safe convenience; it preserves your existing environment file. Reseeding is optional, not a prerequisite for running the app.

Local database state lives in **`code/.wrangler/state`** for backend dev, migrations, seeding and Pages dev. Local secrets live in ignored **`code/backend/.dev.vars`**. If migrating from an older folder layout, stop the local servers, back up state, and move it only when the destination is absent. Do not overwrite either copy. Do not copy production database exports into the frontend.

## Test real Pages forwarding locally

Stop Astro on port 4321, keep `dev:backend` running, and use:

```bash
npm run dev:pages
```

This builds Astro and starts the real Pages Function/service binding at `http://localhost:4321`. Backend code reloads in its Worker; rebuild/restart Pages after frontend changes. `npm run dev` is faster for normal frontend HMR.

There is deliberately **no root `preview` alias**: it previously looked like a standalone full-stack preview but still required a separate backend. `npm run preview -w frontend` remains a static-only Astro preview, without API forwarding.

## Optional local seed

```bash
npm run db:seed:local
```

Run migrations first (`setup:local` or `db:migrate:local`). The seed is `code/backend/seeds/local.sql` and only inserts missing rows:

| Fixture | How to use |
| --- | --- |
| `local-demo@cryptdrop.invalid` | Look up this email in the UI; it has a real public encryption key |
| `/invite?token=local-demo-pending` | Pending invitation, initially valid for seven days |
| `/invite?token=local-demo-accepted` | Already-used invitation |
| `/invite?token=local-demo-expired` | Expired invitation |

All identities use the reserved `.invalid` domain. The seed sends no emails, adds no rate-limit rows, and ships **no private key or usable login credentials**. The seeded public key is for lookup/encryption demos only: you cannot decrypt its output. Generate your own key pair in the UI for an encryption/decryption round trip.

Reruns do not overwrite edited keys/names, reset accepted invitations, or refresh timestamps. Consequently, the pending fixture naturally expires after seven days. Create a new local invitation to test a fresh pending flow; do not reset an existing database just to refresh fixtures.

There is **no remote seed or destructive reset command**. Production needs no seed: users register public keys through the application. The local helper rejects `--remote`, `--env`, and `--config` overrides. Its optional `--persist-to <directory>` is for isolated local test state only. Never apply `seeds/local.sql` manually to a remote database.

## Add a schema change

```bash
npm run db:migration:create -- describe_the_change
# Edit the new file in backend/migrations/.
npm run db:status:local
npm run db:migrate:local
npm run check
```

Do not edit or rename migrations that have already been applied to production. Add a new versioned migration instead. Migration status lists unapplied files; it does not audit schema drift or validate application data. Wrangler may initialize its migration-tracking table on first use, including when listing remote status. Production application is a separate, reviewed step described in the deployment guide.

## Commands

### Everyday local work

| Command | Purpose |
| --- | --- |
| `npm run setup:local` | Create local environment if missing; migrate local D1 |
| `npm run dev:backend` | Local API Worker on port 8787 |
| `npm run dev` | Astro HMR on port 4321; needs local backend for API calls |
| `npm run dev:pages` | Build and serve real Pages proxy on port 4321; needs backend |
| `npm run build` | Build frontend only into `frontend/dist/` |

### Validation — never deploys

| Command | Purpose |
| --- | --- |
| `npm run check` | Run all checks below, including isolated deployment smoke tests |
| `npm test` / `npm run test:watch` | Unit/UI/operational tests, once or in watch mode |
| `npm run typecheck` | Frontend Astro check and backend TypeScript check |
| `npm run deploy:backend:dry-run` | Bundle backend only; no upload |
| `npm run check:pages` | Compile Pages Function; no upload |
| `npm run test:deployment` | Build frontend, start isolated Pages + Worker, test migrations/seeds/API/assets |

The smoke test uses temporary D1 state and a separate service registry, overrides the email key with a dummy value, and performs no email delivery or public-keyserver calls. It tests fresh migrations, repeated migrations/seeds and preservation of edited local fixtures. It never uses your normal local database or a remote database.

### Database and deployed-system operations

| Command | Effect |
| --- | --- |
| `npm run db:migration:create -- name` | Create a local versioned migration file; does not apply it |
| `npm run db:status:local` | List pending migrations in local D1 |
| `npm run db:migrate:local` | Apply pending local migrations |
| `npm run db:seed:local` | Insert optional local demo fixtures |
| `npm run db:status:remote` | Read pending migrations on the configured live database |
| `npm run db:backup:remote` | Read live schema/data into a new ignored SQL export directory |
| `npm run db:migrate:remote` | **Change live schema/data** by applying pending migration SQL |
| `npm run deploy:backend` | **Publish the API Worker** independently |
| `npm run deploy:frontend` | **Build and publish Pages** independently |
| `npm run logs:backend` | Stream live Worker logs; may contain operational metadata |

All `:remote`, deploy and live-log commands require the intended Cloudflare account credentials. Never run them as part of local setup. See the deployment guide for backup handling, existing-system upgrades, fresh-account provisioning, branch targeting and Git integration.

One-off Cloudflare authentication/resource creation uses the standard Wrangler CLI rather than redundant wrappers. There is intentionally no combined deploy, automatic production migration, production seed, database reset, or automatic restore command.
