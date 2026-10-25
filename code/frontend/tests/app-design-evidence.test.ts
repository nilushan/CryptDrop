// @vitest-environment node
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
const root = fileURLToPath(new URL('../', import.meta.url));
const dir = resolve(root, '../../docs/design-system-evidence/issue-4');
interface Capture { file: string; phase: string; state: string; route: string; viewport: { width: number; height: number }; image: { width: number; height: number }; sha256: string; }
const manifest = () => JSON.parse(readFileSync(resolve(dir, 'manifest.json'), 'utf8')) as { captures: Capture[] };

describe('app design-system audit and visual evidence', () => {
  it('keeps every component/hook in the exhaustive audit', () => {
    const audit = readFileSync(resolve(dir, 'audit.md'), 'utf8');
    const componentDir = resolve(root, 'src/components');
    const files = readdirSync(componentDir, { recursive: true }).map(String).filter((name) => /\.tsx?$/.test(name));
    expect(files.length).toBe(42);
    for (const file of files) expect(audit, `Missing audit row: ${file}`).toContain(`\`${file}\``);
    expect(audit).toContain('Intentional exceptions');
  });
  it('indexes before/after views of all six app surfaces at three viewport sizes', () => {
    const { captures } = manifest();
    for (const phase of ['before', 'after']) for (const state of ['encrypt', 'decrypt', 'keyring', 'contacts', 'wizard', 'invite']) for (const width of [375, 768, 1280]) {
      expect(captures.filter((c) => c.phase === phase && c.state === state && c.viewport.width === width), `${phase}/${state}/${width}`).toHaveLength(1);
    }
    for (const state of ['backup-verified', 'contacts-populated', 'encrypt-result', 'decrypt-verified', 'import-error', 'invite-valid']) {
      expect(captures.filter((c) => c.state === state)).toHaveLength(3);
    }
  });
  it('retains complete, correctly indexed screenshot evidence', () => {
    const { captures } = manifest(); expect(captures.length).toBe(66);
    expect(new Set(captures.map((c) => c.file)).size).toBe(captures.length);
    for (const c of captures) {
      const png = readFileSync(resolve(dir, c.file));
      expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
      expect(png.readUInt32BE(16)).toBe(c.image.width); expect(png.readUInt32BE(20)).toBe(c.image.height);
      expect(c.image.width).toBe(c.viewport.width); expect(c.route).toMatch(/^\/(app|invite)/);
      expect(createHash('sha256').update(png).digest('hex')).toBe(c.sha256);
    }
  });
});
