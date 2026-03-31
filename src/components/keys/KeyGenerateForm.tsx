import { useState } from 'react';
import { generateKeyPair, parseUserId } from '../../lib/openpgp-helpers';
import { downloadTextFile } from '../../lib/file-helpers';
import { setKeys } from '../../stores/keys';
import { showToast } from '../../stores/toast';
import { evaluatePassphrase, isPassphraseAcceptable } from '../../lib/passphrase-strength';
import { registerUser } from '../../lib/api';
import ActionButton from '../shared/ActionButton';

interface Props {
  onBack: () => void;
  /** Called after successful key generation. If provided, skips the backup confirmation gate. */
  onSuccess?: () => void;
}

export default function KeyGenerateForm({ onBack, onSuccess }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [backupConfirmed, setBackupConfirmed] = useState(false);
  const [armoredPrivate, setArmoredPrivate] = useState('');
  const [generatedName, setGeneratedName] = useState('');

  async function handleGenerate() {
    if (!name.trim() || !email.trim()) {
      showToast('Please enter your name and email', 'warning');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      showToast('Please enter a valid email address', 'warning');
      return;
    }
    if (!passphrase) {
      showToast('Please set a passphrase to protect your private key', 'warning');
      return;
    }
    if (!isPassphraseAcceptable(passphrase)) {
      showToast('Passphrase must be at least 12 characters and rated "Fair" or better', 'warning');
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
      setGeneratedName(name.trim());
      setPassphrase('');
      setGenerated(true);

      // Register with CryptDrop server (non-blocking)
      const parsed = parseUserId(result.publicKey);
      registerUser({
        email: email.trim().toLowerCase(),
        name: name.trim(),
        publicKey: result.armoredPublic,
        fingerprint: parsed.fingerprint,
      }).catch(() => {
        // Registration is best-effort — don't block key generation
      });
    } catch (e) {
      showToast('Key generation failed: ' + (e as Error).message, 'error');
    } finally {
      setGenerating(false);
    }
  }

  function handleRedownload() {
    if (armoredPrivate) {
      downloadTextFile(armoredPrivate, generatedName.replace(/\s/g, '_') + '_PRIVATE.asc');
      showToast('Private key downloaded again', 'info');
    }
  }

  // Post-generation: backup confirmation gate
  if (generated) {
    return (
      <div className="animate-fade-in">
        <div style={{
          background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '0.75rem',
          padding: '1.5rem', marginBottom: '1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#92400e' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, margin: 0 }}>Save Your Private Key</h3>
          </div>
          <p style={{ fontSize: '0.8125rem', color: '#78350f', lineHeight: 1.5, margin: '0 0 1rem' }}>
            Your key files have been downloaded. <strong>Store your private key somewhere safe</strong> — a password manager, encrypted drive, or secure backup. If you lose it, you can never decrypt files sent to you. There is no recovery.
          </p>

          <button onClick={handleRedownload} style={{
            display: 'flex', alignItems: 'center', gap: '0.375rem', width: '100%',
            background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '0.5rem',
            padding: '0.625rem 1rem', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
            justifyContent: 'center', marginBottom: '1rem', transition: 'background 0.15s',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Download Private Key Again
          </button>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={backupConfirmed}
              onChange={(e) => setBackupConfirmed(e.target.checked)}
              style={{ marginTop: '0.125rem', accentColor: '#f59e0b' }}
            />
            <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#92400e', userSelect: 'none' }}>
              I have saved my private key somewhere safe.
            </span>
          </label>
        </div>

        <button
          onClick={() => onSuccess?.()}
          disabled={!backupConfirmed}
          style={{
            width: '100%', padding: '0.75rem', borderRadius: '0.75rem', border: 'none',
            fontSize: '0.875rem', fontWeight: 600, cursor: backupConfirmed ? 'pointer' : 'not-allowed',
            background: backupConfirmed ? '#1c1917' : '#e2e8f0',
            color: backupConfirmed ? '#fff' : '#94a3b8',
            transition: 'all 0.2s',
            boxShadow: backupConfirmed ? '0 4px 12px rgb(15 23 42 / 0.2)' : 'none',
          }}
        >
          Done — View My Key Ring
        </button>
      </div>
    );
  }

  return (
    <div>
      <button onClick={onBack} className="keys-back-link">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Back to options
      </button>
      <div className="private-key-card mb-4">
        <h3 className="private-key-section-title">Generate a New Key Pair</h3>
        <p className="private-key-section-body">Creates a Curve25519 key pair. Your <strong>private key file downloads immediately</strong> — you must save it securely yourself. CryptDrop cannot recover it.</p>

        <div className="key-gen-local-note">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          Generated entirely in your browser. Never sent to any server.
        </div>

        <div className="mt-4">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input type="text" placeholder="Your name" className="input" autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} />
            <input type="email" placeholder="your@email.com" className="input" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <input type="password" placeholder="Strong passphrase — protects your private key (min 12 chars)" className="input w-full" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} />
          {passphrase && (() => {
            const strength = evaluatePassphrase(passphrase);
            return (
              <div style={{ marginTop: '0.375rem', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.25rem' }}>
                  {[1, 2, 3].map((i) => (
                    <div key={i} style={{
                      flex: 1, height: 3, borderRadius: 2,
                      background: i <= strength.score ? strength.color : '#e2e8f0',
                      transition: 'background 0.2s',
                    }} />
                  ))}
                </div>
                <p style={{ fontSize: '0.6875rem', color: strength.color, margin: 0, fontWeight: 500 }}>
                  {strength.label}{strength.level === 'weak' && passphrase.length < 12 ? ' — needs at least 12 characters' : ''}
                </p>
              </div>
            );
          })()}
          {!passphrase && <div style={{ marginBottom: '0.75rem' }} />}
          <ActionButton onClick={handleGenerate} loading={generating} loadingText="Generating..." className="btn-vault-generate">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            Generate Keys & Download
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
