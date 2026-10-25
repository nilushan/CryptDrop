import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ActionButton from '../src/components/shared/ActionButton';
import NoticeBox from '../src/components/shared/NoticeBox';
import Toast from '../src/components/shared/Toast';
import KeyImportForm from '../src/components/keys/KeyImportForm';
import KeyLookupCard from '../src/components/shared/KeyLookupCard';
import ContactKeyList from '../src/components/keys/ContactKeyList';
import ContactListPicker from '../src/components/shared/ContactListPicker';
import ResultState from '../src/components/shared/ResultState';
import SignatureResult from '../src/components/shared/SignatureResult';
import ActivityHistory from '../src/components/shared/ActivityHistory';
import QuickEncryptPanel from '../src/components/encrypt/QuickEncryptPanel';
import DecryptFilePanel from '../src/components/shared/DecryptFilePanel';
import WizardTab from '../src/components/wizard/WizardTab';
import FolderBar from '../src/components/shared/FolderBar';
import InviteBox from '../src/components/shared/InviteBox';
import YourPublicKey from '../src/components/keys/YourPublicKey';
import { importPrivateKey, lookupKeyByEmail, encryptFileData, decryptFileData } from '../src/lib/openpgp-helpers';
import { $contacts, type Contact } from '../src/stores/contacts';
import { $toast } from '../src/stores/toast';
import { $history, addHistoryEntry } from '../src/stores/history';
import { $privateKey, $publicKey, $armoredPublic, clearKeys } from '../src/stores/keys';
import type { PrivateKey, PublicKey } from 'openpgp';

vi.mock('openpgp', () => ({ readKey: vi.fn().mockResolvedValue({}) }));
vi.mock('../src/lib/openpgp-helpers', () => ({ importPrivateKey: vi.fn(), lookupKeyByEmail: vi.fn(), parseUserId: vi.fn(), encryptFileData: vi.fn(), decryptFileData: vi.fn() }));
vi.mock('../src/lib/api', () => ({ sendDecryptInstructions: vi.fn(), sendInvitation: vi.fn(), registerUser: vi.fn() }));
const contact: Contact = { email: 'synthetic@example.test', name: 'Synthetic Recipient', armoredPublicKey: 'public fixture', fingerprint: 'ABCD EFGH 1234 5678', lastUpdated: '2026-01-01' };
const file = (name = 'synthetic.txt') => {
  const f = new File(['synthetic fixture'], name);
  Object.defineProperties(f, { text: { value: async () => 'fixture key' }, arrayBuffer: { value: async () => new ArrayBuffer(16) } });
  return f;
};
beforeEach(() => { vi.clearAllMocks(); });
afterEach(() => { cleanup(); clearKeys(); $contacts.set([]); $toast.set(null); $history.set([]); vi.unstubAllGlobals(); delete (window as unknown as Record<string, unknown>).showDirectoryPicker; });

