import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { $privateKey, $publicKey, $userInfo } from '../../stores/keys';
import { showToast } from '../../stores/toast';
import { generateKeyPair, importPrivateKey } from '../../lib/openpgp-helpers';
import { downloadTextFile } from '../../lib/file-helpers';
import { setKeys } from '../../stores/keys';

interface Props {
  onAdvance: () => void;
}

export default function WizardDecryptKeys({ onAdvance }: Props) {
  const privateKey = useStore($privateKey);
  const publicKey = useStore($publicKey);
  const userInfo = useStore($userInfo);

  const [showGenForm, setShowGenForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [generating, setGenerating] = useState(false);

  const [importText, setImportText] = useState<string | null>(null);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [importPassphrase, setImportPassphrase] = useState('');
  const [importing, setImporting] = useState(false);

  const fingerprint = publicKey
    ? publicKey.getFingerprint().toUpperCase().match(/.{1,4}/g)?.join(' ') ?? ''
    : '';

  async function handleGenerate() {
    if (!name.trim() || !email.trim()) { showToast('Please enter your name and email', 'warning'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { showToast('Please enter a valid email address', 'warning'); return; }
    if (!passphrase) { showToast('Please set a passphrase', 'warning'); return; }
    setGenerating(true);
    try {
      const result = await generateKeyPair(name.trim(), email.trim(), passphrase);
      setKeys(result.privateKey, result.publicKey, result.armoredPrivate, result.armoredPublic, result.userInfo);
      downloadTextFile(result.armoredPrivate, name.trim().replace(/\s/g, '_') + '_PRIVATE.asc');
      downloadTextFile(result.armoredPublic, name.trim().replace(/\s/g, '_') + '_PUBLIC.asc');
      showToast('Keys generated! Files downloaded.', 'success');
      onAdvance();
    } catch (e) {
      showToast('Key generation failed: ' + (e as Error).message, 'error');
    } finally {
      setGenerating(false);
    }
  }

  function handleImportFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then((text) => {
      setImportText(text);
      setImportFileName(file.name);
      showToast('Key file loaded — enter passphrase and click Import', 'info');
    });
  }

  async function handleImport() {
    if (!importText) { showToast('Select a key file first', 'warning'); return; }
    setImporting(true);
    try {
      const result = await importPrivateKey(importText, importPassphrase);
      setKeys(result.privateKey, result.publicKey, importText, result.armoredPublic, result.userInfo);
      showToast('Private key imported: ' + result.userInfo, 'success');
      onAdvance();
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes('passphrase')) {
        showToast(msg.includes('Wrong') ? 'Wrong passphrase — please try again' : msg, 'warning');
      } else {
        showToast('Import failed: ' + msg, 'error');
      }
    } finally {
      setImporting(false);
    }
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
          <div>
            {!showGenForm ? (
              <button onClick={() => setShowGenForm(true)} className="btn-primary w-full mb-3">Create My Keys</button>
            ) : (
              <div className="mb-4">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <input type="text" placeholder="Your name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
                  <input type="email" placeholder="Your email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <input type="password" placeholder="Passphrase (protects your private key)" className="input w-full mb-4" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} />
                <button onClick={handleGenerate} disabled={generating} className="btn-primary">
                  {generating ? 'Generating…' : 'Generate & Continue'}
                </button>
              </div>
            )}

            <div className="divider">or</div>

            <details className="mt-3">
              <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800 font-medium">I already have keys</summary>
              <div className="mt-3">
                <label className="drop-zone drop-zone-sm block mb-3">
                  <input type="file" accept=".asc,.key,.pgp,.gpg" className="hidden" onChange={handleImportFileSelect} />
                  <p className="text-sm text-gray-500">{importFileName || 'Drop your private key file here or click to select'}</p>
                </label>
                <input type="password" placeholder="Passphrase" className="input w-full mb-3" value={importPassphrase} onChange={(e) => setImportPassphrase(e.target.value)} />
                <button onClick={handleImport} disabled={!importText || importing} className="btn-primary">
                  {importing ? 'Importing…' : 'Import & Continue'}
                </button>
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
