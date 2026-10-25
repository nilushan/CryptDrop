import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import KeyGenerateForm from '../src/components/keys/KeyGenerateForm';
import { generateKeyPair } from '../src/lib/openpgp-helpers';
import { downloadTextFile } from '../src/lib/file-helpers';
import { registerUser } from '../src/lib/api';
import { setKeys } from '../src/stores/keys';
import { showToast } from '../src/stores/toast';

vi.mock('../src/lib/openpgp-helpers', () => ({ generateKeyPair: vi.fn(), parseUserId: vi.fn(() => ({ fingerprint: 'ABCD' })) }));
vi.mock('../src/lib/file-helpers', () => ({ downloadTextFile: vi.fn() }));
vi.mock('../src/lib/api', () => ({ registerUser: vi.fn().mockResolvedValue({}) }));
vi.mock('../src/stores/keys', () => ({ setKeys: vi.fn() }));
vi.mock('../src/stores/toast', () => ({ showToast: vi.fn() }));
vi.mock('../src/components/keys/KeyBackupGuide', () => ({ default: () => <div>Backup verification</div> }));

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

function fill(name = 'Alice Example', email = 'alice@example.com', passphrase = 'Correct Horse Battery Staple!42') {
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: name } });
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Passphrase'), { target: { value: passphrase } });
}

const generate = () => fireEvent.click(screen.getByRole('button', { name: 'Generate Keys & Download' }));

describe('KeyGenerateForm labels and guidance', () => {
  it('keeps associated visible labels and stable IDs before and after typing', () => {
    const { container } = render(<KeyGenerateForm onBack={vi.fn()} />);
    const labels = ['Name', 'Email address', 'Passphrase'];
    const ids = labels.map((label) => {
      const input = screen.getByLabelText(label);
      expect(input).toHaveAccessibleName(label);
      expect(input.id).not.toBe('');
      expect(container.querySelector(`label[for="${input.id}"]`)).toBeVisible();
      return input.id;
    });
    fill();
    labels.forEach((label, index) => {
      expect(screen.getByText(label, { selector: 'label' })).toBeVisible();
      expect(screen.getByLabelText(label)).toHaveAttribute('id', ids[index]);
      expect(screen.getByLabelText(label)).toHaveAccessibleName(label);
    });
    expect(screen.getByLabelText('Email address')).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText('Passphrase')).toHaveAttribute('type', 'password');
  });

  it('keeps help visible and described-by when empty, typed, and cleared, alongside strength feedback', () => {
    render(<KeyGenerateForm onBack={vi.fn()} />);
    const input = screen.getByLabelText('Passphrase');
    const helpId = input.getAttribute('aria-describedby')!;
    expect(document.getElementById(helpId)).toBeVisible();
    expect(input).toHaveAccessibleDescription(/at least 12 characters, rated Fair or better/);
    expect(input).toHaveAccessibleDescription(/Remember your passphrase and store it safely/);
    expect(input).toHaveAccessibleDescription(/unlock your private key. CryptDrop cannot recover or reset it/);
    fireEvent.change(input, { target: { value: 'short' } });
    expect(input).toHaveAccessibleDescription(/Weak — needs at least 12 characters/);
    expect(screen.getByText(/Weak —/)).toHaveAttribute('aria-live', 'polite');
    fireEvent.change(input, { target: { value: 'Correct Horse Battery Staple!42' } });
    expect(input).toHaveAccessibleDescription(/Strong/);
    expect(document.getElementById(helpId)).toBeVisible();
    fireEvent.change(input, { target: { value: '' } });
    expect(input).toHaveAttribute('aria-describedby', helpId);
    expect(document.getElementById(helpId)).toBeVisible();
  });

  it('isolates labels and descriptions across two simultaneously mounted flows', () => {
    const { container } = render(<><section aria-label="Keyring"><KeyGenerateForm onBack={vi.fn()} /></section><section aria-label="Setup"><KeyGenerateForm onBack={vi.fn()} /></section></>);
    const ids = Array.from(container.querySelectorAll('[id]'), (element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const flow of ['Keyring', 'Setup']) {
      const region = screen.getByRole('region', { name: flow });
      for (const label of ['Name', 'Email address', 'Passphrase']) {
        const input = within(region).getByLabelText(label);
        expect(input).toHaveAccessibleName(label);
        expect(region.contains(document.getElementById(input.id))).toBe(true);
      }
      const input = within(region).getByLabelText('Passphrase');
      expect(region.contains(document.getElementById(input.getAttribute('aria-describedby')!))).toBe(true);
    }
  });
});

