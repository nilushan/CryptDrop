import { decryptKey, readPrivateKey, readPrivateKeys, SecretKeyPacket, SecretSubkeyPacket } from 'openpgp';

/** Armor is only an encoding. Reject keys with ANY unencrypted secret packet. */
export async function readProtectedPrivateKey(armoredKey: string) {
  // readPrivateKey silently reads only the first key/block. Do not validate one
  // key while allowing another (possibly plaintext) key to be saved alongside it.
  const text = armoredKey.trim();
  if (!text.startsWith('-----BEGIN PGP PRIVATE KEY BLOCK-----') ||
      !text.endsWith('-----END PGP PRIVATE KEY BLOCK-----') ||
      (text.match(/-----BEGIN PGP /g)?.length ?? 0) !== 1 ||
      (text.match(/-----END PGP /g)?.length ?? 0) !== 1) {
    throw new Error('Choose a single armored private key file, without additional key blocks or text.');
  }
  const keys = await readPrivateKeys({ armoredKeys: text });
  if (keys.length !== 1) throw new Error('Choose a file containing exactly one private key.');
  const key = keys[0];
  if (key.getKeys().some(({ keyPacket }) =>
    !(keyPacket instanceof SecretKeyPacket || keyPacket instanceof SecretSubkeyPacket) || keyPacket.isDummy()
  )) {
    throw new Error('This key is missing private key material. Export a complete private key, not a hardware-token stub.');
  }
  // OpenPGP.js isDecrypted() is true when any primary/subkey packet is decrypted.
  if (key.isDecrypted()) {
    throw new Error('This private key is not fully passphrase-protected. Add a passphrase in a trusted PGP tool and re-import it before saving it on this device.');
  }
  return key;
}

/** Test a separate backup without replacing the active key or persisting any secrets. */
export async function verifyPrivateKeyBackup(
  armoredBackup: string,
  passphrase: string,
  expectedArmoredKey: string,
): Promise<void> {
  const backup = await readProtectedPrivateKey(armoredBackup);
  const expected = await readPrivateKey({ armoredKey: expectedArmoredKey });
  if (backup.getFingerprint() !== expected.getFingerprint()) {
    throw new Error('This backup belongs to a different key. Choose the backup for the currently loaded key.');
  }
  const backupFingerprints = new Set(backup.getKeys().map((key) => key.getFingerprint()));
  if (expected.getKeys().some((key) => !backupFingerprints.has(key.getFingerprint()))) {
    throw new Error('This backup is missing subkeys. Save a fresh copy of the currently loaded key.');
  }
  if (!passphrase) throw new Error('Enter the backup passphrase.');
  try {
    await decryptKey({ privateKey: backup, passphrase });
  } catch {
    throw new Error('Could not unlock this backup. Check its passphrase and that the file is intact.');
  }
}
