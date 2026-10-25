// Exercise the real Worker + assets router with isolated local D1 state.
// No deployment, remote database access, keyserver calls or email delivery.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const cli = join(root, 'node_modules/wrangler/bin/wrangler.js');
const state = await mkdtemp(join(tmpdir(), 'cryptdrop-worker-smoke-'));
const env = { ...process.env, CI: 'true', WRANGLER_SEND_METRICS: 'false' };
let worker;
let output = '';

try {
  const migrations = spawnSync(process.execPath, [cli, 'd1', 'migrations', 'apply', 'cryptdrop-db', '--local', '--persist-to', state], { cwd: root, env, encoding: 'utf8' });
  assert.equal(migrations.status, 0, migrations.stderr || migrations.stdout);

  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  const base = `http://127.0.0.1:${port}`;
  worker = spawn(process.execPath, [cli, 'dev', '--local', '--ip', '127.0.0.1', '--port', String(port), '--persist-to', state, '--var', `SITE_URL:${base}`, '--var', 'RESEND_API_KEY:local-disabled'], {
    cwd: root,
    env,
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  worker.stdout.on('data', (data) => { output = (output + data).slice(-16000); });
  worker.stderr.on('data', (data) => { output = (output + data).slice(-16000); });
  worker.on('error', (error) => { output += error.message; });

  const request = (path, init) => fetch(`${base}${path}`, { ...init, signal: AbortSignal.timeout(5000) });
  let ready = false;
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline && worker.exitCode === null) {
    try {
      const response = await request('/api/health');
      ready = response.ok && (await response.json()).status === 'ok';
      if (ready) break;
    } catch { /* Wait for the local runtime to start. */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(ready, `Local Worker did not start:\n${output}`);

  for (const path of ['/', '/app', '/app/', '/security', '/how-it-works', '/invite?token=smoke']) {
    const response = await request(path);
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get('content-type'), /text\/html/, path);
    assert.match(response.headers.get('content-security-policy'), /default-src 'self'/, path);
    assert.equal(response.headers.get('x-frame-options'), 'DENY', path);
    assert.match(await response.text(), /CryptDrop/, path);
  }
  const redirect = await request('/app', { redirect: 'manual' });
  assert.ok([301, 307, 308].includes(redirect.status));
  assert.equal(new URL(redirect.headers.get('location'), base).pathname, '/app/');

  const icon = await request('/favicon.svg', { method: 'HEAD' });
  assert.equal(icon.status, 200);
  assert.equal(await icon.text(), '');
  const script = (await readdir(join(root, 'frontend/dist/_astro'))).find((name) => name.endsWith('.js'));
  assert.ok(script, 'Build must include island JavaScript');
  const asset = await request(`/_astro/${script}`);
  assert.equal(asset.status, 200);
  assert.match(asset.headers.get('content-type'), /javascript/);
  assert.equal((await request('/does-not-exist')).status, 404);

  for (const path of ['/api', '/api/', '/api/does-not-exist']) {
    const response = await request(path, { headers: { Accept: 'text/html', 'Sec-Fetch-Mode': 'navigate' } });
    assert.equal(response.status, 404, path);
    assert.deepEqual(await response.json(), { error: 'API route not found' }, path);
  }

  const json = (body) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  // A fresh local database has no pending invitations, so registration sends no email.
  const registration = await request('/api/register', json({
    email: 'smoke@example.invalid', name: 'Local smoke test', publicKey: 'local-test-public-key', fingerprint: 'local-test-fingerprint',
  }));
  assert.equal(registration.status, 200);
  assert.deepEqual(await registration.json(), { ok: true, invitationsAccepted: 0 });
  const lookup = await request('/api/lookup/smoke%40example.invalid');
  assert.equal(lookup.status, 200);
  const key = await lookup.json();
  assert.equal(key.source, 'registry');
  assert.equal(key.publicKey, 'local-test-public-key');

  const invite = await request('/api/invite/missing-token');
  assert.equal(invite.status, 404);
  assert.deepEqual(await invite.json(), { valid: false, error: 'Invitation not found' });
  for (const path of ['/api/register', '/api/invite', '/api/notify']) {
    assert.equal((await request(path, json({}))).status, 400, path);
  }
  const preflight = await request('/api/register', { method: 'OPTIONS', headers: { Origin: base, 'Access-Control-Request-Method': 'POST' } });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), base);

  console.log('PASS: static pages/assets, redirects, security headers, 404s, API routes, CORS and isolated local D1 registration/lookup.');
} finally {
  if (worker?.pid && worker.exitCode === null) {
    const exited = once(worker, 'exit');
    if (process.platform === 'win32') worker.kill('SIGTERM');
    else process.kill(-worker.pid, 'SIGTERM');
    await exited;
  }
  await rm(state, { recursive: true, force: true });
}
