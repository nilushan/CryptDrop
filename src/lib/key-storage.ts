/**
 * IndexedDB storage for the user's encrypted private key.
 *
 * The armored private key is already passphrase-encrypted by OpenPGP.js.
 * We store it as-is — no second encryption layer. On restore, the user
 * enters their PGP passphrase to decrypt it via importPrivateKey().
 */

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
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(KEY_ID);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

export async function saveKey(key: SavedKey): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(key, KEY_ID);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteSavedKey(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(KEY_ID);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    // Silently ignore if DB doesn't exist
  }
}

export async function hasSavedKey(): Promise<boolean> {
  const key = await getSavedKey();
  return key !== null;
}