describe('shared app interaction patterns', () => {
  it('uses a non-submit busy button and prevents repeat activation', () => {
    const onClick = vi.fn();
    const { rerender } = render(<ActionButton onClick={onClick}>Import</ActionButton>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
    rerender(<ActionButton onClick={onClick} loading loadingText="Importing…">Import</ActionButton>);
    const button = screen.getByRole('button', { name: 'Importing…' });
    expect(button).toBeDisabled(); expect(button).toHaveAttribute('aria-busy', 'true');
    fireEvent.click(button); expect(onClick).not.toHaveBeenCalled();
  });

  it('keeps static notices quiet and allows explicit error announcements', () => {
    const { rerender } = render(<NoticeBox variant="info">Instruction</NoticeBox>);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    rerender(<NoticeBox variant="error" role="alert">Import failed</NoticeBox>);
    expect(screen.getByRole('alert')).toHaveClass('notice-error');
  });

  it('keeps a polite toast region mounted before and after messages', () => {
    render(<Toast />); const region = screen.getByRole('status');
    act(() => $toast.set({ msg: 'Synthetic error', type: 'error' }));
    expect(region).toHaveTextContent('Synthetic error'); expect(region.firstChild).toHaveClass('toast-error');
    act(() => $toast.set(null)); expect(screen.getByRole('status')).toBe(region);
  });

  it('retains full result filenames and download/reset actions', () => {
    const onDownload = vi.fn(), onReset = vi.fn(); const name = 'long-synthetic-filename-'.repeat(8) + '.pgp';
    render(<ResultState type="encrypt" ownerName="Fixture" originalFile={{ name: 'source.txt', size: 16 }} resultFile={{ name, size: 32 }} onDownload={onDownload} onReset={onReset} />);
    expect(screen.getByRole('heading', { level: 3, name: 'File Locked!' })).toBeVisible();
    expect(screen.getByText(name)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: `Download ${name}` })); expect(onDownload).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Lock another file' })); expect(onReset).toHaveBeenCalledOnce();
  });

  it.each([
    ['encrypt', 'File Locked!'],
    ['decrypt', 'File Unlocked!'],
  ] as const)('preserves the %s result heading and polite announcement', (type, title) => {
    render(<ResultState type={type} ownerName="Fixture" originalFile={{ name: 'source.txt', size: 16 }} resultFile={{ name: 'result.txt', size: 32 }} onDownload={vi.fn()} onReset={vi.fn()} />);
    const heading = screen.getByRole('heading', { level: 3, name: title });
    expect(heading).toHaveAttribute('aria-live', 'polite');
    expect(heading).toHaveAttribute('aria-atomic', 'true');
    expect(heading).not.toHaveAttribute('role');
  });

  it.each([
    ['Signature verified!', 'Signature verified', 'notice-success'],
    ['Warning: invalid signature', 'Signature could not be verified', 'notice-warn'],
    ['Signature not checked', 'Signature not checked — no sender key provided', 'notice-info'],
  ])('preserves signature outcome %s', (signatureText, text, cls) => {
    render(<SignatureResult signatureText={signatureText} />); expect(screen.getByText(text).closest('.notice-box')).toHaveClass(cls);
  });

  it('does not invent a verified outcome for unsigned or unknown signature text', () => {
    const { container, rerender } = render(<SignatureResult signatureText="" />); expect(container).toBeEmptyDOMElement();
    rerender(<SignatureResult signatureText="Unknown" />); expect(container).toBeEmptyDOMElement();
  });
});

