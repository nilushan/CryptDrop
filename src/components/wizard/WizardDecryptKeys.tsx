import { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { $privateKey, $publicKey, $userInfo, $armoredPrivate, $armoredPublic } from '../../stores/keys';
import { saveKey, getSavedKey } from '../../lib/key-storage';
import { showToast } from '../../stores/toast';
import KeyGenerateForm from '../keys/KeyGenerateForm';
import KeyImportForm from '../keys/KeyImportForm';
import KeyChoiceGrid from '../shared/KeyChoiceGrid';
import NoticeBox from '../shared/NoticeBox';

interface Props {
  onAdvance: () => void;
}

export default function WizardDecryptKeys({ onAdvance }: Props) {
  const privateKey = useStore($privateKey);
  const publicKey = useStore($publicKey);
  const userInfo = useStore($userInfo);
  const armoredPrivate = useStore($armoredPrivate);
  const armoredPublic = useStore($armoredPublic);
  const [view, setView] = useState<'choice' | 'generate' | 'import'>('choice');
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const fingerprint = publicKey
    ? publicKey.getFingerprint().toUpperCase().match(/.{1,4}/g)?.join(' ') ?? ''
    : '';

  useEffect(() => {
    if (privateKey) {
      getSavedKey().then((saved) => setIsSaved(!!saved && saved.fingerprint === fingerprint));
    }
  }, [privateKey, fingerprint]);

  async function handleRemember() {
    if (!armoredPrivate || !armoredPublic) return;
    setSaving(true);
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
      showToast('Failed to save key: ' + (e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  if (view === 'generate') {
    return <KeyGenerateForm onBack={() => setView('choice')} onSuccess={() => setView('choice')} />;
  }

  if (view === 'import') {
    return <KeyImportForm onBack={() => setView('choice')} onSuccess={() => setView('choice')} />;
  }

  return (
    <div className="fade-in">
      <div className="card">
        <h3 className="card-title">Set Up Your Private Key</h3>
        <p className="text-xs text-gray-500 mb-4">You need your private key to decrypt files encrypted for you.</p>
        <NoticeBox variant="info" className="mb-4">
          <p className="text-xs text-indigo-700">Only your private key can decrypt files locked with your public key. CryptDrop never sees it.</p>
        </NoticeBox>

        {/* Key already loaded */}
        {privateKey && (
          <div>
            <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
              <p className="text-sm font-medium text-green-800">Keys loaded: {userInfo || 'Unknown'}</p>
              <p className="text-xs text-green-600 font-mono mt-1">Fingerprint: {fingerprint}</p>
            </div>

            {isSaved ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                background: '#022c22', border: '1px solid #065f46', borderRadius: '0.5rem',
                padding: '0.625rem 0.75rem', marginBottom: '0.75rem',
                fontSize: '0.75rem', color: '#6ee7b7',
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                  <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                </svg>
                Key saved to browser storage — you'll be asked for your passphrase next visit.
              </div>
            ) : (
              <div style={{
                background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '0.5rem',
                padding: '0.75rem', marginBottom: '0.75rem',
              }}>
                <p style={{ fontSize: '0.75rem', color: '#78350f', margin: '0 0 0.5rem', lineHeight: 1.4 }}>
                  Your key is only in memory — it will be erased when you close this tab.
                </p>
                <button
                  onClick={handleRemember}
                  disabled={saving}
                  className="btn-vault-action"
                  style={{ color: '#6ee7b7', borderColor: '#065f46' }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="17,21 17,13 7,13 7,21" stroke="currentColor" strokeWidth="2"/><polyline points="7,3 7,8 15,8" stroke="currentColor" strokeWidth="2"/></svg>
                  {saving ? 'Saving...' : 'Remember this key'}
                </button>
              </div>
            )}

            <button onClick={onAdvance} className="btn-primary">Continue &rarr;</button>
          </div>
        )}

        {/* Key setup */}
        {!privateKey && (
          <KeyChoiceGrid onGenerate={() => setView('generate')} onImport={() => setView('import')} />
        )}
      </div>
    </div>
  );
}
