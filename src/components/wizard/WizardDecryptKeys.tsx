import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { $privateKey, $publicKey, $userInfo } from '../../stores/keys';
import KeyGenerateForm from '../keys/KeyGenerateForm';
import KeyImportForm from '../keys/KeyImportForm';

interface Props {
  onAdvance: () => void;
}

export default function WizardDecryptKeys({ onAdvance }: Props) {
  const privateKey = useStore($privateKey);
  const publicKey = useStore($publicKey);
  const userInfo = useStore($userInfo);
  const [view, setView] = useState<'choice' | 'generate' | 'import'>('choice');

  const fingerprint = publicKey
    ? publicKey.getFingerprint().toUpperCase().match(/.{1,4}/g)?.join(' ') ?? ''
    : '';

  if (view === 'generate') {
    return <KeyGenerateForm onBack={() => setView('choice')} onSuccess={onAdvance} />;
  }

  if (view === 'import') {
    return <KeyImportForm onBack={() => setView('choice')} onSuccess={onAdvance} />;
  }

  return (
    <div className="fade-in">
      <div className="card">
        <h3 className="card-title">Set Up Your Private Key</h3>
        <p className="text-xs text-gray-500 mb-4">You need your private key to decrypt files encrypted for you.</p>
        <div className="notice-box notice-info mb-4">
          <p className="text-xs text-indigo-700">Only your private key can decrypt files locked with your public key. CryptDrop never sees it.</p>
        </div>

        {/* Key already loaded */}
        {privateKey && (
          <div>
            <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
              <p className="text-sm font-medium text-green-800">Keys loaded: {userInfo || 'Unknown'}</p>
              <p className="text-xs text-green-600 font-mono mt-1">Fingerprint: {fingerprint}</p>
            </div>
            <button onClick={onAdvance} className="btn-primary">Continue &rarr;</button>
          </div>
        )}

        {/* Key setup */}
        {!privateKey && (
          <div className="keys-choice-grid">
            <button onClick={() => setView('generate')} className="keys-choice-card">
              <div className="keys-choice-icon keys-choice-icon-generate">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </div>
              <p className="keys-choice-title">Generate a New Key Pair</p>
              <p className="keys-choice-desc">Create fresh Curve25519 keys. Your private key downloads immediately.</p>
            </button>
            <button onClick={() => setView('import')} className="keys-choice-card">
              <div className="keys-choice-icon keys-choice-icon-import">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <p className="keys-choice-title">Import Existing Key</p>
              <p className="keys-choice-desc">Load a private key file (.asc) you already have.</p>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