describe('key import and lookup fields', () => {
  it('labels distinct imports and associates help, persistent failure and retry', async () => {
    vi.mocked(importPrivateKey).mockRejectedValue(new Error('Incorrect passphrase'));
    render(<KeyImportForm onBack={vi.fn()} />);
    const input = screen.getByLabelText('Key passphrase (if protected)');
    expect(input).toHaveAccessibleDescription(/Select a private key file first/);
    expect(screen.getByRole('button', { name: 'Import Keys' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Drop your private key file here or click to select'), { target: { files: [file('fixture.asc')] } });
    await screen.findByText('fixture.asc');
    fireEvent.change(input, { target: { value: 'synthetic-passphrase' } });
    fireEvent.click(screen.getByRole('button', { name: 'Import Keys' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Import failed: Incorrect passphrase');
    expect(input).toHaveAccessibleDescription(/Import failed: Incorrect passphrase/);
    act(() => $toast.set(null)); expect(screen.getByRole('alert')).toBeVisible();
    fireEvent.change(input, { target: { value: 'retry passphrase' } }); expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import Keys' })).toBeEnabled();
  });

  it('uses unique import field IDs across islands', () => {
    render(<><KeyImportForm onBack={vi.fn()} /><KeyImportForm onBack={vi.fn()} /></>);
    const inputs = screen.getAllByLabelText('Key passphrase (if protected)'); expect(inputs[0].id).not.toBe(inputs[1].id);
  });

  it('keeps lookup misses and errors durable and describes the online/file alternatives', async () => {
    vi.mocked(lookupKeyByEmail).mockResolvedValue(null);
    const onNotFound = vi.fn(); render(<KeyLookupCard onKeyFound={vi.fn()} onNotFound={onNotFound} />);
    const input = screen.getByLabelText('Email address for public key lookup'); expect(input).toHaveAccessibleDescription(/online services/);
    fireEvent.change(input, { target: { value: 'missing@example.test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Find Key' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Not found on keyserver'); expect(onNotFound).toHaveBeenCalledWith('missing@example.test');
    vi.mocked(lookupKeyByEmail).mockRejectedValue(new Error('Offline'));
    fireEvent.click(screen.getByRole('button', { name: 'Find Key' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Lookup failed: Offline'); expect(input).toHaveValue('missing@example.test');
  });
});

describe('contacts, history and task feedback', () => {
  it('names contact actions and exposes the full fingerprint', () => {
    $contacts.set([contact]); render(<ContactKeyList />);
    expect(screen.getByText(`Fingerprint: ${contact.fingerprint}`)).toBeVisible();
    expect(screen.getByRole('button', { name: `Refresh key for ${contact.email}` })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: `Remove contact ${contact.email}` }));
    expect($contacts.get()).toHaveLength(0); expect(screen.getByText(/No saved recipients yet/)).toBeVisible();
  });

  it('distinguishes filtered contacts from an empty address book', () => {
    $contacts.set([contact]); render(<ContactListPicker onSelect={vi.fn()} showSearch />);
    fireEvent.change(screen.getByLabelText('Search contacts'), { target: { value: 'unmatched' } });
    expect(screen.getByRole('status')).toHaveTextContent('No recipients match');
  });

  it('keeps history as a named scrollable list with working clear controls', () => {
    addHistoryEntry({ action: 'encrypt', originalFilename: 'source.txt', originalSize: 1, resultFilename: 'output.pgp', resultSize: 2, recipientOrSender: 'Synthetic', signed: false });
    render(<ActivityHistory />); expect(screen.getByRole('list', { name: 'Recent file operations' })).toHaveAttribute('tabindex', '0');
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Clear' })); expect($history.get()).toHaveLength(0);
  });

  it('retains folder-picker failure beside a usable retry control', async () => {
    Object.defineProperty(window, 'showDirectoryPicker', { configurable: true, value: vi.fn().mockRejectedValue(new Error('Permission denied')) });
    render(<FolderBar folderHandle={null} onFolderChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose folder' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not access folder: Permission denied');
    act(() => $toast.set(null)); expect(screen.getByRole('alert')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Choose folder' })).toBeEnabled();
  });

  it('retains public-key clipboard failure with the download alternative', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('Denied')) } });
    $publicKey.set({} as PublicKey); $armoredPublic.set('synthetic public key');
    render(<YourPublicKey />); fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Try again or use Download');
    expect(screen.getByRole('button', { name: 'Download' })).toBeEnabled();
  });

  it('retains invitation clipboard failure instead of rejecting silently', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('Denied')) } });
    render(<InviteBox />); fireEvent.click(screen.getByRole('button', { name: 'Copy Instructions' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Could not copy instructions. Please try again.');
  });

  it('retains encryption failure beside the selected file', async () => {
    vi.mocked(encryptFileData).mockRejectedValue(new Error('Fixture failure'));
    render(<QuickEncryptPanel contact={contact} folderHandle={null} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Drop a file here or click to select'), { target: { files: [file()] } });
    fireEvent.click(screen.getByRole('button', { name: 'Encrypt File' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Encryption failed: Fixture failure');
    expect(screen.getByText('synthetic.txt')).toBeVisible(); expect(screen.getByRole('button', { name: 'Encrypt File' })).toBeEnabled();
  });

  it('retains decryption failure without changing key or selected file', async () => {
    $privateKey.set({} as PrivateKey); vi.mocked(decryptFileData).mockRejectedValue(new Error('Wrong recipient'));
    render(<DecryptFilePanel />);
    fireEvent.change(screen.getByLabelText('Drop an encrypted file here or click to select (.pgp, .gpg, .asc)'), { target: { files: [file('fixture.pgp')] } });
    fireEvent.click(screen.getByRole('button', { name: 'Unlock File' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Decryption failed: Wrong recipient');
    expect(screen.getByText('fixture.pgp')).toBeVisible(); expect($privateKey.get()).not.toBeNull();
  });

  it('names wizard steps and moves focus to the new visible heading', async () => {
    render(<WizardTab />); fireEvent.click(screen.getByRole('button', { name: /Encrypt a File/ }));
    const heading = screen.getByRole('heading', { level: 1, name: 'Find a recipient.' });
    await waitFor(() => expect(heading).toHaveFocus());
    const progress = screen.getByRole('list', { name: 'Setup progress' });
    expect(progress.querySelector('[aria-current="step"]')).toHaveTextContent('Find Recipient');
    fireEvent.click(screen.getByRole('button', { name: 'Back' })); expect(screen.getByRole('heading', { level: 1, name: 'A simpler place to start.' })).toBeVisible();
  });
});
