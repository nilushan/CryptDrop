import { useEffect, useId, useRef, useState } from 'react';
import { downloadTextFile } from '../../lib/file-helpers';
import { readProtectedPrivateKey, verifyPrivateKeyBackup } from '../../lib/key-backup';
import { useKeyProtection } from './useKeyProtection';
import ActionButton from '../shared/ActionButton';

interface Props {
  armoredPrivate: string;
  onVerificationChange?: (verified: boolean) => void;
}

// Key the inner component by key material so changing identities resets all check state.
export default function KeyBackupGuide(props: Props) {
  return <BackupCheck key={props.armoredPrivate} {...props} />;
}

function BackupCheck({ armoredPrivate, onVerificationChange }: Props) {
  const protection = useKeyProtection(armoredPrivate);
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [passphrase, setPassphrase] = useState('');
  const [storedSafely, setStoredSafely] = useState(false);
  const [checking, setChecking] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');
  const attempt = useRef(0);
  useEffect(() => () => { attempt.current++; }, []);

  async function checkBackup() {
    if (!file || !passphrase || !storedSafely || checking) return;
    const currentAttempt = ++attempt.current;
    setChecking(true);
    setError('');
    setVerified(false);
    onVerificationChange?.(false);
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('Choose a private key file smaller than 5 MB.');
      await verifyPrivateKeyBackup(await file.text(), passphrase, armoredPrivate);
      if (currentAttempt !== attempt.current) return;
      setVerified(true);
      onVerificationChange?.(true);
    } catch (e) {
      if (currentAttempt === attempt.current) setError((e as Error).message);
    } finally {
      if (currentAttempt === attempt.current) {
        setPassphrase('');
        setChecking(false);
      }
    }
  }

  async function downloadBackup() {
    try {
      const key = await readProtectedPrivateKey(armoredPrivate);
      downloadTextFile(key.armor(), 'cryptdrop-private-backup.asc');
    } catch {
      setError('Could not export a protected backup. Check the key and try again.');
    }
  }

  function resetCheck() {
    setVerified(false);
    onVerificationChange?.(false);
    setError('');
  }

  return (
    <section className="private-key-card key-backup-card mb-4" aria-labelledby={`${id}-heading`}>
      <h3 id={`${id}-heading`} className="key-backup-heading">
        <button type="button" className="key-backup-toggle" aria-expanded={expanded} aria-controls={`${id}-content`}
          onClick={() => { if (expanded) setPassphrase(''); setExpanded(!expanded); }}>
          <svg className="key-backup-lock" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="4" y="10" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" />
            <path d="M8 10V7a4 4 0 018 0v3M12 14v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <span>Back up your secret</span>
          <svg className="key-backup-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </h3>
      <p className="key-backup-summary">{verified ? 'Backup verified for this session.' : 'Keep a recoverable copy of your private key. Backup not yet verified.'}</p>
      {protection === 'checking' && <p role="status" className="private-key-section-body">Checking key protection…</p>}
      {protection === 'unsafe' && (
        <p role="alert" className="private-key-section-body">
          This key could not be verified as fully passphrase-protected. It cannot be remembered on this device
          or marked as a protected backup. Add a strong passphrase using a trusted PGP tool and re-import it.
          Keep your existing key safe in the meantime; do not delete your only copy.
        </p>
      )}
      <div id={`${id}-content`} hidden={!expanded} className="key-backup-content">
        <h4 className="private-key-section-title">Back up to your password manager</h4>
        <p className="private-key-section-body">
          Browser storage is a convenience, not a backup. Clearing site data, losing this device,
          or using private browsing can remove your saved key. CryptDrop cannot recover a lost key or forgotten passphrase.
        </p>
        {protection === 'protected' && (
        <>
          <ol className="private-key-section-body backup-instructions">
            <li>Create a secure item named “CryptDrop private key” in your password manager.</li>
            <li>Download the encrypted key below and attach the .asc file. If attachments are unavailable,
              save the entire file text, including its BEGIN and END lines, as a secure note.</li>
            <li>Save the passphrase too, or keep it in another recoverable secure location.
              Storing both in one vault is convenient, but anyone who unlocks that vault can access both.</li>
            <li>Retrieve the attachment from your vault to test it below. For a secure note, export or save its
              full text as a plain-text .asc file. Do not just select the original download.</li>
          </ol>
          <button type="button" className="btn-vault-action mb-4" onClick={downloadBackup}>
            Download encrypted backup
          </button>
          <p className="private-key-section-body">
            Consider a second encrypted copy on a separate drive. Keep access to your password manager recoverable too.
            After testing your backup, remove unnecessary copies from Downloads on shared devices.
          </p>
          <fieldset disabled={checking} className="backup-fields">
            <legend className="private-key-section-title">Test your saved backup</legend>
            <label className="private-key-section-body backup-confirmation">
              <input type="checkbox" checked={storedSafely} onChange={(e) => { setStoredSafely(e.target.checked); resetCheck(); }} />{' '}
              I saved the key and a way to recover its passphrase outside this browser.
            </label>
            <label htmlFor={`${id}-file`} className="private-key-section-body">Private key file retrieved from your backup</label>
            <input id={`${id}-file`} type="file" aria-describedby={`${id}-backup-help${error ? ` ${id}-backup-error` : ''}`} accept=".asc,.txt,text/plain,application/pgp-keys" className="input w-full mb-3"
              onChange={(e) => { setFile(e.target.files?.[0] ?? null); setPassphrase(''); resetCheck(); }} />
            <label htmlFor={`${id}-passphrase`} className="private-key-section-body">Backup passphrase</label>
            <input id={`${id}-passphrase`} type="password" autoComplete="off" className="input w-full mb-3" aria-describedby={`${id}-backup-help${error ? ` ${id}-backup-error` : ''}`}
              value={passphrase} onChange={(e) => { setPassphrase(e.target.value); resetCheck(); }} />
            <ActionButton className="btn-vault-action" disabled={!file || !passphrase || !storedSafely} loading={checking} loadingText="Checking backup…" onClick={checkBackup}>
              Verify backup
            </ActionButton>
          </fieldset>
          <p id={`${id}-backup-help`} className="private-key-section-body">Choose your retrieved backup file, enter its passphrase, and confirm that you stored it outside this browser to enable verification. This check stays in your browser and does not replace your loaded key.
            It verifies the selected file, not whether your password manager has synced or will remain available.</p>
          {error && <p id={`${id}-backup-error`} role="alert" className="private-key-section-body">{error}</p>}
          {verified && <p role="status" className="private-key-section-body"><strong>Backup verified.</strong> This file matches your key and its subkeys, and its passphrase unlocks it.</p>}
        </>
        )}
      </div>
    </section>
  );
}
