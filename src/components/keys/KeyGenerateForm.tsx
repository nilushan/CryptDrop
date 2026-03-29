import { useState } from 'react';
import { generateKeyPair } from '../../lib/openpgp-helpers';
import { downloadTextFile } from '../../lib/file-helpers';
import { setKeys } from '../../stores/keys';
import { showToast } from '../../stores/toast';

interface Props {
  onBack: () => void;
}

export default function KeyGenerateForm({ onBack }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [generating, setGenerating] = useState(false);

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

    setGenerating(true);
    try {
      const result = await generateKeyPair(name.trim(), email.trim(), passphrase);
      setKeys(result.privateKey, result.publicKey, result.armoredPrivate, result.armoredPublic, result.userInfo);
      downloadTextFile(result.armoredPrivate, name.trim().replace(/\s/g, '_') + '_PRIVATE.asc');
      downloadTextFile(result.armoredPublic, name.trim().replace(/\s/g, '_') + '_PUBLIC.asc');
      showToast('Keys generated! Files downloaded.', 'success');
    } catch (e) {
      showToast('Key generation failed: ' + (e as Error).message, 'error');
    } finally {
      setGenerating(false);
    }
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
            <input type="text" placeholder="Your name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
            <input type="email" placeholder="your@email.com" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <input type="password" placeholder="Strong passphrase — protects your private key" className="input w-full mb-4" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} />
          <button onClick={handleGenerate} disabled={generating} className="btn-vault-generate">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            {generating ? 'Generating…' : 'Generate Keys & Download'}
          </button>
        </div>
      </div>
    </div>
  );
}
