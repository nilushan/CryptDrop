import { useState, useEffect } from 'react';
import { downloadTextFile } from '../../lib/file-helpers';
import { saveKey, deleteSavedKey, getSavedKey } from '../../lib/key-storage';
import { readProtectedPrivateKey } from '../../lib/key-backup';
import { showToast } from '../../stores/toast';
import { useKeyProtection } from './useKeyProtection';
import ActionButton from '../shared/ActionButton';
import NoticeBox from '../shared/NoticeBox';

interface Props {
  userInfo: string;
  fingerprint: string;
  armoredPrivate: string | null;
  armoredPublic: string | null;
  onReplace: () => void;
}

export default function KeyLoadedView({ userInfo, fingerprint, armoredPrivate, armoredPublic, onReplace }: Props) {
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const protection = useKeyProtection(armoredPrivate);

  useEffect(() => {
    let cancelled = false;
    setIsSaved(false);
    const canonical = armoredPrivate
      ? readProtectedPrivateKey(armoredPrivate).then((key) => key.armor()).catch(() => armoredPrivate)
      : Promise.resolve(null);
    Promise.all([getSavedKey(), canonical]).then(([saved, armored]) => {
      if (!cancelled) setIsSaved(!!saved && saved.fingerprint === fingerprint &&
        (saved.armoredPrivate === armored || saved.armoredPrivate === armoredPrivate));
    });
    return () => { cancelled = true; };
  }, [fingerprint, armoredPrivate]);

  function handleDownloadPrivate() {
    if (armoredPrivate) {
      downloadTextFile(armoredPrivate, 'private_key.asc');
    }
  }

  async function handleRemember() {
    if (!armoredPrivate || !armoredPublic) return;
    setSaving(true);
    setError('');
    try {
      await saveKey({
        armoredPrivate,
        armoredPublic,
        userInfo: userInfo || 'Unknown',
        fingerprint,
        savedAt: new Date().toISOString(),
      });
      setIsSaved(true);
      showToast('Key saved to browser storage', 'success');
    } catch (e) {
      setError('Failed to save key: ' + (e as Error).message);
      showToast('Failed to save key: ' + (e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleForget() {
    setError('');
    try {
      await deleteSavedKey();
      setIsSaved(false);
      showToast('Saved key removed from browser storage', 'info');
    } catch {
      setError('Could not remove the saved key. Please try again.');
      showToast('Could not remove the saved key. Please try again.', 'error');
    }
  }

  return (
    <div>
      <div className="private-key-card mb-4">
        <div className="private-key-vault-row">
          <div className="private-key-vault-icon">
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2.5"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/><circle cx="12" cy="16" r="1.5" fill="currentColor"/></svg>
          </div>
          <div className="private-key-vault-info">
            <p className="private-key-uid">{userInfo || 'Unknown'}</p>
            <p className="private-key-fp">Fingerprint: {fingerprint}</p>
          </div>
          <div className="private-key-vault-status">
            <span className="vault-loaded-badge">
              <svg aria-hidden="true" width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
              Loaded
            </span>
          </div>
        </div>

        {/* Warning strip — changes based on saved state */}
        {isSaved ? (
          <div className={protection === 'protected' ? 'private-key-saved-strip' : 'private-key-warning-strip'}>
            <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <span>{protection === 'protected'
              ? 'Encrypted key remembered on this device. Your passphrase is needed next time. Browser storage is not a backup — keep an independent copy.'
              : 'An older copy is saved in browser storage, but its protection is not verified. Keep a safe copy before using Forget saved key.'}</span>
          </div>
        ) : (
          <div className="private-key-warning-strip">
            <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span>This key lives only in your browser's memory and is erased when you close this tab. <strong>Back it up securely</strong> — if you lose it, you cannot decrypt files sent to you.</span>
          </div>
        )}

        {protection === 'unsafe' && (
          <p role="alert" className="private-key-warning-strip">
            This key could not be verified as fully passphrase-protected and cannot be remembered on this device.
            Add a strong passphrase using a trusted PGP tool and re-import it. Keep your existing key safe;
            do not delete your only copy.
          </p>
        )}

        {protection === 'checking' && <p role="status" className="private-key-section-body">Checking key protection before remembering it…</p>}
        {error && <NoticeBox variant="error" role="alert" className="mb-3">{error}</NoticeBox>}
        <div className="private-key-actions">
          <button onClick={handleDownloadPrivate} className="btn-vault-action">
            <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Download Private Key
          </button>
          {!isSaved ? (
            <ActionButton onClick={handleRemember} disabled={protection !== 'protected'} loading={saving} loadingText="Saving…" className="btn-vault-action">
              <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="17,21 17,13 7,13 7,21" stroke="currentColor" strokeWidth="2"/><polyline points="7,3 7,8 15,8" stroke="currentColor" strokeWidth="2"/></svg>
              Remember on this device
            </ActionButton>
          ) : (
            <button onClick={handleForget} className="btn-vault-secondary btn-vault-danger">
              <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Forget saved key
            </button>
          )}
          <button onClick={onReplace} className="btn-vault-secondary">
            Replace keys
          </button>
        </div>
      </div>
    </div>
  );
}
