/** Shared, bounded security claims for the workspace and security page. */
export const privateKeySecurityHref = '/security#private-key-security';

export const keySecuritySummary = 'Your key is used locally. Remembering it saves a passphrase-encrypted copy, not your passphrase.';

export const keySecuritySafeguards = [
  'Key generation, encryption, decryption, and signing run on your device. CryptDrop does not upload private keys or passphrases.',
  'Remember on this device accepts only fully passphrase-protected private keys and stores them in this site’s IndexedDB.',
  'The app does not persist your passphrase or unlocked private key.',
  'Browser origin isolation normally prevents unrelated websites from accessing this site’s saved keys.',
];

export const keySecurityLimitations = [
  'While loaded, your decrypted private key is held in browser memory. Switching tabs within the app does not unload it.',
  'CryptDrop tabs on the same origin share IndexedDB storage. Browser windows are not separate storage security boundaries.',
  'Malicious extensions with sufficient permissions, compromised application code, or device malware can expose keys and passphrases.',
  'There is no hardware-backed key isolation, automatic idle lock for loaded keys, or guaranteed secure memory erasure.',
  'A stolen encrypted key can be subjected to offline passphrase guessing. Use a strong, unique passphrase.',
  'Browser storage is not a backup. Keep a separate protected backup and a recoverable passphrase.',
];
