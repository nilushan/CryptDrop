import { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { $privateKey, $publicKey, $userInfo, $armoredPrivate, $armoredPublic, setKeys } from '../../stores/keys';
import { $activeTab } from '../../stores/activeTab';
import { getSavedKey, type SavedKey } from '../../lib/key-storage';
import { importPrivateKey } from '../../lib/openpgp-helpers';
import { showToast } from '../../stores/toast';
import KeyGenerateForm from './KeyGenerateForm';
import KeyImportForm from './KeyImportForm';
import KeyLoadedView from './KeyLoadedView';
import YourPublicKey from './YourPublicKey';
import ActionButton from '../shared/ActionButton';
import KeyChoiceGrid from '../shared/KeyChoiceGrid';

type View = 'choice' | 'generate' | 'import' | 'loaded';

export default function PrivateKeyPanel() {
  const privateKey = useStore($privateKey);
  const publicKey = useStore($publicKey);
  const userInfo = useStore($userInfo);
  const armoredPrivate = useStore($armoredPrivate);
  const armoredPublic = useStore($armoredPublic);
  const activeTab = useStore($activeTab);
  const [view, setView] = useState<View>(privateKey && publicKey ? 'loaded' : 'choice');
  const [savedKey, setSavedKey] = useState<SavedKey | null>(null);
  const [restorePassphrase, setRestorePassphrase] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState('');

  useEffect(() => {
    if (privateKey && publicKey) {
      setView('loaded');
    }
  }, [privateKey, publicKey]);

  // Clear stale passphrase error when the user navigates back to this tab
  useEffect(() => {
    setRestoreError('');
    setRestorePassphrase('');
  }, [activeTab]);

  // Check for saved key on mount
  useEffect(() => {
    getSavedKey().then(setSavedKey);
  }, []);

  const fingerprint = publicKey
    ? publicKey.getFingerprint().toUpperCase().match(/.{1,4}/g)?.join(' ') ?? ''
    : '';

  async function handleRestore() {
    if (!savedKey) return;
    setRestoring(true);
    setRestoreError('');
    try {
      const result = await importPrivateKey(savedKey.armoredPrivate, restorePassphrase);
      setKeys(result.privateKey, result.publicKey, savedKey.armoredPrivate, result.armoredPublic, result.userInfo);
      showToast('Key restored from saved storage', 'success');
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes('passphrase') || msg.includes('Incorrect')) {
        setRestoreError('Wrong passphrase — please try again.');
      } else {
        setRestoreError('Failed to restore: ' + msg);
      }
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div>
      <div className="local-assurance-bar mb-5">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        <span>All key operations run <strong>locally in your browser</strong>. Your private key is <strong>never transmitted</strong> to any server.</span>
      </div>

      {view === 'choice' && (
        <div>
          {/* Saved key restore card */}
          {savedKey && (
            <div className="animate-fade-in" style={{
              background: '#1c1917', border: '2px solid #065f46', borderRadius: '0.75rem',
              padding: '1.25rem', marginBottom: '1rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '0.625rem', background: '#022c22',
                  border: '1px solid #065f46', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#6ee7b7', flexShrink: 0,
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="17,21 17,13 7,13 7,21" stroke="currentColor" strokeWidth="2"/><polyline points="7,3 7,8 15,8" stroke="currentColor" strokeWidth="2"/></svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f5f5f4', margin: '0 0 0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {savedKey.userInfo}
                  </p>
                  <p style={{ fontSize: '0.6875rem', fontFamily: 'ui-monospace, monospace', color: '#a8a29e', margin: 0 }}>
                    {savedKey.fingerprint ? '...' + savedKey.fingerprint.slice(-16) : 'Saved key'}
                  </p>
                </div>
                <span style={{
                  fontSize: '0.625rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
                  padding: '0.2rem 0.5rem', borderRadius: '9999px',
                  background: '#14532d', color: '#bbf7d0', border: '1px solid #166534',
                }}>
                  Saved
                </span>
              </div>

              <p style={{ fontSize: '0.75rem', color: '#a8a29e', margin: '0 0 0.75rem', lineHeight: 1.4 }}>
                Enter your passphrase to unlock this key.
              </p>

              <input
                type="password"
                placeholder="Passphrase"
                value={restorePassphrase}
                onChange={(e) => { setRestorePassphrase(e.target.value); setRestoreError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleRestore(); }}
                style={{
                  width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.5rem',
                  border: restoreError ? '1px solid #dc2626' : '1px solid #57534e',
                  background: '#292524', color: '#e7e5e4', fontSize: '0.875rem',
                  outline: 'none', marginBottom: '0.5rem', boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />

              {restoreError && (
                <p style={{ fontSize: '0.75rem', color: '#fca5a5', margin: '0 0 0.5rem' }}>{restoreError}</p>
              )}

              <ActionButton
                onClick={handleRestore}
                disabled={!restorePassphrase}
                loading={restoring}
                loadingText="Unlocking..."
                className="btn-vault-generate"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M7 11V7a5 5 0 019.9-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                Unlock Saved Key
              </ActionButton>
            </div>
          )}

          {/* Empty state (only shown when no saved key) */}
          {!savedKey && (
            <div className="private-key-card private-key-card-empty mb-5">
              <div className="private-key-empty-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </div>
              <p className="private-key-empty-title">No private key loaded</p>
              <p className="private-key-empty-body">You need your private key to <strong>decrypt</strong> files sent to you, or to <strong>sign</strong> files you encrypt. If you only want to encrypt files <em>for others</em>, you don't need one here.</p>
            </div>
          )}

          <KeyChoiceGrid onGenerate={() => setView('generate')} onImport={() => setView('import')} />
        </div>
      )}

      {view === 'generate' && (
        <KeyGenerateForm onBack={() => setView('choice')} />
      )}

      {view === 'import' && (
        <KeyImportForm onBack={() => setView('choice')} />
      )}

      {view === 'loaded' && (
        <>
          <KeyLoadedView
            userInfo={userInfo || ''}
            fingerprint={fingerprint}
            armoredPrivate={armoredPrivate}
            armoredPublic={armoredPublic}
            onReplace={() => setView('choice')}
          />
          <YourPublicKey />
        </>
      )}
    </div>
  );
}
