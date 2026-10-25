import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { $privateKey, $publicKey, $userInfo, $armoredPrivate, $armoredPublic } from '../../stores/keys';
import KeyGenerateForm from '../keys/KeyGenerateForm';
import KeyImportForm from '../keys/KeyImportForm';
import KeyLoadedView from '../keys/KeyLoadedView';
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

  const fingerprint = publicKey
    ? publicKey.getFingerprint().toUpperCase().match(/.{1,4}/g)?.join(' ') ?? ''
    : '';

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

        {privateKey ? (
          <div>
            <KeyLoadedView
              key={armoredPrivate}
              userInfo={userInfo || 'Unknown'}
              fingerprint={fingerprint}
              armoredPrivate={armoredPrivate}
              armoredPublic={armoredPublic}
              onReplace={() => setView('import')}
            />
            <button onClick={onAdvance} className="btn-primary">Continue &rarr;</button>
          </div>
        ) : (
          <KeyChoiceGrid onGenerate={() => setView('generate')} onImport={() => setView('import')} />
        )}
      </div>
    </div>
  );
}
