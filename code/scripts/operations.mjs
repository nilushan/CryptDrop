// Small, explicit operational helpers. Local setup/seed never accept a remote
// target; production export is a separate, read-only command.
import { constants } from 'node:fs';
import { chmod, copyFile, mkdir, mkdtemp, rm, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const defaultRoot = fileURLToPath(new URL('../', import.meta.url));
const database = 'cryptdrop-db';
const operations = ['setup:local', 'db:seed:local', 'db:backup:remote'];

export function parseArguments(argv) {
  const [operation, ...args] = argv;
  if (!operations.includes(operation)) throw new Error(`Expected one of: ${operations.join(', ')}`);
  if (args.length === 0) return { operation };
  if (operation !== 'db:backup:remote' && args.length === 2 && args[0] === '--persist-to' && args[1] && !args[1].startsWith('-')) {
    return { operation, persistTo: resolve(args[1]) };
  }
  throw new Error('Unexpected arguments. Local operations only allow --persist-to <directory>; remote/config/env overrides are not accepted.');
}

export async function operate(operation, { root = defaultRoot, persistTo, run, log = console.log } = {}) {
  if (!operations.includes(operation)) throw new Error('Unknown operation');
  if (operation === 'db:backup:remote' && persistTo) throw new Error('Remote export does not accept a local persistence directory');
  const backend = join(root, 'backend');
  const state = resolve(persistTo ?? join(root, '.wrangler/state'));
  const execute = run ?? ((args) => {
    const result = spawnSync(process.execPath, [join(root, 'node_modules/wrangler/bin/wrangler.js'), ...args], { cwd: backend, stdio: 'inherit' });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`Wrangler failed (${result.status ?? result.signal}). No success was recorded.`);
  });

  if (operation === 'setup:local') {
    const envFile = join(backend, '.dev.vars');
    let envCreated = false;
    try {
      await copyFile(join(backend, '.dev.vars.example'), envFile, constants.COPYFILE_EXCL);
      envCreated = true;
      await chmod(envFile, 0o600);
      log('Created backend/.dev.vars with local-only defaults.');
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      log('Preserving existing backend/.dev.vars.');
    }
    await execute(['d1', 'migrations', 'apply', database, '--local', '--persist-to', state]);
    log('Local schema is ready. No remote database calls or automatic seeding.');
    return { envCreated, state };
  }

  if (operation === 'db:seed:local') {
    await execute(['d1', 'execute', database, '--local', '--persist-to', state, '--file', join(backend, 'seeds/local.sql')]);
    log('Local demo fixtures added where absent; existing rows were preserved. No email was sent.');
    return { state };
  }

  const backups = join(root, '.wrangler/backups');
  await mkdir(backups, { recursive: true });
  const directory = await mkdtemp(join(backups, `${database}-${new Date().toISOString().replace(/[:.]/g, '-')}-`));
  const backupFile = join(directory, `${database}.sql`);
  try {
    await execute(['d1', 'export', database, '--remote', '--output', backupFile]);
    if ((await stat(backupFile)).size === 0) throw new Error('Export is empty; it is not a usable backup');
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
  log(`Remote SQL export saved to ${backupFile}. Protect this file; it contains registry/contact metadata.`);
  return { backupFile };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const { operation, persistTo } = parseArguments(process.argv.slice(2));
    await operate(operation, { persistTo });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
