/**
 * IndexedDB storage for the user's encrypted private key.
 *
 * The armored private key is already passphrase-encrypted by OpenPGP.js.
 * We validate and re-serialize it, without adding a second encryption layer. On restore, the user
 * enters their PGP passphrase to decrypt it via importPrivateKey().
 */

import { readProtectedPrivateKey } from './key-backup';

const DB_NAME = 'cryptdrop';
const DB_VERSION = 1;
const STORE_NAME = 'saved-keys';
const KEY_ID = 'primary';

export interface SavedKey {
  armoredPrivate: string;
  armoredPublic: string;
  userInfo: string;
  fingerprint: string;
  savedAt: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getSavedKey(): Promise<SavedKey | null> {
  try {
    const db = await openDB();
    return await new Promise<SavedKey | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).get(KEY_ID);
      tx.oncomplete = () => { db.close(); resolve(request.result ?? null); };
      tx.onabort = () => { db.close(); reject(tx.error ?? new Error('Could not read saved key')); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  } catch {
    return null;
  }
}

export async function saveKey(key: SavedKey): Promise<void> {
  // Enforce at the persistence boundary, not only in individual UI callers.
  const snapshot = { ...key };
  const protectedKey = await readProtectedPrivateKey(snapshot.armoredPrivate);
  // Persist only validated packets, not any extraneous content discarded by the parser.
  snapshot.armoredPrivate = protectedKey.armor();
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error('Key storage transaction aborted')); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    tx.objectStore(STORE_NAME).put(snapshot, KEY_ID);
  });
}

export async function deleteSavedKey(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onabort = () => { db.close(); reject(tx.error ?? new Error('Could not remove saved key')); };
      tx.onerror = () => { db.close(); reject(tx.error); };
      tx.objectStore(STORE_NAME).delete(KEY_ID);
    });
  } catch {
    // Silently ignore if DB doesn't exist
  }
}

export async function hasSavedKey(): Promise<boolean> {
  const key = await getSavedKey();
  return key !== null;
}
