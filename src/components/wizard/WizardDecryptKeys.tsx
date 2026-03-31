import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { $privateKey, $publicKey, $userInfo } from '../../stores/keys';
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
