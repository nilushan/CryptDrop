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
): Promise<{ privateKey: PrivateKey; publicKey: PublicKey; armoredPublic: string; userInfo: string; isUnprotected: boolean }> {
  let privKey = await openpgp.readPrivateKey({ armoredKey });

  const isUnprotected = privKey.isDecrypted();
  if (!isUnprotected) {
    if (!passphrase) throw new Error('This key requires a passphrase');
    privKey = await openpgp.decryptKey({ privateKey: privKey, passphrase });
  }

  const publicKey = privKey.toPublic();
  const armoredPublic = publicKey.armor();
  const uid = privKey.users[0]?.userID?.userID ?? 'Unknown';

  return { privateKey: privKey, publicKey, armoredPublic, userInfo: uid, isUnprotected };
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

  type DecryptOutput = {
    data: Uint8Array;
    filename?: string;
    signatures?: Array<{ verified: Promise<void> }>;
  };
  const decrypt = openpgp.decrypt as unknown as (o: unknown) => Promise<DecryptOutput>;

  const result = await decrypt(opts);

  // signatures[] is non-empty only when the message actually contains signature packets.
  // When no verification key is provided, openpgp still populates signatures[] for signed
  // messages but leaves them unverified. We use this to distinguish "unsigned" from
  // "signed but unverifiable" before attempting .verified.
  const isSigned = (result.signatures?.length ?? 0) > 0;

  let signatureText = '';
  if (isSigned && verificationKey) {
    try {
      await result.signatures![0].verified;
      signatureText = ' Signature verified!';
    } catch {
      signatureText = ' Warning: signature could not be verified.';
    }
  }

  return {
    data: result.data,
    filename: result.filename || 'decrypted_file',
    signatureText,
  };
}

export async function lookupKeyByEmail(
  email: string,
): Promise<{ key: PublicKey; armored: string; warnings: string[]; source?: string } | null> {
  // Try CryptDrop API first (includes D1 registry + keyserver fallback)
  const apiResult = await lookupViaApi(email);
  if (apiResult) return apiResult;

  // If API is unreachable, fall back to direct keyserver query
  return lookupViaKeyserver(email);
}

async function lookupViaApi(
  email: string,
): Promise<{ key: PublicKey; armored: string; warnings: string[]; source: string } | null> {
  try {
    const { lookupKey } = await import('./api');
    const result = await lookupKey(email);
    if (!result.found || !result.publicKey) return null;

    const key = await openpgp.readKey({ armoredKey: result.publicKey });
    const warnings = validateKey(key, email);
    return { key, armored: result.publicKey, warnings, source: result.source ?? 'registry' };
  } catch {
    return null; // API unreachable — caller will try keyserver directly
  }
}

async function lookupViaKeyserver(
  email: string,
): Promise<{ key: PublicKey; armored: string; warnings: string[]; source: string } | null> {
  const resp = await fetch(
    `https://keys.openpgp.org/vks/v1/by-email/${encodeURIComponent(email)}`,
    { signal: AbortSignal.timeout(10_000) },
  );
  if (resp.status === 404) return null;
  if (!resp.ok) throw new Error(`Keyserver returned ${resp.status}`);
  const armored = await resp.text();
  const key = await openpgp.readKey({ armoredKey: armored });
  const warnings = validateKey(key, email);
  return { key, armored, warnings, source: 'keyserver' };
}

function validateKey(key: PublicKey, email: string): string[] {
  const warnings: string[] = [];

  // Check if key is usable (not expired or revoked)
  try {
    key.getEncryptionKey();
  } catch {
    warnings.push('This key may be expired or revoked');
  }

  // Cross-check email in key UID vs searched email
  const keyUid = key.users[0]?.userID?.userID ?? '';
  const uidEmailMatch = keyUid.match(/<([^>]+)>/);
  const keyEmail = uidEmailMatch ? uidEmailMatch[1] : keyUid;
  if (keyEmail && email.toLowerCase() !== keyEmail.toLowerCase()) {
    warnings.push(`Key belongs to ${keyEmail}, not ${email}`);
  }

  return warnings;
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
