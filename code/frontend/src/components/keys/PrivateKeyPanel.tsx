import { useState, useEffect, useId } from 'react';
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
import { useKeyProtection } from './useKeyProtection';
import KeySecurityDisclosure from './KeySecurityDisclosure';
import FormField from '../shared/FormField';

type View = 'choice' | 'generate' | 'import' | 'loaded';

export default function PrivateKeyPanel() {
  const restoreId = useId();
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
  const savedProtection = useKeyProtection(savedKey?.armoredPrivate ?? null);

  useEffect(() => {
    if (privateKey && publicKey) {
      // Generation has its own backup check; publishing keys must not unmount it.
      setView((current) => current === 'generate' ? current : 'loaded');
    }
  }, [privateKey, publicKey]);

  // Clear stale passphrase error when the user navigates back to this tab
  useEffect(() => {
    setRestoreError('');
    setRestorePassphrase('');
  }, [activeTab]);

  // Re-read when returning to options: Remember/Forget may have changed storage.
  useEffect(() => {
    if (view !== 'choice') return;
    let cancelled = false;
    setSavedKey(null);
    getSavedKey().then((saved) => { if (!cancelled) setSavedKey(saved); });
    return () => { cancelled = true; };
  }, [view]);

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
      setRestorePassphrase('');
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
      <KeySecurityDisclosure />

      {view === 'choice' && (
        <div>
          {/* Saved key restore card */}
          {savedKey && (
            <div className="private-key-card animate-fade-in mb-4">
              <div className="private-key-vault-row">
                <div className="private-key-vault-icon">
                  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="17,21 17,13 7,13 7,21" stroke="currentColor" strokeWidth="2"/><polyline points="7,3 7,8 15,8" stroke="currentColor" strokeWidth="2"/></svg>
                </div>
                <div className="private-key-vault-info">
                  <p className="private-key-uid">
                    {savedKey.userInfo}
                  </p>
                  <p className="private-key-fp">
                    {savedKey.fingerprint ? '...' + savedKey.fingerprint.slice(-16) : 'Saved key'}
                  </p>
                </div>
                <span className="vault-loaded-badge">
                  Saved
                </span>
              </div>

              <p className="private-key-section-body">
                {savedProtection === 'unsafe'
                  ? 'This older saved key is not verified as passphrase-protected. Load it to keep a safe copy, then remove the unsafe browser copy. Do not delete your only copy.'
                  : 'Enter your passphrase to unlock this key. Browser storage is not a backup.'}
              </p>

              <div className="mb-3">
                <FormField id={restoreId} label="Saved key passphrase" help="Use the passphrase for this saved key to unlock it." error={restoreError}>
                  <input id={restoreId} type="password" autoComplete="off" value={restorePassphrase}
                    onChange={(e) => { setRestorePassphrase(e.target.value); setRestoreError(''); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleRestore(); }} className="input w-full"
                    aria-describedby={`${restoreId}-help${restoreError ? ` ${restoreId}-error` : ''}`}
                    aria-invalid={!!restoreError} />
                </FormField>
              </div>

              <ActionButton
                onClick={handleRestore}
                disabled={savedProtection === 'checking' || (savedProtection === 'protected' && !restorePassphrase)}
                loading={restoring}
                loadingText="Unlocking..."
                className="btn-vault-generate"
              >
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M7 11V7a5 5 0 019.9-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                {savedProtection === 'unsafe' ? 'Load Older Saved Key' : 'Unlock Saved Key'}
              </ActionButton>
            </div>
          )}

          {/* Informational status, deliberately distinct from the setup actions. */}
          {!savedKey && !privateKey && (
            <div className="private-key-status mb-5" role="status" aria-label="Private key status">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
                <path d="M12 11v5M12 8h.01" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
              <div>
                <p className="private-key-status-title">No private key loaded</p>
                <p className="private-key-status-body">A private key is needed to decrypt or sign files. You can encrypt for others without one.</p>
              </div>
            </div>
          )}

          <KeyChoiceGrid onGenerate={() => setView('generate')} onImport={() => setView('import')} />
        </div>
      )}

      {view === 'generate' && (
        <KeyGenerateForm onBack={() => setView('choice')} onSuccess={() => setView('loaded')} />
      )}

      {view === 'import' && (
        <KeyImportForm onBack={() => setView('choice')} />
      )}

      {view === 'loaded' && (
        <>
          <KeyLoadedView
            key={armoredPrivate}
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
