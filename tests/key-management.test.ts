import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setupDOM, getState } from './setup.ts';

describe('Key Management', () => {
  beforeEach(() => {
    setupDOM();
    window.URL.createObjectURL = vi.fn(() => 'blob:mock');
    window.URL.revokeObjectURL = vi.fn();
  });

  describe('generateKeys() — decrypt flow form toggle', () => {
    it('should show generate form when Create My Keys is clicked in decrypt flow', () => {
      window.startFlow('decrypt');
      window.generateKeys();
      expect(document.getElementById('generate-form-decrypt')!.classList.contains('hidden')).toBe(false);
      expect(document.getElementById('btnGenerateDecrypt')!.classList.contains('hidden')).toBe(true);
    });
  });

  describe('_generateKeys() — key generation for decrypt flow', () => {
    it('should validate name and email are required', async () => {
      window.startFlow('decrypt');
      (document.getElementById('genNameDecrypt') as HTMLInputElement).value = '';
      (document.getElementById('genEmailDecrypt') as HTMLInputElement).value = '';
      (document.getElementById('genPassphraseDecrypt') as HTMLInputElement).value = 'test123';
      await window._generateKeys('genNameDecrypt', 'genEmailDecrypt', 'genPassphraseDecrypt', 'btnDoGenerateDecrypt');
      expect(document.getElementById('toastInner')!.textContent).toContain('name and email');
    });

    it('should validate email format', async () => {
      window.startFlow('decrypt');
      (document.getElementById('genNameDecrypt') as HTMLInputElement).value = 'Test User';
      (document.getElementById('genEmailDecrypt') as HTMLInputElement).value = 'not-an-email';
      (document.getElementById('genPassphraseDecrypt') as HTMLInputElement).value = 'test123';
      await window._generateKeys('genNameDecrypt', 'genEmailDecrypt', 'genPassphraseDecrypt', 'btnDoGenerateDecrypt');
      expect(document.getElementById('toastInner')!.textContent).toContain('valid email');
    });

    it('should validate passphrase is required', async () => {
      window.startFlow('decrypt');
      (document.getElementById('genNameDecrypt') as HTMLInputElement).value = 'Test User';
      (document.getElementById('genEmailDecrypt') as HTMLInputElement).value = 'test@example.com';
      (document.getElementById('genPassphraseDecrypt') as HTMLInputElement).value = '';
      await window._generateKeys('genNameDecrypt', 'genEmailDecrypt', 'genPassphraseDecrypt', 'btnDoGenerateDecrypt');
      expect(document.getElementById('toastInner')!.textContent).toContain('passphrase');
    });

    it('should call openpgp.generateKey with correct params', async () => {
      window.startFlow('decrypt');
      (document.getElementById('genNameDecrypt') as HTMLInputElement).value = 'Test User';
      (document.getElementById('genEmailDecrypt') as HTMLInputElement).value = 'test@example.com';
      (document.getElementById('genPassphraseDecrypt') as HTMLInputElement).value = 'secret123';
      await window._generateKeys('genNameDecrypt', 'genEmailDecrypt', 'genPassphraseDecrypt', 'btnDoGenerateDecrypt');
      expect(window.openpgp.generateKey).toHaveBeenCalledWith({
        type: 'ecc',
        curve: 'curve25519',
        userIDs: [{ name: 'Test User', email: 'test@example.com' }],
        passphrase: 'secret123',
        format: 'armored',
      });
    });

    it('should set state after successful generation', async () => {
      window.startFlow('decrypt');
      (document.getElementById('genNameDecrypt') as HTMLInputElement).value = 'Test User';
      (document.getElementById('genEmailDecrypt') as HTMLInputElement).value = 'test@example.com';
      (document.getElementById('genPassphraseDecrypt') as HTMLInputElement).value = 'secret123';
      await window._generateKeys('genNameDecrypt', 'genEmailDecrypt', 'genPassphraseDecrypt', 'btnDoGenerateDecrypt');
      const state = getState();
      expect(state.armoredPrivate).toBeTruthy();
      expect(state.armoredPublic).toBeTruthy();
      expect(state.privateKey).toBeTruthy();
      expect(state.userInfo).toBe('Test User <test@example.com>');
      // _generateKeys sets state but does not auto-advance; auto-advance
      // is handled by doGenerateKeysDecrypt → _generateKeysAndAdvance
      expect(window.wizardStep).toBe(1);
    });

    it('should show error toast on generation failure', async () => {
      window.openpgp.generateKey = vi.fn().mockRejectedValue(new Error('Generation failed'));
      window.startFlow('decrypt');
      (document.getElementById('genNameDecrypt') as HTMLInputElement).value = 'Test';
      (document.getElementById('genEmailDecrypt') as HTMLInputElement).value = 'test@example.com';
      (document.getElementById('genPassphraseDecrypt') as HTMLInputElement).value = 'secret';
      await window._generateKeys('genNameDecrypt', 'genEmailDecrypt', 'genPassphraseDecrypt', 'btnDoGenerateDecrypt');
      expect(document.getElementById('toastInner')!.textContent).toContain('Generation failed');
      expect(document.getElementById('toastInner')!.className).toContain('bg-red-600');
    });
  });

  describe('Signing key generation (encrypt flow)', () => {
    it('should be a no-op (sign section now links to Keys tab)', () => {
      window.startFlow('encrypt');
      window.generateKeysForSigning();
      // generateKeysForSigning is a no-op in the tab architecture; sign section
      // directs users to the Keys tab instead of showing an inline form.
      // The generate-form-sign stays hidden until the user interacts with it.
      expect(document.getElementById('generate-form-sign')!.classList.contains('hidden')).toBe(true);
    });

    it('should generate keys for signing and update sign section', async () => {
      window.startFlow('encrypt');
      (document.getElementById('genNameSign') as HTMLInputElement).value = 'Signer';
      (document.getElementById('genEmailSign') as HTMLInputElement).value = 'signer@example.com';
      (document.getElementById('genPassphraseSign') as HTMLInputElement).value = 'secret';
      await window._generateKeysForSigning('genNameSign', 'genEmailSign', 'genPassphraseSign', 'btnDoGenerateSign');
      const state = getState();
      expect(state.privateKey).toBeTruthy();
      expect(state.userInfo).toBe('Signer <signer@example.com>');
      // Should NOT auto-advance (signing keys don't change the wizard step)
      expect(window.wizardStep).toBe(1);
    });
  });

  describe('Sign section toggle', () => {
    it('should show sign setup when checkbox is checked', () => {
      window.startFlow('encrypt');
      (document.getElementById('signFile') as HTMLInputElement).checked = true;
      window.toggleSignSection();
      expect(document.getElementById('sign-key-setup')!.classList.contains('hidden')).toBe(false);
    });

    it('should hide sign setup when checkbox is unchecked', () => {
      window.startFlow('encrypt');
      (document.getElementById('signFile') as HTMLInputElement).checked = false;
      window.toggleSignSection();
      expect(document.getElementById('sign-key-setup')!.classList.contains('hidden')).toBe(true);
    });

    it('should show keys-loaded state when keys exist and checkbox is checked', async () => {
      window.startFlow('encrypt');
      // Generate keys first
      (document.getElementById('genNameSign') as HTMLInputElement).value = 'Signer';
      (document.getElementById('genEmailSign') as HTMLInputElement).value = 'signer@example.com';
      (document.getElementById('genPassphraseSign') as HTMLInputElement).value = 'secret';
      await window._generateKeysForSigning('genNameSign', 'genEmailSign', 'genPassphraseSign', 'btnDoGenerateSign');
      // Now toggle sign
      (document.getElementById('signFile') as HTMLInputElement).checked = true;
      window.toggleSignSection();
      expect(document.getElementById('sign-keys-loaded')!.classList.contains('hidden')).toBe(false);
      expect(document.getElementById('sign-keys-form')!.classList.contains('hidden')).toBe(true);
    });

    it('should show key form when no keys and checkbox is checked', () => {
      window.startFlow('encrypt');
      (document.getElementById('signFile') as HTMLInputElement).checked = true;
      window.toggleSignSection();
      expect(document.getElementById('sign-keys-loaded')!.classList.contains('hidden')).toBe(true);
      expect(document.getElementById('sign-keys-form')!.classList.contains('hidden')).toBe(false);
    });
  });

  describe('updateKeyStatus()', () => {
    it('should show "No keys loaded" when no keys', () => {
      window.updateKeyStatus();
      const el = document.getElementById('keyStatus')!;
      expect(el.textContent).toBe('No keys loaded');
      expect(el.className).toContain('key-pill');
    });

    it('should show user info when keys are loaded', async () => {
      window.startFlow('decrypt');
      (document.getElementById('genNameDecrypt') as HTMLInputElement).value = 'Test User';
      (document.getElementById('genEmailDecrypt') as HTMLInputElement).value = 'test@example.com';
      (document.getElementById('genPassphraseDecrypt') as HTMLInputElement).value = 'secret123';
      await window._generateKeys('genNameDecrypt', 'genEmailDecrypt', 'genPassphraseDecrypt', 'btnDoGenerateDecrypt');
      const el = document.getElementById('keyStatus')!;
      expect(el.textContent).toContain('Test User');
      expect(el.className).toContain('key-pill-ok');
    });
  });
});
