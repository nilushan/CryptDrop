import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import FileDropZone from '../src/components/shared/FileDropZone';
import FolderBar from '../src/components/shared/FolderBar';
import EncryptTab from '../src/components/encrypt/EncryptTab';
import DecryptTab from '../src/components/decrypt/DecryptTab';
import KeyStatusPill from '../src/components/shared/KeyStatusPill';
import { $privateKey, $userInfo, clearKeys } from '../src/stores/keys';
import type { PrivateKey } from 'openpgp';
import { $contacts } from '../src/stores/contacts';
import { $activeTab } from '../src/stores/activeTab';

// Keep network and cryptography out of UI tests; real round trips have their own tests.
vi.mock('openpgp', () => ({}));
vi.mock('../src/components/shared/KeyLookupWithInvite', () => ({
  default: ({ onKeyFound }: { onKeyFound: (result: unknown) => void }) => (
    <button onClick={() => onKeyFound({ email: 'test@example.com', name: 'Test recipient', armored: 'test-key', fingerprint: 'ABCD' })}>Mock import recipient</button>
  ),
}));

afterEach(() => { cleanup(); $contacts.set([]); $activeTab.set('encrypt'); clearKeys(); });

describe('key status and capabilities', () => {
  it('uses a single named key-ring control with independent session and selection states', () => {
    render(<KeyStatusPill />);
    const keyring = screen.getByRole('button', { name: /^My key ring/ });
    expect(keyring).toHaveClass('key-status-empty');
    expect(keyring).toHaveTextContent('No private key loaded');
    expect(keyring).toHaveAttribute('id', 'nav-keyring');
    expect(keyring).not.toHaveAttribute('aria-current');
    fireEvent.click(keyring);
    expect($activeTab.get()).toBe('keyring');
    expect(keyring).toHaveAttribute('aria-current', 'page');
    act(() => { $privateKey.set({} as PrivateKey); $userInfo.set('Alice <alice@example.com>'); });
    expect(keyring).toHaveClass('key-status-loaded');
    expect(keyring).toHaveTextContent('Loaded');
    expect(keyring).toHaveAccessibleName(/Alice/);
    act(() => $activeTab.set('decrypt'));
    expect(keyring).not.toHaveAttribute('aria-current');
    expect(keyring).toHaveClass('key-status-loaded');
    act(() => clearKeys());
    expect(keyring).toHaveClass('key-status-empty');
  });

  it('allows unsigned encryption but gates signing, including loss of a previously loaded key', () => {
    render(<EncryptTab />);
    const status = screen.getByRole('status', { name: 'Encryption key status' });
    expect(status).toHaveAttribute('data-capability', 'limited');
    expect(status).toHaveTextContent('Unsigned encryption only');
    expect(status).not.toHaveTextContent('You can encrypt for a recipient');
    expect(status.querySelectorAll('p')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Mock import recipient' }));
    fireEvent.change(screen.getByLabelText('Drop a file here or click to select'), { target: { files: [new File(['test'], 'test.txt')] } });
    const signing = screen.getByRole('checkbox', { name: /Prove it came from me/ });
    expect(signing).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Encrypt File' })).toBeEnabled();
    act(() => $privateKey.set({} as PrivateKey));
    expect(screen.queryByRole('status', { name: 'Encryption key status' })).not.toBeInTheDocument();
    expect(signing).toBeEnabled();
    expect(signing).not.toBeChecked();
    fireEvent.click(signing);
    expect(screen.getByRole('button', { name: 'Encrypt & Sign' })).toBeEnabled();
    act(() => clearKeys());
    expect(screen.getByRole('status', { name: 'Encryption key status' })).toHaveAttribute('data-capability', 'limited');
    expect(screen.getByRole('button', { name: 'Encrypt & Sign' })).toBeDisabled();
    // Never silently downgrade a requested signature; the user must opt out.
    expect(signing).toBeChecked();
    fireEvent.click(signing);
    expect(screen.getByRole('button', { name: 'Encrypt File' })).toBeEnabled();
  });

  it('keeps file selection accessible but blocks decryption until a private key is loaded', () => {
    render(<DecryptTab />);
    const status = screen.getByRole('status', { name: 'Decryption key status' });
    expect(status).toHaveAttribute('data-capability', 'blocked');
    expect(status).toHaveTextContent('Private key required');
    expect(status).not.toHaveTextContent('Decryption is unavailable');
    expect(status.querySelectorAll('p')).toHaveLength(1);
    fireEvent.change(screen.getByLabelText('Drop an encrypted file here or click to select (.pgp, .gpg, .asc)'), { target: { files: [new File(['test'], 'test.pgp')] } });
    expect(screen.getByRole('button', { name: 'Unlock File' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Load matching key/ }));
    expect($activeTab.get()).toBe('keyring');
    act(() => $privateKey.set({} as PrivateKey));
    expect(screen.queryByRole('status', { name: 'Decryption key status' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unlock File' })).toBeEnabled();
    act(() => clearKeys());
    expect(screen.getByRole('status', { name: 'Decryption key status' })).toHaveAttribute('data-capability', 'blocked');
    expect(screen.getByRole('button', { name: 'Unlock File' })).toBeDisabled();
  });
});

describe('file workspace controls', () => {
  it('keeps the native file picker focusable and named', () => {
    render(<FileDropZone onFile={vi.fn()} placeholder="Choose a file" />);
    const input = screen.getByLabelText('Choose a file');
    expect(input).toHaveAttribute('type', 'file');
    expect(input).not.toHaveClass('hidden');
    input.focus();
    expect(input).toHaveFocus();
  });

  it('accepts a selected file and a dropped file', () => {
    const onFile = vi.fn();
    render(<FileDropZone onFile={onFile} placeholder="Choose a file" />);
    const file = new File(['test'], 'document.txt');
    const input = screen.getByLabelText('Choose a file');
    fireEvent.change(input, { target: { files: [file] } });
    expect(onFile).toHaveBeenCalledWith(file);
    expect(input).toHaveValue('');
    fireEvent.drop(input.closest('label')!, { dataTransfer: { files: [file] } });
    expect(onFile).toHaveBeenCalledTimes(2);
  });

  it('treats default downloads as a supported path, not a warning', () => {
    render(<FolderBar folderHandle={null} onFolderChange={vi.fn()} />);
    expect(screen.getByText('Save location: your browser’s downloads folder')).toBeInTheDocument();
    expect(screen.queryByText(/not available/i)).not.toBeInTheDocument();
  });

  it('lets a first-time user select a recipient without leaving Encrypt', () => {
    $contacts.set([]);
    render(<EncryptTab />);
    const lookupButton = screen.getByRole('button', { name: 'Mock import recipient' });
    lookupButton.focus();
    fireEvent.click(lookupButton);
    expect(screen.getByText('Test recipient')).toBeInTheDocument();
    const fileInput = screen.getByLabelText('Drop a file here or click to select');
    expect(fileInput).toHaveFocus();
    fireEvent.change(fileInput, { target: { files: [new File(['test'], 'test.txt')] } });
    const removeButton = screen.getByRole('button', { name: 'Remove file' });
    removeButton.focus();
    fireEvent.click(removeButton);
    expect(screen.getByLabelText('Drop a file here or click to select')).toHaveFocus();
    expect($activeTab.get()).toBe('encrypt');
    fireEvent.click(screen.getByRole('button', { name: /change/i }));
    expect(screen.getByRole('button', { name: 'Mock import recipient' })).toBeInTheDocument();
  });
});
