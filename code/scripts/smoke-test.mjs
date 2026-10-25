// Exercise separate local Pages and API Worker deployments, including their
// service binding. No remote database access, keyserver calls or email delivery.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const cli = join(root, 'node_modules/wrangler/bin/wrangler.js');
const state = await mkdtemp(join(tmpdir(), 'cryptdrop-pages-worker-smoke-'));
const env = { ...process.env, CI: 'true', WRANGLER_SEND_METRICS: 'false', WRANGLER_REGISTRY_PATH: join(state, 'registry') };
const children = [];
let output = '';

async function freePort() {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

function start(args, cwd) {
  const child = spawn(process.execPath, [cli, ...args], { cwd, env, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
  children.push(child);
  child.stdout.on('data', (data) => { output = (output + data).slice(-24000); });
  child.stderr.on('data', (data) => { output = (output + data).slice(-24000); });
  child.on('error', (error) => { output += error.message; });
  return child;
}

const request = (base, path, init) => fetch(`${base}${path}`, { ...init, signal: AbortSignal.timeout(5000) });
async function waitForHealth(child, base) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline && child.exitCode === null) {
    try {
      const response = await request(base, '/api/health');
      if (response.ok && (await response.json()).status === 'ok') return;
    } catch { /* Wait for the local runtime and service registration. */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Local service did not start at ${base}:\n${output}`);
}

try {
  const migrations = spawnSync(process.execPath, [cli, 'd1', 'migrations', 'apply', 'cryptdrop-db', '--local', '--config', 'backend/wrangler.toml', '--persist-to', join(state, 'd1')], { cwd: root, env, encoding: 'utf8' });
  assert.equal(migrations.status, 0, migrations.stderr || migrations.stdout);
  const seed = () => spawnSync(process.execPath, [join(root, 'scripts/operations.mjs'), 'db:seed:local', '--persist-to', join(state, 'd1')], { cwd: root, env, encoding: 'utf8' });
  const firstSeed = seed();
  assert.equal(firstSeed.status, 0, firstSeed.stderr || firstSeed.stdout);
  const edit = spawnSync(process.execPath, [cli, 'd1', 'execute', 'cryptdrop-db', '--local', '--config', 'backend/wrangler.toml', '--persist-to', join(state, 'd1'), '--command', "UPDATE users SET name = 'Preserved local edit' WHERE email = 'local-demo@cryptdrop.invalid'"], { cwd: root, env, encoding: 'utf8' });
  assert.equal(edit.status, 0, edit.stderr || edit.stdout);
  const secondSeed = seed();
  assert.equal(secondSeed.status, 0, secondSeed.stderr || secondSeed.stdout);
  const repeatMigrations = spawnSync(process.execPath, [cli, 'd1', 'migrations', 'apply', 'cryptdrop-db', '--local', '--config', 'backend/wrangler.toml', '--persist-to', join(state, 'd1')], { cwd: root, env, encoding: 'utf8' });
  assert.equal(repeatMigrations.status, 0, repeatMigrations.stderr || repeatMigrations.stdout);
  const workerBase = `http://127.0.0.1:${await freePort()}`;
  const pagesBase = `http://127.0.0.1:${await freePort()}`;
  const worker = start(['dev', '--local', '--ip', '127.0.0.1', '--port', new URL(workerBase).port, '--inspector-port', '0', '--persist-to', join(state, 'd1'), '--var', `SITE_URL:${pagesBase}`, '--var', 'RESEND_API_KEY:local-disabled'], join(root, 'backend'));
  await waitForHealth(worker, workerBase);
  const pages = start(['pages', 'dev', '--ip', '127.0.0.1', '--port', new URL(pagesBase).port, '--inspector-port', '0', '--persist-to', join(state, 'pages')], join(root, 'frontend'));
  await waitForHealth(pages, pagesBase);

  // Static files must come from Pages, never the API-only Worker.
  for (const path of ['/', '/app', '/app/', '/security', '/how-it-works', '/invite?token=smoke']) {
    const response = await request(pagesBase, path);
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get('content-type'), /text\/html/, path);
    assert.match(response.headers.get('content-security-policy'), /default-src 'self'/, path);
    assert.equal(response.headers.get('x-frame-options'), 'DENY', path);
    assert.match(await response.text(), /CryptDrop/, path);
  }
  const backendRoot = await request(workerBase, '/');
  assert.equal(backendRoot.status, 404);
  assert.deepEqual(await backendRoot.json(), { error: 'API route not found' });
  const icon = await request(pagesBase, '/favicon.svg', { method: 'HEAD' });
  assert.equal(icon.status, 200);
  assert.equal(await icon.text(), '');
  const script = (await readdir(join(root, 'frontend/dist/_astro'))).find((name) => name.endsWith('.js'));
  assert.ok(script, 'Build must include island JavaScript');
  const asset = await request(pagesBase, `/_astro/${script}`);
  assert.equal(asset.status, 200);
  assert.match(asset.headers.get('content-type'), /javascript/);
  assert.equal((await request(pagesBase, '/does-not-exist')).status, 404);

  for (const path of ['/api', '/api/', '/api/does-not-exist']) {
    const response = await request(pagesBase, path, { headers: { Accept: 'text/html', 'Sec-Fetch-Mode': 'navigate' } });
    assert.equal(response.status, 404, path);
    assert.deepEqual(await response.json(), { error: 'API route not found' }, path);
  }
  const demo = await request(pagesBase, '/api/lookup/local-demo%40cryptdrop.invalid');
  assert.equal(demo.status, 200);
  const demoKey = await demo.json();
  assert.equal(demoKey.name, 'Preserved local edit', 'Reseeding and reapplying migrations must preserve existing rows');
  assert.match(demoKey.publicKey, /BEGIN PGP PUBLIC KEY BLOCK/);
  assert.equal((await (await request(pagesBase, '/api/invite/local-demo-pending')).json()).valid, true);
  const accepted = await (await request(pagesBase, '/api/invite/local-demo-accepted')).json();
  assert.equal(accepted.valid, false);
  assert.equal(accepted.status, 'accepted');
  assert.equal((await request(pagesBase, '/api/invite/local-demo-expired')).status, 410);
  const json = (body) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  // A fresh local database has no pending invitations, so registration sends no email.
  const registration = await request(pagesBase, '/api/register', json({
    email: 'smoke@example.invalid', name: 'Local smoke test', publicKey: 'local-test-public-key', fingerprint: 'local-test-fingerprint',
  }));
  assert.equal(registration.status, 200);
  assert.deepEqual(await registration.json(), { ok: true, invitationsAccepted: 0 });
  const lookup = await request(pagesBase, '/api/lookup/smoke%40example.invalid');
  assert.equal(lookup.status, 200);
  const key = await lookup.json();
  assert.equal(key.source, 'registry');
  assert.equal(key.publicKey, 'local-test-public-key');
  const invite = await request(pagesBase, '/api/invite/missing-token');
  assert.equal(invite.status, 404);
  assert.deepEqual(await invite.json(), { valid: false, error: 'Invitation not found' });
  for (const path of ['/api/register', '/api/invite', '/api/notify']) {
    assert.equal((await request(pagesBase, path, json({}))).status, 400, path);
  }
  const preflight = await request(pagesBase, '/api/register', { method: 'OPTIONS', headers: { Origin: pagesBase, 'Access-Control-Request-Method': 'POST' } });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), pagesBase);
  console.log('PASS: separate Pages + API Worker, proxy/assets/headers/404s/CORS, fresh migrations, repeat-safe local seeds and D1 registration/lookup.');
} finally {
  for (const child of children.reverse()) {
    if (child.pid && child.exitCode === null) {
      const exited = once(child, 'exit');
      if (process.platform === 'win32') child.kill('SIGTERM');
      else process.kill(-child.pid, 'SIGTERM');
      await exited;
    }
  }
  await rm(state, { recursive: true, force: true });
}
