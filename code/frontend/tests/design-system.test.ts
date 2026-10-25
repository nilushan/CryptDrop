// @vitest-environment node
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const evidenceDir = resolve(root, 'docs/design-system-evidence/issue-2');
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

interface Capture {
  file: string;
  phase: 'before' | 'after' | 'reference';
  surface: string;
  route: string;
  state: string;
  viewport: { width: number; height: number };
  sha256: string;
}

const manifest = () => JSON.parse(readFileSync(resolve(evidenceDir, 'manifest.json'), 'utf8')) as { captures: Capture[] };

// Documentation is the deliverable for #2: protect discoverability and evidence,
// rather than adding runtime UI assertions for an intentionally unchanged UI.
describe('design-system documentation', () => {
  it('is discoverable from README and has valid local source/evidence links', () => {
    expect(read('README.md')).toContain('](docs/design-system.md)');
    const evidenceReadmes = readdirSync(resolve(root, 'docs/design-system-evidence'))
      .map((issue) => `docs/design-system-evidence/${issue}/README.md`)
      .filter((path) => existsSync(resolve(root, path)));
    for (const path of ['README.md', 'docs/DEPLOYMENT.md', 'docs/design-system.md', ...evidenceReadmes]) {
      const markdown = read(path).replace(/```[\s\S]*?```/g, '');
      const targets = [...markdown.matchAll(/\]\(([^\s)]+)\)/g)].map((match) => match[1]);
      expect(targets.length).toBeGreaterThan(0);
      for (const target of targets) {
        if (/^(https?:|#)/.test(target)) continue;
        const localPath = resolve(root, dirname(path), target.split('#')[0]);
        expect(existsSync(localPath), `${path}: ${target}`).toBe(true);
      }
    }
  });

  it('retains representative before/after app and marketing captures at three viewports', () => {
    const { captures } = manifest();
    for (const phase of ['before', 'after']) {
      for (const surface of ['app', 'marketing']) {
        for (const [width, height] of [[375, 812], [768, 1024], [1280, 720]]) {
          const matching = captures.filter((capture) => capture.phase === phase
            && capture.surface === surface && capture.viewport.width === width && capture.viewport.height === height);
          expect(matching, `${phase} ${surface} ${width}x${height}`).toHaveLength(1);
          expect(matching[0].route).toBe(surface === 'app' ? '/app?tab=encrypt' : '/');
        }
      }
    }
  });

  it('keeps indexed screenshot files intact and correctly sized', () => {
    const { captures } = manifest();
    expect(new Set(captures.map((capture) => capture.file)).size).toBe(captures.length);
    for (const capture of captures) {
      expect(capture.state).not.toBe('');
      const png = readFileSync(resolve(evidenceDir, capture.file));
      expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
      expect(png.readUInt32BE(16)).toBe(capture.viewport.width);
      expect(png.readUInt32BE(20)).toBe(capture.viewport.height);
      expect(createHash('sha256').update(png).digest('hex')).toBe(capture.sha256);
    }
  });
});
