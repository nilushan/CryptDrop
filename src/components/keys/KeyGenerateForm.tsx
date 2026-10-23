import { useId, useState } from 'react';
import { generateKeyPair, parseUserId } from '../../lib/openpgp-helpers';
import { downloadTextFile } from '../../lib/file-helpers';
import { setKeys } from '../../stores/keys';
import { showToast } from '../../stores/toast';
import { evaluatePassphrase, isPassphraseAcceptable } from '../../lib/passphrase-strength';
import { registerUser } from '../../lib/api';
import ActionButton from '../shared/ActionButton';
import FormField from '../shared/FormField';
import NoticeBox from '../shared/NoticeBox';
import KeyBackupGuide from './KeyBackupGuide';

interface Props {
  onBack: () => void;
  /** Called after the generated key's backup has been verified. */
  onSuccess?: () => void;
}

export default function KeyGenerateForm({ onBack, onSuccess }: Props) {
  const formId = useId();
  const nameId = `${formId}-name`;
  const emailId = `${formId}-email`;
  const passphraseId = `${formId}-passphrase`;
  const [error, setError] = useState('');
  function reportError(message: string, type: 'warning' | 'error') {
    setError(message);
    showToast(message, type);
  }
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [backupConfirmed, setBackupConfirmed] = useState(false);
  const [armoredPrivate, setArmoredPrivate] = useState('');

  async function handleGenerate() {
    setError('');
    if (!name.trim() || !email.trim()) {
      reportError('Please enter your name and email', 'warning');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      reportError('Please enter a valid email address', 'warning');
      return;
    }
    if (!passphrase) {
      reportError('Please set a passphrase to protect your private key', 'warning');
      return;
    }
    if (!isPassphraseAcceptable(passphrase)) {
      reportError('Passphrase must be at least 12 characters and rated "Fair" or better', 'warning');
      return;
    }

    setGenerating(true);
    try {
      const result = await generateKeyPair(name.trim(), email.trim(), passphrase);
      setKeys(result.privateKey, result.publicKey, result.armoredPrivate, result.armoredPublic, result.userInfo);
      downloadTextFile(result.armoredPrivate, name.trim().replace(/\s/g, '_') + '_PRIVATE.asc');
      downloadTextFile(result.armoredPublic, name.trim().replace(/\s/g, '_') + '_PUBLIC.asc');
      showToast('Keys generated! Files downloaded.', 'success');
      setArmoredPrivate(result.armoredPrivate);
      setPassphrase('');
      setGenerated(true);

      // Register with CryptDrop server (non-blocking)
      const parsed = parseUserId(result.publicKey);
      const inviteToken = new URLSearchParams(window.location.search).get('inviteToken') ?? undefined;
      registerUser({
        email: email.trim().toLowerCase(),
        name: name.trim(),
        publicKey: result.armoredPublic,
        fingerprint: parsed.fingerprint,
        inviteToken,
      }).catch(() => {
        // Registration is best-effort — don't block key generation
      });
    } catch (e) {
      reportError('Key generation failed: ' + (e as Error).message, 'error');
    } finally {
      setGenerating(false);
    }
  }

  // Post-generation: backup confirmation gate
  if (generated) {
    return (
      <div className="animate-fade-in">
        <div className="private-key-card mb-4">
          <h3 className="private-key-section-title">Generate a New Key Pair</h3>
          <p className="private-key-section-body"><strong>Your key pair is ready.</strong> Your key files have been downloaded. Keep your private key secret.</p>
          <p className="private-key-section-body">Open <strong>Back up your secret</strong> below to save and verify a recovery copy before finishing.</p>
        </div>
        <KeyBackupGuide armoredPrivate={armoredPrivate} onVerificationChange={setBackupConfirmed} />

        <button
          onClick={() => { if (backupConfirmed) onSuccess?.(); }}
          disabled={!backupConfirmed}
          className="btn-vault-generate w-full"
        >
          Done — View My Key Ring
        </button>
      </div>
    );
  }

  return (
    <div>
      <button onClick={onBack} className="keys-back-link">
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Back to options
      </button>
      <div className="private-key-card mb-4">
        <h3 className="private-key-section-title">Generate a New Key Pair</h3>
        <p className="private-key-section-body">Creates a Curve25519 key pair. Your <strong>private key file downloads immediately</strong> — you must save it securely yourself. CryptDrop cannot recover it.</p>

        <div className="key-gen-local-note">
          <svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          <span>Keys are generated in your browser. Your private key and passphrase stay local. Generation automatically attempts to register your name, email, public key, and fingerprint with the CryptDrop API. <a href="/security#network-requests">See network services and data details</a>.</span>
        </div>

        <div className="mt-4">
          <div className="key-gen-identity-fields mb-3">
            <FormField id={nameId} label="Name">
              <input id={nameId} type="text" placeholder="Your name" className="input w-full" autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} />
            </FormField>
            <FormField id={emailId} label="Email address">
              <input id={emailId} type="email" placeholder="your@email.com" className="input w-full" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} />
            </FormField>
          </div>
          <FormField id={passphraseId} label="Passphrase" help={
            <>Use at least 12 characters, rated Fair or better. Remember your passphrase and store it safely. You need it to unlock your private key. CryptDrop cannot recover or reset it.</>
          }>
            <input id={passphraseId} type="password" placeholder="Strong passphrase" className="input w-full" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} aria-describedby={`${passphraseId}-help${passphrase ? ` ${passphraseId}-strength` : ''}`} />
          </FormField>
          {passphrase && (() => {
            const strength = evaluatePassphrase(passphrase);
            return (
              <div className="passphrase-strength" data-level={strength.level}>
                <div className="passphrase-strength-bars" aria-hidden="true">
                  {[1, 2, 3].map((i) => <div key={i} data-filled={i <= strength.score} />)}
                </div>
                <p id={`${passphraseId}-strength`} aria-live="polite">
                  {strength.label}{strength.level === 'weak' && passphrase.length < 12 ? ' — needs at least 12 characters' : ''}
                </p>
              </div>
            );
          })()}
          {error && <NoticeBox variant="error" role="alert" className="mt-3 mb-3">{error}</NoticeBox>}
          <ActionButton onClick={handleGenerate} loading={generating} loadingText="Generating..." className="btn-vault-generate">
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            Generate Keys & Download
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
