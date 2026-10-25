// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import { readKey } from 'openpgp';
import { describe, expect, it } from 'vitest';

const seed = readFileSync(fileURLToPath(new URL('../../backend/seeds/local.sql', import.meta.url)), 'utf8');

describe('local-only demo public key', () => {
  it('ships a usable public encryption key with a matching fingerprint, never a private key', async () => {
    const armoredKey = seed.match(/-----BEGIN PGP PUBLIC KEY BLOCK-----[\s\S]+?-----END PGP PUBLIC KEY BLOCK-----/)![0];
    const key = await readKey({ armoredKey });
    expect(key.isPrivate()).toBe(false);
    expect(key.getFingerprint()).toBe(seed.match(/'([a-f0-9]{40})'/)![1]);
    expect(key.getUserIDs()).toEqual(['CryptDrop Local Demo <local-demo@cryptdrop.invalid>']);
    expect(await key.getEncryptionKey()).toBeTruthy();
    expect(seed).not.toContain('PRIVATE KEY BLOCK');
  });
});
