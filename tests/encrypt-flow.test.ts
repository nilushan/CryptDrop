import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setupDOM, getState } from './setup.ts';

describe('Encrypt Flow', () => {
  beforeEach(() => {
    setupDOM();
    window.URL.createObjectURL = vi.fn(() => 'blob:mock');
    window.URL.revokeObjectURL = vi.fn();
  });

  describe('Full encrypt wizard flow (2 steps, no keys required)', () => {
    it('should go directly to recipient lookup, then to file encrypt', () => {
      // Step 0: Path selection visible
      expect(document.getElementById('screen-path-select')!.classList.contains('hidden')).toBe(false);

      // Step 1: Start encrypt flow — goes straight to recipient (no keys step)
      window.startFlow('encrypt');
      expect(getState().currentFlow).toBe('encrypt');
      expect(getState().currentStep).toBe(1);
      expect(document.getElementById('screen-encrypt-recipient')!.classList.contains('hidden')).toBe(false);

      // Step 2: Advance to file encrypt
      window.advanceStep();
      expect(getState().currentStep).toBe(2);
      expect(document.getElementById('screen-encrypt-file')!.classList.contains('hidden')).toBe(false);
    });

    it('should not have a keys step in encrypt flow', () => {
      window.startFlow('encrypt');
      // First screen should be recipient, not keys
      expect(document.getElementById('screen-encrypt-recipient')!.classList.contains('hidden')).toBe(false);
    });
  });

  describe('File selection', () => {
    it('should update state when file is selected', () => {
      window.startFlow('encrypt');
      const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      window.handleFileSelect({ target: { files: [mockFile] } });
      expect(getState().selectedFile).toBe(mockFile);
      expect(document.getElementById('selectedFileInfo')!.classList.contains('hidden')).toBe(false);
      expect(document.getElementById('selectedFileInfo')!.textContent).toContain('test.txt');
    });

    it('should do nothing if no file provided', () => {
      window.startFlow('encrypt');
      window.handleFileSelect({ target: { files: [] } });
      expect(getState().selectedFile).toBeNull();
    });
  });

  describe('Encrypt button state', () => {
    it('should be disabled when no recipient key and no file', () => {
      window.startFlow('encrypt');
      window.updateEncryptButton();
      expect((document.getElementById('btnEncrypt') as HTMLButtonElement).disabled).toBe(true);
    });

    it('should be enabled when both recipient key and file are set (no signing key needed)', () => {
      const state = getState();
      state.recipientKey = { mock: true } as unknown as import('openpgp').PublicKey;
      state.selectedFile = new File(['test'], 'test.txt');
      window.updateEncryptButton();
      expect((document.getElementById('btnEncrypt') as HTMLButtonElement).disabled).toBe(false);
    });

    it('should NOT require private key for encryption', () => {
      const state = getState();
      state.recipientKey = { mock: true } as unknown as import('openpgp').PublicKey;
      state.selectedFile = new File(['test'], 'test.txt');
      // No private key set
      expect(state.privateKey).toBeNull();
      window.updateEncryptButton();
      expect((document.getElementById('btnEncrypt') as HTMLButtonElement).disabled).toBe(false);
    });
  });

  describe('Signing is optional', () => {
    it('should encrypt without signing when checkbox is unchecked', () => {
      (document.getElementById('signFile') as HTMLInputElement).checked = false;
      const state = getState();
      state.privateKey = null;
      state.recipientKey = { mock: true } as unknown as import('openpgp').PublicKey;
      state.selectedFile = new File(['test'], 'test.txt');
      // Encrypt button should be enabled even without private key
      window.updateEncryptButton();
      expect((document.getElementById('btnEncrypt') as HTMLButtonElement).disabled).toBe(false);
    });

    it('should encrypt without signing when checkbox is checked but no key loaded', async () => {
      (document.getElementById('signFile') as HTMLInputElement).checked = true;
      const state = getState();
      state.recipientKey = { mock: true } as unknown as import('openpgp').PublicKey;
      state.selectedFile = new File(['test'], 'test.txt');
      state.privateKey = null;
      // Should still be able to encrypt — signing is best-effort
      window.updateEncryptButton();
      expect((document.getElementById('btnEncrypt') as HTMLButtonElement).disabled).toBe(false);
    });
  });

  describe('Reset encrypt file UI', () => {
    it('should clear file state and hide info', () => {
      const state = getState();
      state.selectedFile = new File(['test'], 'test.txt');
      document.getElementById('selectedFileInfo')!.classList.remove('hidden');
      document.getElementById('selectedFileInfo')!.textContent = 'test.txt';
      document.getElementById('encrypt-success')!.classList.remove('hidden');

      window.resetEncryptFile();
      expect(state.selectedFile).toBeNull();
      expect(document.getElementById('selectedFileInfo')!.classList.contains('hidden')).toBe(true);
      expect(document.getElementById('encrypt-success')!.classList.contains('hidden')).toBe(true);
    });
  });

  describe('Recipient lookup', () => {
    it('should show warning when email is empty', async () => {
      window.startFlow('encrypt');
      (document.getElementById('recipientEmail') as HTMLInputElement).value = '';
      await window.lookupRecipient();
      expect(document.getElementById('toastInner')!.textContent).toContain('recipient email');
    });

    it('should show invite box when recipient not found (404)', async () => {
      window.startFlow('encrypt');
      (document.getElementById('recipientEmail') as HTMLInputElement).value = 'unknown@example.com';
      globalThis.fetch = vi.fn().mockResolvedValue({ status: 404, ok: false });
      await window.lookupRecipient();
      expect(document.getElementById('inviteBox')!.classList.contains('hidden')).toBe(false);
      expect(document.getElementById('recipient-continue')!.classList.contains('hidden')).toBe(true);
      expect(getState().recipientKey).toBeNull();
    });

    it('should show recipient status and continue button when found', async () => {
      window.startFlow('encrypt');
      (document.getElementById('recipientEmail') as HTMLInputElement).value = 'found@example.com';
      globalThis.fetch = vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        text: () => Promise.resolve('-----BEGIN PGP PUBLIC KEY BLOCK-----\nmock\n-----END PGP PUBLIC KEY BLOCK-----'),
      });
      await window.lookupRecipient();
      expect(document.getElementById('recipientStatus')!.classList.contains('hidden')).toBe(false);
      expect(document.getElementById('recipient-continue')!.classList.contains('hidden')).toBe(false);
      expect(document.getElementById('inviteBox')!.classList.contains('hidden')).toBe(true);
      expect(getState().recipientKey).toBeTruthy();
    });
  });

  describe('Reset recipient UI', () => {
    it('should hide status and invite box and clear input', () => {
      document.getElementById('recipientStatus')!.classList.remove('hidden');
      document.getElementById('inviteBox')!.classList.remove('hidden');
      document.getElementById('recipient-continue')!.classList.remove('hidden');
      (document.getElementById('recipientEmail') as HTMLInputElement).value = 'test@example.com';

      window.resetRecipientUI();
      expect(document.getElementById('recipientStatus')!.classList.contains('hidden')).toBe(true);
      expect(document.getElementById('inviteBox')!.classList.contains('hidden')).toBe(true);
      expect(document.getElementById('recipient-continue')!.classList.contains('hidden')).toBe(true);
      expect((document.getElementById('recipientEmail') as HTMLInputElement).value).toBe('');
    });
  });
});
