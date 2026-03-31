// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { generateKeyPair, encryptFileData, decryptFileData } from '../src/lib/openpgp-helpers';

describe('decryptFileData', () => {
  it('signed=false for an unsigned file even when a verification key is provided', async () => {
    const alice = await generateKeyPair('Alice', 'alice@example.com', 'pass1');
    const bob = await generateKeyPair('Bob', 'bob@example.com', 'pass2');

    // Encrypt to Bob, no signing (sender key is null)
    const data = new TextEncoder().encode('hello');
    const encrypted = await encryptFileData(data, 'hello.txt', bob.publicKey, null);

    // Decrypt as Bob, passing Alice's public key as sender verification key
    const result = await decryptFileData(encrypted, bob.privateKey, alice.publicKey);

    expect(result.signatureText).toBe('');
  }, 30000);

  it('signatureText is set for a properly signed file', async () => {
    const alice = await generateKeyPair('Alice', 'alice@example.com', 'pass1');
    const bob = await generateKeyPair('Bob', 'bob@example.com', 'pass2');

    const data = new TextEncoder().encode('hello');
    const encrypted = await encryptFileData(data, 'hello.txt', bob.publicKey, alice.privateKey);

    const result = await decryptFileData(encrypted, bob.privateKey, alice.publicKey);

    expect(result.signatureText).toContain('Signature verified');
  }, 30000);
});
