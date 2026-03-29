import { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { $privateKey, $publicKey, $userInfo, $armoredPrivate } from '../../stores/keys';
import KeyGenerateForm from './KeyGenerateForm';
import KeyImportForm from './KeyImportForm';
import KeyLoadedView from './KeyLoadedView';

type View = 'choice' | 'generate' | 'import' | 'loaded';

interface Props {
  onViewPublic: () => void;
}

export default function PrivateKeyPanel({ onViewPublic }: Props) {
  const privateKey = useStore($privateKey);
  const publicKey = useStore($publicKey);
  const userInfo = useStore($userInfo);
  const armoredPrivate = useStore($armoredPrivate);
  const [view, setView] = useState<View>(privateKey && publicKey ? 'loaded' : 'choice');

  useEffect(() => {
    if (privateKey && publicKey) {
      setView('loaded');
    }
  }, [privateKey, publicKey]);

  const fingerprint = publicKey
    ? publicKey.getFingerprint().toUpperCase().match(/.{1,4}/g)?.join(' ') ?? ''
    : '';

  return (
    <div>
      <div className="local-assurance-bar mb-5">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        <span>All key operations run <strong>locally in your browser</strong>. Your private key is <strong>never transmitted</strong> to any server.</span>
      </div>

      {view === 'choice' && (
        <div>
          <div className="private-key-card private-key-card-empty mb-5">
            <div className="private-key-empty-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </div>
            <p className="private-key-empty-title">No private key loaded</p>
            <p className="private-key-empty-body">You need your private key to <strong>decrypt</strong> files sent to you, or to <strong>sign</strong> files you encrypt. If you only want to encrypt files <em>for others</em>, you don't need one here.</p>
          </div>

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
        </div>
      )}

      {view === 'generate' && (
        <KeyGenerateForm onBack={() => setView('choice')} />
      )}

      {view === 'import' && (
        <KeyImportForm onBack={() => setView('choice')} />
      )}

      {view === 'loaded' && (
        <KeyLoadedView
          userInfo={userInfo || ''}
          fingerprint={fingerprint}
          armoredPrivate={armoredPrivate}
          onReplace={() => setView('choice')}
          onViewPublic={onViewPublic}
        />
      )}
    </div>
  );
}
