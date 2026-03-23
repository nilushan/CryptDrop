/**
 * Ambient type declarations for app.js globals.
 * These are available globally — no import needed.
 */

interface RecipientInfo {
  email: string;
  name: string;
  fingerprint: string;
}

interface Contact {
  email: string;
  name: string;
  armoredPublicKey: string;
  fingerprint: string;
  lastUpdated: string;
}

type ToastType = 'info' | 'success' | 'error' | 'warning';
type StatusType = 'success' | 'warning';

interface AppState {
  privateKey: import('openpgp').PrivateKey | null;
  publicKey: import('openpgp').PublicKey | null;
  armoredPublic: string | null;
  armoredPrivate: string | null;
  recipientKey: import('openpgp').PublicKey | null;
  senderKey: import('openpgp').PublicKey | null;
  selectedFile: File | null;
  encryptedFile: File | null;
  userInfo: string | null;
  currentFlow: 'encrypt' | 'decrypt' | null;
  currentStep: number;
  recipientInfo: RecipientInfo | null;
}
