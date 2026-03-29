import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setupDOM, getState } from './setup.ts';

describe('Decrypt Flow', () => {
  beforeEach(() => {
    setupDOM();
    window.URL.createObjectURL = vi.fn(() => 'blob:mock');
    window.URL.revokeObjectURL = vi.fn();
  });

  describe('Full decrypt wizard flow', () => {
    it('should progress through all decrypt steps', () => {
      // Step 1: Start decrypt flow via wizard tab
      window.startFlow('decrypt');
      expect(window.wizardFlow).toBe('decrypt');
      expect(window.wizardStep).toBe(1);
      expect(document.getElementById('wizard-decrypt-keys')!.classList.contains('hidden')).toBe(false);

      // Step 2: Advance to file
      window.advanceStep();
      expect(window.wizardStep).toBe(2);
      expect(document.getElementById('wizard-decrypt-file')!.classList.contains('hidden')).toBe(false);
    });
  });

  describe('Encrypted file selection', () => {
    it('should update state when encrypted file is selected', () => {
      window.startFlow('decrypt');
      const mockFile = new File(['encrypted'], 'secret.pgp', { type: 'application/pgp-encrypted' });
      window.handleEncryptedFileSelect({ target: { files: [mockFile] } });
      expect(getState().encryptedFile).toBe(mockFile);
      expect(document.getElementById('encryptedFileInfo')!.classList.contains('hidden')).toBe(false);
      expect(document.getElementById('encryptedFileInfo')!.textContent).toContain('secret.pgp');
    });

    it('should do nothing if no file provided', () => {
      window.startFlow('decrypt');
      window.handleEncryptedFileSelect({ target: { files: [] } });
      expect(getState().encryptedFile).toBeNull();
    });
  });

  describe('Decrypt button state', () => {
    it('should be disabled when no private key and no file', () => {
      window.updateDecryptButton();
      expect((document.getElementById('btnDecrypt') as HTMLButtonElement).disabled).toBe(true);
    });

    it('should be disabled when only private key is set', () => {
      getState().privateKey = { mock: true } as unknown as import('openpgp').PrivateKey;
      window.updateDecryptButton();
      expect((document.getElementById('btnDecrypt') as HTMLButtonElement).disabled).toBe(true);
    });

    it('should be disabled when only encrypted file is set', () => {
      getState().encryptedFile = new File(['test'], 'test.pgp');
      window.updateDecryptButton();
      expect((document.getElementById('btnDecrypt') as HTMLButtonElement).disabled).toBe(true);
    });

    it('should be enabled when both private key and file are set', () => {
      getState().privateKey = { mock: true } as unknown as import('openpgp').PrivateKey;
      getState().encryptedFile = new File(['test'], 'test.pgp');
      window.updateDecryptButton();
      expect((document.getElementById('btnDecrypt') as HTMLButtonElement).disabled).toBe(false);
    });
  });

  describe('Reset decrypt file UI', () => {
    it('should clear file and sender state', () => {
      const state = getState();
      state.encryptedFile = new File(['test'], 'test.pgp');
      state.senderKey = { mock: true } as unknown as import('openpgp').PublicKey;
      document.getElementById('encryptedFileInfo')!.classList.remove('hidden');
      document.getElementById('decryptResult')!.classList.remove('hidden');
      (document.getElementById('senderEmail') as HTMLInputElement).value = 'sender@example.com';

      window.resetDecryptFile();
      expect(state.encryptedFile).toBeNull();
      expect(state.senderKey).toBeNull();
      expect(document.getElementById('encryptedFileInfo')!.classList.contains('hidden')).toBe(true);
      expect(document.getElementById('decryptResult')!.classList.contains('hidden')).toBe(true);
      expect((document.getElementById('senderEmail') as HTMLInputElement).value).toBe('');
    });
  });

  describe('Sender lookup', () => {
    it('should show warning when sender not found', async () => {
      window.startFlow('decrypt');
      window.advanceStep();
      (document.getElementById('senderEmail') as HTMLInputElement).value = 'unknown@example.com';
      globalThis.fetch = vi.fn().mockResolvedValue({ status: 404, ok: false });
      await window.lookupSender();
      expect(document.getElementById('senderStatus')!.classList.contains('hidden')).toBe(false);
      expect(getState().senderKey).toBeNull();
    });

    it('should show success when sender found', async () => {
      window.startFlow('decrypt');
      window.advanceStep();
      (document.getElementById('senderEmail') as HTMLInputElement).value = 'sender@example.com';
      globalThis.fetch = vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        text: () => Promise.resolve('-----BEGIN PGP PUBLIC KEY BLOCK-----\nmock\n-----END PGP PUBLIC KEY BLOCK-----'),
      });
      await window.lookupSender();
      expect(document.getElementById('senderStatus')!.classList.contains('hidden')).toBe(false);
      expect(getState().senderKey).toBeTruthy();
    });

    it('should do nothing when email is empty', async () => {
      (document.getElementById('senderEmail') as HTMLInputElement).value = '';
      await window.lookupSender();
      expect(document.getElementById('senderStatus')!.classList.contains('hidden')).toBe(true);
    });
  });

  describe('Flow switching', () => {
    it('should properly switch between encrypt and decrypt flows', () => {
      window.startFlow('encrypt');
      expect(window.wizardFlow).toBe('encrypt');
      expect(document.getElementById('wizard-encrypt-recipient')!.classList.contains('hidden')).toBe(false);

      window.startOver();
      window.startFlow('decrypt');
      expect(window.wizardFlow).toBe('decrypt');
      expect(document.getElementById('wizard-decrypt-keys')!.classList.contains('hidden')).toBe(false);
      expect(document.getElementById('wizard-encrypt-recipient')!.classList.contains('hidden')).toBe(true);
    });
  });
});
