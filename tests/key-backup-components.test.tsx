import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import KeyBackupGuide from '../src/components/keys/KeyBackupGuide';
import KeyLoadedView from '../src/components/keys/KeyLoadedView';
import PrivateKeyPanel from '../src/components/keys/PrivateKeyPanel';
import WizardDecryptKeys from '../src/components/wizard/WizardDecryptKeys';
import KeyChoiceGrid from '../src/components/shared/KeyChoiceGrid';
import { readProtectedPrivateKey, verifyPrivateKeyBackup } from '../src/lib/key-backup';
import { downloadTextFile } from '../src/lib/file-helpers';
import { getSavedKey, saveKey } from '../src/lib/key-storage';
import { generateKeyPair } from '../src/lib/openpgp-helpers';
import { $privateKey, clearKeys, setKeys } from '../src/stores/keys';

vi.mock('../src/lib/key-backup', () => ({ readProtectedPrivateKey: vi.fn(), verifyPrivateKeyBackup: vi.fn() }));
vi.mock('../src/lib/key-storage', () => ({ getSavedKey: vi.fn(), saveKey: vi.fn(), deleteSavedKey: vi.fn() }));
vi.mock('../src/lib/file-helpers', () => ({ downloadTextFile: vi.fn() }));
vi.mock('../src/lib/api', () => ({ registerUser: vi.fn().mockResolvedValue({}) }));
vi.mock('../src/lib/openpgp-helpers', () => ({ generateKeyPair: vi.fn(), parseUserId: vi.fn(() => ({ fingerprint: 'ABCD' })), importPrivateKey: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(readProtectedPrivateKey).mockImplementation(async (armored) => ({ armor: () => armored }) as never);
  vi.mocked(verifyPrivateKeyBackup).mockResolvedValue(undefined);
  vi.mocked(getSavedKey).mockResolvedValue(null);
  vi.mocked(saveKey).mockResolvedValue(undefined);
});
afterEach(() => { cleanup(); clearKeys(); });

async function fillBackupCheck() {
  const toggle = screen.getByRole('button', { name: 'Back up your secret' });
  if (toggle.getAttribute('aria-expanded') === 'false') fireEvent.click(toggle);
  await screen.findByRole('button', { name: 'Download encrypted backup' });
  const file = new File(['encrypted-backup'], 'from-vault.asc', { type: 'text/plain' });
  Object.defineProperty(file, 'text', { value: async () => 'encrypted-backup' });
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.change(screen.getByLabelText('Private key file retrieved from your backup'), { target: { files: [file] } });
  fireEvent.change(screen.getByLabelText('Backup passphrase'), { target: { value: 'secret-passphrase' } });
}

describe('backup guide', () => {
  it('starts collapsed, opens only on request, and clears the passphrase when collapsed again', async () => {
    render(<KeyBackupGuide armoredPrivate="current-key" />);
    const toggle = screen.getByRole('button', { name: 'Back up your secret' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    const content = document.getElementById(toggle.getAttribute('aria-controls')!);
    expect(content).not.toBeVisible();
    expect(screen.queryByRole('button', { name: 'Verify backup' })).not.toBeInTheDocument();
    expect(verifyPrivateKeyBackup).not.toHaveBeenCalled();
    await fillBackupCheck();
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(content).toBeVisible();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(content).not.toBeVisible();
    fireEvent.click(toggle);
    expect(screen.getByLabelText('Backup passphrase')).toHaveValue('');
  });

  it('requires a retrieved file, passphrase, and separate-storage acknowledgement, then verifies locally', async () => {
    const onVerificationChange = vi.fn();
    render(<KeyBackupGuide armoredPrivate="current-key" onVerificationChange={onVerificationChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Back up your secret' }));
    await screen.findByRole('button', { name: 'Verify backup' });
    expect(screen.getByRole('button', { name: 'Verify backup' })).toBeDisabled();
    expect(screen.getByText(/Browser storage is a convenience, not a backup/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Download encrypted backup' }));
    await waitFor(() => expect(downloadTextFile).toHaveBeenCalledWith('current-key', 'cryptdrop-private-backup.asc'));
    expect(onVerificationChange).not.toHaveBeenCalledWith(true);
    await fillBackupCheck();
    fireEvent.click(screen.getByRole('button', { name: 'Verify backup' }));
    expect(await screen.findByText('Backup verified.')).toBeInTheDocument();
    expect(verifyPrivateKeyBackup).toHaveBeenCalledWith('encrypted-backup', 'secret-passphrase', 'current-key');
    expect(onVerificationChange).toHaveBeenLastCalledWith(true);
    expect(screen.getByLabelText('Backup passphrase')).toHaveValue('');
    expect(saveKey).not.toHaveBeenCalled();
    expect($privateKey.get()).toBeNull();
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.queryByText('Backup verified.')).not.toBeInTheDocument();
    expect(onVerificationChange).toHaveBeenLastCalledWith(false);
  });

  it('shows restore failure without marking the backup complete and clears the passphrase', async () => {
    vi.mocked(verifyPrivateKeyBackup).mockRejectedValueOnce(new Error('Could not unlock this backup.'));
    const onVerificationChange = vi.fn();
    render(<KeyBackupGuide armoredPrivate="current-key" onVerificationChange={onVerificationChange} />);
    await fillBackupCheck();
    fireEvent.click(screen.getByRole('button', { name: 'Verify backup' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not unlock');
    expect(onVerificationChange).not.toHaveBeenCalledWith(true);
    expect(screen.getByLabelText('Backup passphrase')).toHaveValue('');
  });

  it('does not offer an encrypted backup download for an unsafe key', async () => {
    vi.mocked(readProtectedPrivateKey).mockRejectedValue(new Error('Unprotected'));
    render(<KeyBackupGuide armoredPrivate="unsafe-key" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Add a strong passphrase');
    expect(screen.queryByRole('button', { name: 'Download encrypted backup' })).not.toBeInTheDocument();
  });

  it('discards an in-flight verification when the active key changes', async () => {
    let finish!: () => void;
    vi.mocked(verifyPrivateKeyBackup).mockReturnValueOnce(new Promise<void>((resolve) => { finish = resolve; }));
    const onVerificationChange = vi.fn();
    const view = render(<KeyBackupGuide armoredPrivate="old-key" onVerificationChange={onVerificationChange} />);
    await fillBackupCheck();
    fireEvent.click(screen.getByRole('button', { name: 'Verify backup' }));
    await waitFor(() => expect(verifyPrivateKeyBackup).toHaveBeenCalled());
    view.rerender(<KeyBackupGuide armoredPrivate="new-key" onVerificationChange={onVerificationChange} />);
    await act(async () => finish());
    expect(screen.getByRole('button', { name: 'Back up your secret' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Backup verified.')).not.toBeInTheDocument();
    expect(onVerificationChange).not.toHaveBeenCalledWith(true);
  });
});

const loadedProps = { userInfo: 'Alice', fingerprint: 'ABCD', armoredPrivate: 'protected-key', armoredPublic: 'public-key', onReplace: vi.fn() };

describe('key setup status and actions', () => {
  it('keeps the security disclosure available before importing a key', async () => {
    render(<PrivateKeyPanel />);
    const heading = screen.getByText('How your private key is protected');
    expect(heading).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /Import Existing/i }));
    expect(heading).toBeVisible();
    expect(screen.getByPlaceholderText('Passphrase (if your key has one)')).toBeInTheDocument();
  });

  it('presents the unloaded state as non-interactive status, separate from setup buttons', async () => {
    render(<PrivateKeyPanel />);
    const status = await screen.findByRole('status', { name: 'Private key status' });
    expect(status).toHaveTextContent('No private key loaded');
    expect(within(status).queryByRole('button')).not.toBeInTheDocument();
    expect(status).not.toHaveAttribute('tabindex');
    expect(status).not.toHaveClass('private-key-card');
    expect(screen.getByRole('button', { name: 'Generate a New Key Pair' })).toHaveClass('keys-choice-primary');
    expect(screen.getByRole('button', { name: 'Import Existing Key' })).not.toHaveClass('keys-choice-primary');
  });

  it('keeps both setup actions named, described, and independently functional', () => {
    const onGenerate = vi.fn();
    const onImport = vi.fn();
    render(<KeyChoiceGrid onGenerate={onGenerate} onImport={onImport} />);
    const generate = screen.getByRole('button', { name: 'Generate a New Key Pair' });
    const importKey = screen.getByRole('button', { name: 'Import Existing Key' });
    expect(generate).toHaveAccessibleDescription(/Create fresh Curve25519 keys/);
    expect(importKey).toHaveAccessibleDescription(/Load a private key file/);
    fireEvent.click(generate);
    expect(onGenerate).toHaveBeenCalledTimes(1);
    expect(onImport).not.toHaveBeenCalled();
    fireEvent.click(importKey);
    expect(onImport).toHaveBeenCalledTimes(1);
  });
});

describe('remember on this device', () => {
  it('disables remembering an unsafe key and never claims it is encrypted', async () => {
    vi.mocked(readProtectedPrivateKey).mockRejectedValue(new Error('Unsafe'));
    render(<KeyLoadedView {...loadedProps} armoredPrivate="unsafe-key" />);
    await screen.findByRole('alert');
    const remember = screen.getByRole('button', { name: 'Remember on this device' });
    expect(remember).toBeDisabled();
    fireEvent.click(remember);
    expect(saveKey).not.toHaveBeenCalled();
    expect(screen.queryByText(/Encrypted key remembered/)).not.toBeInTheDocument();
  });

  it('saves protected keys with an explicit not-a-backup message', async () => {
    render(<KeyLoadedView {...loadedProps} />);
    const remember = screen.getByRole('button', { name: 'Remember on this device' });
    await waitFor(() => expect(remember).toBeEnabled());
    fireEvent.click(remember);
    expect(await screen.findByText(/Encrypted key remembered on this device/)).toHaveTextContent('Browser storage is not a backup');
    expect(saveKey).toHaveBeenCalledWith(expect.objectContaining({ armoredPrivate: 'protected-key' }));
    expect(screen.queryByRole('button', { name: 'Back up your secret' })).not.toBeInTheDocument();
  });

  it('keeps a legacy unsafe saved key recoverable without claiming it is protected', async () => {
    vi.mocked(readProtectedPrivateKey).mockRejectedValue(new Error('Unsafe'));
    vi.mocked(getSavedKey).mockResolvedValue({ ...loadedProps, savedAt: '' });
    render(<PrivateKeyPanel />);
    const button = await screen.findByRole('button', { name: 'Load Older Saved Key' });
    expect(button).toBeEnabled();
    expect(screen.getByText(/Do not delete your only copy/)).toBeInTheDocument();
  });

  it('refreshes restore options after forgetting a saved key', async () => {
    setKeys({} as never, { getFingerprint: () => 'abcd' } as never, 'protected-key', 'public-key', 'Alice');
    vi.mocked(getSavedKey).mockResolvedValue({ ...loadedProps, savedAt: '' });
    render(<PrivateKeyPanel />);
    const forget = await screen.findByRole('button', { name: 'Forget saved key' });
    vi.mocked(getSavedKey).mockResolvedValue(null);
    fireEvent.click(forget);
    await screen.findByRole('button', { name: 'Remember on this device' });
    fireEvent.click(screen.getByRole('button', { name: 'Replace keys' }));
    await screen.findByRole('button', { name: /Import Existing Key/ });
    expect(screen.queryByRole('button', { name: 'Unlock Saved Key' })).not.toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Private key status' })).not.toBeInTheDocument();
  });

  it('applies the same protection guard in the wizard', async () => {
    vi.mocked(readProtectedPrivateKey).mockRejectedValue(new Error('Unsafe'));
    setKeys({} as never, { getFingerprint: () => 'abcd' } as never, 'unsafe-key', 'public-key', 'Alice');
    render(<WizardDecryptKeys onAdvance={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Back up your secret' })).not.toBeInTheDocument();
    await screen.findByRole('alert');
    expect(screen.getByRole('button', { name: 'Remember on this device' })).toBeDisabled();
  });
});

describe('key generation backup gate', () => {
  it('does not unmount the backup check when generated keys are published to the shared store', async () => {
    vi.mocked(generateKeyPair).mockResolvedValue({
      privateKey: {} as never, publicKey: { getFingerprint: () => 'abcd' } as never,
      armoredPrivate: 'generated-key', armoredPublic: 'public-key', userInfo: 'Alice',
    });
    render(<PrivateKeyPanel />);
    fireEvent.click(screen.getByRole('button', { name: /Generate a New Key Pair/i }));
    expect(screen.queryByRole('button', { name: 'Back up your secret' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Alice' } });
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), { target: { value: 'alice@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/Strong passphrase/), { target: { value: 'Correct Horse Battery Staple!42' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate Keys & Download' }));
    const done = await screen.findByRole('button', { name: 'Done — View My Key Ring' });
    expect(done).toBeDisabled();
    expect(screen.getByRole('heading', { name: 'Generate a New Key Pair' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back up your secret' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: 'Download encrypted backup' })).not.toBeInTheDocument();
    await fillBackupCheck();
    fireEvent.click(screen.getByRole('button', { name: 'Verify backup' }));
    await waitFor(() => expect(done).toBeEnabled());
    fireEvent.click(done);
    expect(await screen.findByRole('button', { name: 'Remember on this device' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Back up your secret' })).not.toBeInTheDocument();
  });
});
