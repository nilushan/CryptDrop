import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { operate, parseArguments } from '../../scripts/operations.mjs';

const directories = [];
afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'cryptdrop-ops-test-'));
  directories.push(root);
  await mkdir(join(root, 'backend'));
  await writeFile(join(root, 'backend/.dev.vars.example'), 'SITE_URL="http://localhost:4321"\nRESEND_API_KEY=""\n');
  return root;
}

describe('operational command safety', () => {
  it.each(['setup:local', 'db:seed:local', 'db:backup:remote'])('accepts the explicit operation %s', (operation) => {
    expect(parseArguments([operation])).toEqual({ operation });
  });
  it.each([
    ['setup:local', '--remote'], ['db:seed:local', '--remote'],
    ['db:seed:local', '--env', 'production'], ['setup:local', '--config', 'other.toml'],
    ['db:seed:local', '--persist-to', '--remote'], ['db:seed:local', '--persist-to', '/tmp/example', '--remote'],
    ['db:backup:remote', '--persist-to', '/tmp/example'], ['db:seed:remote'], [],
  ])('rejects unsafe or unsupported arguments %j', (...args) => {
    // Vitest spreads array rows, so reconstruct the original argv here.
    expect(() => parseArguments(args)).toThrow();
  });
  it('accepts isolated state for local test runs only', () => {
    const state = join(tmpdir(), 'example');
    expect(parseArguments(['db:seed:local', '--persist-to', state])).toEqual({ operation: 'db:seed:local', persistTo: state });
  });
  it('rejects invalid operations before invoking Wrangler', async () => {
    const run = vi.fn();
    await expect(operate('db:seed:remote', { run })).rejects.toThrow();
    expect(run).not.toHaveBeenCalled();
  });
});

describe('repeatable local setup', () => {
  it('creates local defaults, applies only local migrations, and preserves existing environment and database state on reruns', async () => {
    const root = await fixture();
    const run = vi.fn();
    const log = vi.fn();
    const envFile = join(root, 'backend/.dev.vars');
    expect((await operate('setup:local', { root, run, log })).envCreated).toBe(true);
    expect(await readFile(envFile, 'utf8')).toContain('http://localhost:4321');
    await writeFile(envFile, 'EXISTING_LOCAL_VALUE="preserve-me"\n');
    const state = join(root, '.wrangler/state');
    await mkdir(state, { recursive: true });
    await writeFile(join(state, 'keep.txt'), 'existing local state');
    expect((await operate('setup:local', { root, run, log })).envCreated).toBe(false);
    expect(await readFile(envFile, 'utf8')).toBe('EXISTING_LOCAL_VALUE="preserve-me"\n');
    expect(await readFile(join(state, 'keep.txt'), 'utf8')).toBe('existing local state');
    expect(run.mock.calls).toEqual([
      [['d1', 'migrations', 'apply', 'cryptdrop-db', '--local', '--persist-to', state]],
      [['d1', 'migrations', 'apply', 'cryptdrop-db', '--local', '--persist-to', state]],
    ]);
  });
  it('propagates migration failures instead of reporting a successful setup', async () => {
    const root = await fixture();
    const log = vi.fn();
    await expect(operate('setup:local', { root, log, run: () => { throw new Error('migration failed'); } })).rejects.toThrow('migration failed');
    expect(log.mock.calls.flat().some((message) => message.includes('schema is ready'))).toBe(false);
  });
  it('executes the seed file against local D1 with the same persistence path', async () => {
    const root = await fixture();
    const run = vi.fn();
    const state = join(root, 'isolated-state');
    await operate('db:seed:local', { root, persistTo: state, run, log: vi.fn() });
    expect(run).toHaveBeenCalledExactlyOnceWith(['d1', 'execute', 'cryptdrop-db', '--local', '--persist-to', state, '--file', join(root, 'backend/seeds/local.sql')]);
  });
});

describe('explicit production SQL export', () => {
  it('exports read-only to unique ignored directories without replacing earlier backups', async () => {
    const root = await fixture();
    const run = vi.fn(async (args) => writeFile(args[args.indexOf('--output') + 1], '-- schema and data\n'));
    const first = await operate('db:backup:remote', { root, run, log: vi.fn() });
    const second = await operate('db:backup:remote', { root, run, log: vi.fn() });
    expect(first.backupFile).not.toBe(second.backupFile);
    expect(first.backupFile.startsWith(join(root, '.wrangler/backups'))).toBe(true);
    expect(await readFile(first.backupFile, 'utf8')).toBe('-- schema and data\n');
    expect(run.mock.calls[0][0]).toEqual(['d1', 'export', 'cryptdrop-db', '--remote', '--output', first.backupFile]);
  });
  it.each(['failure', 'empty', 'missing'])('does not leave a misleading backup after an export %s', async (mode) => {
    const root = await fixture();
    const run = async (args) => {
      if (mode === 'failure') throw new Error('export failed');
      if (mode === 'empty') await writeFile(args[args.indexOf('--output') + 1], '');
    };
    await expect(operate('db:backup:remote', { root, run, log: vi.fn() })).rejects.toThrow();
    expect(await readdir(join(root, '.wrangler/backups'))).toEqual([]);
  });
});