describe('KeyGenerateForm privacy notice', () => {
  it('discloses automatic public identity registration separately from local secrets in both flow instances', () => {
    render(<><section aria-label="Keyring"><KeyGenerateForm onBack={vi.fn()} /></section><section aria-label="Setup"><KeyGenerateForm onBack={vi.fn()} /></section></>);
    for (const flow of ['Keyring', 'Setup']) {
      const region = screen.getByRole('region', { name: flow });
      expect(within(region).getByText(/Your private key and passphrase stay local/)).toHaveTextContent('Generation automatically attempts to register your name, email, public key, and fingerprint with the CryptDrop API.');
      expect(within(region).getByRole('link', { name: 'See network services and data details' })).toHaveAttribute('href', '/security#network-requests');
      expect(region).not.toHaveTextContent('Never sent to any server');
    }
    expect(registerUser).not.toHaveBeenCalled();
  });
});

describe('KeyGenerateForm existing behavior', () => {
  it.each([
    ['', 'alice@example.com', 'valid passphrase 42', 'Please enter your name and email'],
    ['Alice', 'not-an-email', 'valid passphrase 42', 'Please enter a valid email address'],
    ['Alice', 'alice@example.com', '', 'Please set a passphrase to protect your private key'],
    ['Alice', 'alice@example.com', 'Short!42', 'Passphrase must be at least 12 characters and rated "Fair" or better'],
    ['Alice', 'alice@example.com', 'aaaaaaaaaaaa', 'Passphrase must be at least 12 characters and rated "Fair" or better'],
  ])('retains validation for %j / %j / %j', (name, email, passphrase, message) => {
    render(<KeyGenerateForm onBack={vi.fn()} />);
    fill(name, email, passphrase);
    generate();
    expect(showToast).toHaveBeenCalledWith(message, 'warning');
    expect(generateKeyPair).not.toHaveBeenCalled();
    expect(downloadTextFile).not.toHaveBeenCalled();
  });

  it('retains loading, trimmed generation, downloads, registration, and the backup gate', async () => {
    let finish!: (result: Awaited<ReturnType<typeof generateKeyPair>>) => void;
    vi.mocked(generateKeyPair).mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    const onSuccess = vi.fn();
    render(<KeyGenerateForm onBack={vi.fn()} onSuccess={onSuccess} />);
    fill(' Alice Example ', ' Alice@Example.com ');
    generate();
    expect(screen.getByRole('button', { name: 'Generating...' })).toBeDisabled();
    expect(generateKeyPair).toHaveBeenCalledExactlyOnceWith('Alice Example', 'Alice@Example.com', 'Correct Horse Battery Staple!42');
    expect(downloadTextFile).not.toHaveBeenCalled();
    const result = { privateKey: {} as never, publicKey: {} as never, armoredPrivate: 'synthetic-private', armoredPublic: 'synthetic-public', userInfo: 'Alice' };
    await act(async () => finish(result));
    expect(setKeys).toHaveBeenCalledWith(result.privateKey, result.publicKey, result.armoredPrivate, result.armoredPublic, result.userInfo);
    expect(downloadTextFile).toHaveBeenNthCalledWith(1, 'synthetic-private', 'Alice_Example_PRIVATE.asc');
    expect(downloadTextFile).toHaveBeenNthCalledWith(2, 'synthetic-public', 'Alice_Example_PUBLIC.asc');
    expect(registerUser).toHaveBeenCalledWith(expect.objectContaining({ email: 'alice@example.com', name: 'Alice Example', publicKey: 'synthetic-public' }));
    expect(screen.getByRole('button', { name: 'Done — View My Key Ring' })).toBeDisabled();
    expect(screen.queryByLabelText('Passphrase')).not.toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('retains failure feedback and retry/back controls', async () => {
    vi.mocked(generateKeyPair).mockRejectedValueOnce(new Error('Synthetic failure'));
    const onBack = vi.fn();
    render(<KeyGenerateForm onBack={onBack} />);
    fill();
    await act(async () => generate());
    expect(showToast).toHaveBeenCalledWith('Key generation failed: Synthetic failure', 'error');
    expect(screen.getByRole('button', { name: 'Generate Keys & Download' })).toBeEnabled();
    expect(downloadTextFile).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Back to options' }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
