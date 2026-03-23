import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setupDOM, getState } from './setup.ts';

describe('Contacts (localStorage)', () => {
  beforeEach(() => {
    setupDOM();
    window.URL.createObjectURL = vi.fn(() => 'blob:mock');
    window.URL.revokeObjectURL = vi.fn();
  });

  describe('getContacts()', () => {
    it('should return empty array when no contacts saved', () => {
      expect(window.getContacts()).toEqual([]);
    });

    it('should return saved contacts', () => {
      window.saveContact('alice@example.com', 'Alice', 'ARMORED_KEY', 'FP123');
      const contacts = window.getContacts();
      expect(contacts).toHaveLength(1);
      expect(contacts[0].email).toBe('alice@example.com');
      expect(contacts[0].name).toBe('Alice');
      expect(contacts[0].armoredPublicKey).toBe('ARMORED_KEY');
      expect(contacts[0].fingerprint).toBe('FP123');
      expect(contacts[0].lastUpdated).toBeTruthy();
    });
  });

  describe('saveContact()', () => {
    it('should add a new contact', () => {
      window.saveContact('bob@example.com', 'Bob', 'KEY_BOB', 'FP_BOB');
      expect(window.getContacts()).toHaveLength(1);
    });

    it('should update existing contact by email', () => {
      window.saveContact('bob@example.com', 'Bob', 'KEY_OLD', 'FP_OLD');
      window.saveContact('bob@example.com', 'Robert', 'KEY_NEW', 'FP_NEW');
      const contacts = window.getContacts();
      expect(contacts).toHaveLength(1);
      expect(contacts[0].name).toBe('Robert');
      expect(contacts[0].armoredPublicKey).toBe('KEY_NEW');
    });

    it('should store multiple contacts', () => {
      window.saveContact('alice@example.com', 'Alice', 'KEY_A', 'FP_A');
      window.saveContact('bob@example.com', 'Bob', 'KEY_B', 'FP_B');
      expect(window.getContacts()).toHaveLength(2);
    });
  });

  describe('removeContact()', () => {
    it('should remove a contact by email', () => {
      window.saveContact('alice@example.com', 'Alice', 'KEY_A', 'FP_A');
      window.saveContact('bob@example.com', 'Bob', 'KEY_B', 'FP_B');
      window.removeContact('alice@example.com');
      const contacts = window.getContacts();
      expect(contacts).toHaveLength(1);
      expect(contacts[0].email).toBe('bob@example.com');
    });
  });

  describe('clearContacts()', () => {
    it('should remove all contacts', () => {
      window.saveContact('alice@example.com', 'Alice', 'KEY_A', 'FP_A');
      window.clearContacts();
      expect(window.getContacts()).toEqual([]);
    });
  });

  describe('renderContactList()', () => {
    it('should hide list when no contacts', () => {
      window.startFlow('encrypt');
      window.renderContactList();
      expect(document.getElementById('saved-contacts')!.classList.contains('hidden')).toBe(true);
    });

    it('should show list when contacts exist', () => {
      window.saveContact('alice@example.com', 'Alice', 'KEY_A', 'FP_A');
      window.startFlow('encrypt');
      window.renderContactList();
      const el = document.getElementById('saved-contacts')!;
      expect(el.classList.contains('hidden')).toBe(false);
      expect(el.textContent).toContain('Alice');
      expect(el.textContent).toContain('alice@example.com');
    });

    it('should show email as name when no name provided', () => {
      window.saveContact('noname@example.com', '', 'KEY_N', 'FP_N');
      window.startFlow('encrypt');
      window.renderContactList();
      expect(document.getElementById('saved-contacts')!.textContent).toContain('noname@example.com');
    });
  });

  describe('selectContact()', () => {
    it('should load recipient key and set recipientInfo', async () => {
      window.startFlow('encrypt');
      await window.selectContact({ email: 'alice@example.com', name: 'Alice', fingerprint: 'FP_A', armoredPublicKey: '-----BEGIN PGP PUBLIC KEY BLOCK-----\nmock\n-----END PGP PUBLIC KEY BLOCK-----', lastUpdated: '' });
      expect(getState().recipientKey).toBeTruthy();
      expect(getState().recipientInfo!.email).toBe('alice@example.com');
      expect(getState().recipientInfo!.name).toBe('Alice');
      expect(document.getElementById('recipientStatus')!.classList.contains('hidden')).toBe(false);
      expect(document.getElementById('recipient-continue')!.classList.contains('hidden')).toBe(false);
      expect((document.getElementById('recipientEmail') as HTMLInputElement).value).toBe('alice@example.com');
    });
  });

  describe('Recipient display on encrypt screen', () => {
    it('should show recipient info when advancing to encrypt step', async () => {
      window.startFlow('encrypt');
      await window.selectContact({ email: 'alice@example.com', name: 'Alice', fingerprint: 'FP_A', armoredPublicKey: '-----BEGIN PGP PUBLIC KEY BLOCK-----\nmock\n-----END PGP PUBLIC KEY BLOCK-----', lastUpdated: '' });
      window.advanceStep();
      const infoEl = document.getElementById('encrypt-recipient-info')!;
      expect(infoEl.classList.contains('hidden')).toBe(false);
      expect(document.getElementById('encrypt-recipient-name')!.textContent).toBe('Alice');
      expect(document.getElementById('encrypt-recipient-email')!.textContent).toBe('alice@example.com');
    });

    it('should hide recipient info when no recipientInfo', () => {
      window.startFlow('encrypt');
      window.updateRecipientDisplay();
      expect(document.getElementById('encrypt-recipient-info')!.classList.contains('hidden')).toBe(true);
    });
  });

  describe('Encrypted filename includes recipient', () => {
    it('should include recipient name in filename', async () => {
      window.startFlow('encrypt');
      const state = getState();
      state.recipientKey = { mock: true } as unknown as import('openpgp').PublicKey;
      state.recipientInfo = { email: 'alice@example.com', name: 'Alice Smith', fingerprint: '' };
      state.selectedFile = new File(['test'], 'report.pdf');
      let downloadedFilename = '';
      window.downloadBlob = vi.fn((blob, name) => { downloadedFilename = name; });
      await window.encryptFile();
      expect(downloadedFilename).toBe('report.pdf_for_Alice_Smith.pgp');
    });

    it('should use email if no name', async () => {
      window.startFlow('encrypt');
      const state = getState();
      state.recipientKey = { mock: true } as unknown as import('openpgp').PublicKey;
      state.recipientInfo = { email: 'alice@example.com', name: '', fingerprint: '' };
      state.selectedFile = new File(['test'], 'report.pdf');
      let downloadedFilename = '';
      window.downloadBlob = vi.fn((blob, name) => { downloadedFilename = name; });
      await window.encryptFile();
      expect(downloadedFilename).toBe('report.pdf_for_alice_example.com.pgp');
    });

    it('should not add suffix when no recipientInfo', async () => {
      window.startFlow('encrypt');
      const state = getState();
      state.recipientKey = { mock: true } as unknown as import('openpgp').PublicKey;
      state.recipientInfo = null;
      state.selectedFile = new File(['test'], 'report.pdf');
      let downloadedFilename = '';
      window.downloadBlob = vi.fn((blob, name) => { downloadedFilename = name; });
      await window.encryptFile();
      expect(downloadedFilename).toBe('report.pdf.pgp');
    });
  });

  describe('Auto-save on lookup', () => {
    it('should save contact after successful keyserver lookup', async () => {
      window.startFlow('encrypt');
      (document.getElementById('recipientEmail') as HTMLInputElement).value = 'found@example.com';
      globalThis.fetch = vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        text: () => Promise.resolve('-----BEGIN PGP PUBLIC KEY BLOCK-----\nmock\n-----END PGP PUBLIC KEY BLOCK-----'),
      });
      await window.lookupRecipient();
      const contacts = window.getContacts();
      expect(contacts).toHaveLength(1);
      expect(contacts[0].email).toBe('found@example.com');
    });
  });

  describe('startOver clears recipientInfo', () => {
    it('should clear recipientInfo on startOver', async () => {
      window.startFlow('encrypt');
      getState().recipientInfo = { email: 'test@example.com', name: 'Test', fingerprint: '' };
      window.startOver();
      expect(getState().recipientInfo).toBeNull();
    });
  });
});
