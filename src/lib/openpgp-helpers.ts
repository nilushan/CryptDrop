import * as openpgp from 'openpgp';
import type { PrivateKey, PublicKey } from 'openpgp';

export interface GeneratedKeyPair {
  privateKey: PrivateKey;
  publicKey: PublicKey;
  armoredPrivate: string;
  armoredPublic: string;
  userInfo: string;
}

export interface ParsedUserId {
  uid: string;
  name: string;
  email: string;
  fingerprint: string;
}

export async function generateKeyPair(
  name: string,
  email: string,
  passphrase: string,
): Promise<GeneratedKeyPair> {
  // openpgp.generateKey with format:'armored' returns { privateKey: string, publicKey: string }
  // but the overload types are complex, so we cast through unknown
  const result = await (openpgp.generateKey as unknown as (opts: unknown) => Promise<{ privateKey: string; publicKey: string }>)({
    type: 'ecc',
    curve: 'curve25519',
    userIDs: [{ name, email }],
    passphrase,
    format: 'armored',
  });

  const privateKey = await openpgp.decryptKey({
    privateKey: await openpgp.readPrivateKey({ armoredKey: result.privateKey }),
    passphrase,
  });
  const publicKey = await openpgp.readKey({ armoredKey: result.publicKey });

  return {
    privateKey,
    publicKey,
    armoredPrivate: result.privateKey,
    armoredPublic: result.publicKey,
    userInfo: `${name} <${email}>`,
  };
}

export async function importPrivateKey(
  armoredKey: string,
  passphrase: string,
): Promise<{ privateKey: PrivateKey; publicKey: PublicKey; armoredPublic: string; userInfo: string }> {
  let privKey = await openpgp.readPrivateKey({ armoredKey });

  if (!privKey.isDecrypted()) {
    if (!passphrase) throw new Error('This key requires a passphrase');
    privKey = await openpgp.decryptKey({ privateKey: privKey, passphrase });
  }

  const publicKey = privKey.toPublic();
  const armoredPublic = publicKey.armor();
  const uid = privKey.users[0]?.userID?.userID ?? 'Unknown';

  return { privateKey: privKey, publicKey, armoredPublic, userInfo: uid };
}

export async function encryptFileData(
  fileData: Uint8Array,
  filename: string,
  recipientKey: PublicKey,
  signingKey?: PrivateKey,
): Promise<Uint8Array> {
  const message = await openpgp.createMessage({ binary: fileData, filename });
  // openpgp.encrypt overloads are complex; cast through unknown for binary format
  const opts: unknown = {
    message,
    encryptionKeys: recipientKey,
    format: 'binary',
    ...(signingKey ? { signingKeys: signingKey } : {}),
  };
  return (openpgp.encrypt as unknown as (o: unknown) => Promise<Uint8Array>)(opts);
}

export interface DecryptResult {
  data: Uint8Array;
  filename: string;
  signatureText: string;
}

export async function decryptFileData(
  fileData: Uint8Array,
  privateKey: PrivateKey,
  verificationKey?: PublicKey | null,
): Promise<DecryptResult> {
  const message = await openpgp.readMessage({ binaryMessage: fileData });
  const opts: unknown = {
    message,
    decryptionKeys: privateKey,
    format: 'binary',
    ...(verificationKey ? { verificationKeys: verificationKey } : {}),
  };

  const result = await (openpgp.decrypt as unknown as (o: unknown) => Promise<{
    data: Uint8Array;
    filename?: string;
    signatures?: Array<{ verified: Promise<void> }>;
  }>)(opts);

  let signatureText = '';
  if (verificationKey && result.signatures?.length) {
    try {
      await result.signatures[0].verified;
      signatureText = ' Signature verified!';
    } catch {
      signatureText = ' Warning: signature could not be verified.';
    }
  } else if (!verificationKey) {
    signatureText = ' Signature not checked (no sender key provided).';
  }

  return {
    data: result.data,
    filename: result.filename || 'decrypted_file',
    signatureText,
  };
}

export async function lookupKeyByEmail(
  email: string,
): Promise<{ key: PublicKey; armored: string } | null> {
  const resp = await fetch(
    `https://keys.openpgp.org/vks/v1/by-email/${encodeURIComponent(email)}`,
  );
  if (resp.status === 404) return null;
  if (!resp.ok) throw new Error(`Keyserver returned ${resp.status}`);
  const armored = await resp.text();
  const key = await openpgp.readKey({ armoredKey: armored });
  return { key, armored };
}

export function parseUserId(key: PublicKey): ParsedUserId {
  const uid = key.users[0]?.userID?.userID ?? '';
  const fp = key.getFingerprint().toUpperCase().match(/.{1,4}/g)?.join(' ') ?? '';
  const name = uid.indexOf('<') > 0 ? uid.substring(0, uid.indexOf('<')).trim() : '';
  const email = uid.indexOf('<') > 0
    ? uid.substring(uid.indexOf('<') + 1, uid.indexOf('>'))
    : uid;
  return { uid, name, email, fingerprint: fp };
}
