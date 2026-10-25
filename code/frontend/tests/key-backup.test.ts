// @vitest-environment node
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { armor, enums, PacketList, readPrivateKey, SecretSubkeyPacket } from 'openpgp';
import { generateKeyPair, type GeneratedKeyPair } from '../src/lib/openpgp-helpers';
import { readProtectedPrivateKey, verifyPrivateKeyBackup } from '../src/lib/key-backup';
import { saveKey, type SavedKey } from '../src/lib/key-storage';

const passphrase = 'correct horse battery staple';
let alice: GeneratedKeyPair;
let bob: GeneratedKeyPair;
let mixed: string;

beforeAll(async () => {
  alice = await generateKeyPair('Alice', 'alice@example.com', passphrase);
  bob = await generateKeyPair('Bob', 'bob@example.com', passphrase);
  const partiallyProtected = await readPrivateKey({ armoredKey: alice.armoredPrivate });
  const packet = partiallyProtected.subkeys[0].keyPacket;
  if (!(packet instanceof SecretSubkeyPacket)) throw new Error('Expected a secret subkey');
  await packet.decrypt(passphrase);
  mixed = partiallyProtected.armor();
}, 30000);

afterEach(() => vi.unstubAllGlobals());

function saved(armoredPrivate = alice.armoredPrivate): SavedKey {
  return { armoredPrivate, armoredPublic: alice.armoredPublic, fingerprint: alice.publicKey.getFingerprint(), userInfo: 'Alice', savedAt: new Date().toISOString() };
}

describe('private key protection', () => {
  it('accepts a protected private key', async () => {
    expect((await readProtectedPrivateKey(alice.armoredPrivate)).isDecrypted()).toBe(false);
  });

  it('rejects unprotected, partially protected, malformed, and public keys before opening storage', async () => {
    const open = vi.fn();
    vi.stubGlobal('indexedDB', { open });
    for (const armored of [alice.privateKey.armor(), mixed, 'not a key', alice.armoredPublic]) {
      await expect(saveKey(saved(armored))).rejects.toThrow();
    }
    expect(open).not.toHaveBeenCalled();
  });

  it('rejects concatenated armor and multi-key packets instead of validating only the first key', async () => {
    const open = vi.fn();
    vi.stubGlobal('indexedDB', { open });
    const packets = new PacketList();
    packets.push(...(await readPrivateKey({ armoredKey: alice.armoredPrivate })).toPacketList(), ...bob.privateKey.toPacketList());
    const combined = armor(enums.armor.privateKey, packets.write());
    for (const input of [alice.armoredPrivate + bob.privateKey.armor(), combined, alice.armoredPrivate + 'extra text']) {
      await expect(saveKey(saved(input))).rejects.toThrow();
      await expect(verifyPrivateKeyBackup(input, passphrase, alice.armoredPrivate)).rejects.toThrow();
    }
    expect(open).not.toHaveBeenCalled();
  });

  it('rejects dummy secret subkeys even though OpenPGP decryptKey accepts them', async () => {
    const stub = await readPrivateKey({ armoredKey: alice.armoredPrivate });
    const packet = stub.subkeys[0].keyPacket;
    if (!(packet instanceof SecretSubkeyPacket)) throw new Error('Expected secret subkey');
    packet.makeDummy();
    expect(stub.isDecrypted()).toBe(false);
    await expect(saveKey(saved(stub.armor()))).rejects.toThrow('missing private key material');
    await expect(verifyPrivateKeyBackup(stub.armor(), passphrase, alice.armoredPrivate)).rejects.toThrow('missing private key material');
  });

  it('keeps the encrypted bytes unchanged and waits for transaction commit', async () => {
    const request = {} as IDBOpenDBRequest;
    const tx = {} as IDBTransaction;
    const put = vi.fn();
    const close = vi.fn();
    Object.assign(tx, { objectStore: () => ({ put }) });
    Object.assign(request, { result: { transaction: () => tx, close } });
    const open = vi.fn(() => request);
    vi.stubGlobal('indexedDB', { open });
    const input = saved();
    const original = { ...input };
    let settled = false;
    const saving = saveKey(input).then(() => { settled = true; });
    // Changing the caller's object while validation is pending must not change the stored bytes.
    input.armoredPrivate = alice.privateKey.armor();
    await vi.waitFor(() => expect(open).toHaveBeenCalled());
    request.onsuccess?.(new Event('success'));
    await vi.waitFor(() => expect(put).toHaveBeenCalledWith(original, 'primary'));
    await Promise.resolve();
    expect(settled).toBe(false);
    tx.oncomplete?.(new Event('complete'));
    await saving;
    expect(close).toHaveBeenCalled();
  });

  it('rejects a transaction abort instead of reporting a saved key', async () => {
    const request = {} as IDBOpenDBRequest;
    const tx = {} as IDBTransaction;
    const close = vi.fn();
    Object.assign(tx, { objectStore: () => ({ put: vi.fn() }), error: null });
    Object.assign(request, { result: { transaction: () => tx, close } });
    const open = vi.fn(() => request);
    vi.stubGlobal('indexedDB', { open });
    const saving = saveKey(saved());
    const rejected = expect(saving).rejects.toThrow('aborted');
    await vi.waitFor(() => expect(open).toHaveBeenCalled());
    request.onsuccess?.(new Event('success'));
    await vi.waitFor(() => expect(tx.onabort).toBeTypeOf('function'));
    tx.onabort?.(new Event('abort'));
    await rejected;
    expect(close).toHaveBeenCalled();
  });
});

describe('backup restore check', () => {
  it('unlocks a matching backup without mutating the original armored key', async () => {
    await expect(verifyPrivateKeyBackup(alice.armoredPrivate, passphrase, alice.armoredPrivate)).resolves.toBeUndefined();
    expect((await readPrivateKey({ armoredKey: alice.armoredPrivate })).isDecrypted()).toBe(false);
  });

  it('rejects an incorrect or missing passphrase', async () => {
    await expect(verifyPrivateKeyBackup(alice.armoredPrivate, 'wrong', alice.armoredPrivate)).rejects.toThrow('Could not unlock');
    await expect(verifyPrivateKeyBackup(alice.armoredPrivate, '', alice.armoredPrivate)).rejects.toThrow('Enter the backup passphrase');
  });

  it('rejects a different identity even with the right passphrase', async () => {
    await expect(verifyPrivateKeyBackup(bob.armoredPrivate, passphrase, alice.armoredPrivate)).rejects.toThrow('different key');
  });

  it('rejects a backup missing a subkey', async () => {
    const incomplete = await readPrivateKey({ armoredKey: alice.armoredPrivate });
    incomplete.subkeys.splice(0);
    await expect(verifyPrivateKeyBackup(incomplete.armor(), passphrase, alice.armoredPrivate)).rejects.toThrow('missing subkeys');
  });

  it('rejects plaintext, partially protected, public, and malformed backups', async () => {
    for (const backup of [alice.privateKey.armor(), mixed, alice.armoredPublic, 'broken']) {
      await expect(verifyPrivateKeyBackup(backup, passphrase, alice.armoredPrivate)).rejects.toThrow();
    }
  });
});
