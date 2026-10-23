import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { touchContact, type Contact } from '../../stores/contacts';
import { $privateKey, $publicKey, $userInfo } from '../../stores/keys';
import { $activeTab } from '../../stores/activeTab';
import { addHistoryEntry } from '../../stores/history';
import { showToast } from '../../stores/toast';
import { encryptFileData } from '../../lib/openpgp-helpers';
import { sanitizeFolderName, saveToFolder } from '../../lib/file-helpers';
import { sendDecryptInstructions } from '../../lib/api';
import FileDropZone from '../shared/FileDropZone';
import NoticeBox from '../shared/NoticeBox';
import FileSelectedCard from '../shared/FileSelectedCard';
import ActionButton from '../shared/ActionButton';
import ResultState from '../shared/ResultState';
import * as openpgp from 'openpgp';

interface Props {
  contact: Contact;
  folderHandle: FileSystemDirectoryHandle | null;
  onClose: () => void;
}

interface EncryptResult {
  blob: Blob;
  filename: string;
  originalFile: { name: string; size: number };
}

export default function QuickEncryptPanel({ contact, folderHandle, onClose }: Props) {
  const privateKey = useStore($privateKey);
  const publicKey = useStore($publicKey);
  const userInfo = useStore($userInfo);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [signEnabled, setSignEnabled] = useState(false);
  const [encrypting, setEncrypting] = useState(false);
  const [result, setResult] = useState<EncryptResult | null>(null);

  async function handleEncrypt() {
    if (!selectedFile || (signEnabled && !privateKey)) return;
    setEncrypting(true);
    try {
      const recipientKey = await openpgp.readKey({ armoredKey: contact.armoredPublicKey });
      const fileData = new Uint8Array(await selectedFile.arrayBuffer());
      const encrypted = await encryptFileData(fileData, selectedFile.name, recipientKey, signEnabled ? privateKey ?? undefined : undefined);
      const outFilename = selectedFile.name + '_for_' + sanitizeFolderName(contact.email || 'unknown') + '.pgp';
      const blob = new Blob([encrypted as BlobPart], { type: 'application/pgp-encrypted' });

      setResult({
        blob,
        filename: outFilename,
        originalFile: { name: selectedFile.name, size: selectedFile.size },
      });

      addHistoryEntry({
        action: 'encrypt',
        originalFilename: selectedFile.name,
        originalSize: selectedFile.size,
        resultFilename: outFilename,
        resultSize: blob.size,
        recipientOrSender: contact.name || contact.email,
        signed: signEnabled && !!privateKey,
      });

      touchContact(contact.email);
      showToast('File encrypted!', 'success');
    } catch (e) {
      showToast('Encryption failed: ' + (e as Error).message, 'error');
    } finally {
      setEncrypting(false);
    }
  }

  function handleDownload() {
    if (!result) return;
    const subDir = 'encrypted/' + sanitizeFolderName(contact.email || 'unknown');
    saveToFolder(result.blob, result.filename, subDir, folderHandle);
  }

  function handleReset() {
    setSelectedFile(null);
    setResult(null);
  }

  const fingerprint = publicKey
    ? publicKey.getFingerprint().toUpperCase().match(/.{1,4}/g)?.join(' ') ?? ''
    : '';

  async function handleEmailInstructions() {
    if (!result || !contact.email) return;
    const senderName = userInfo || 'Someone';
    try {
      await sendDecryptInstructions({
        recipientEmail: contact.email,
        senderName,
        filename: result.originalFile.name,
      });
      showToast('Decrypt instructions sent!', 'success');
    } catch {
      showToast('Could not send instructions email', 'error');
    }
  }

  if (result) {
    return (
      <div className="encrypt-panel">
        <ResultState
          type="encrypt"
          ownerName={contact.name || contact.email}
          originalFile={result.originalFile}
          resultFile={{ name: result.filename, size: result.blob.size }}
          onDownload={handleDownload}
          onReset={handleReset}
        />
        {contact.email && (
          <button onClick={handleEmailInstructions} className="btn-sm btn-ghost-sm" style={{ marginTop: '0.75rem', width: '100%', justifyContent: 'center' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ marginRight: 4 }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2"/><polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2"/></svg>
            Email decrypt instructions to {contact.name || contact.email}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="encrypt-panel animate-fade-in">
      <div className="encrypt-panel-header">
        <div>
          <p className="encrypt-panel-label">Encrypting for</p>
          <p className="encrypt-panel-name">{contact.name || contact.email}</p>
          <p className="encrypt-panel-fp">
            {contact.fingerprint ? (
              <>
                Fingerprint: {contact.fingerprint}
                <span
                  className="fp-tooltip-anchor"
                  title="This is a unique ID for their encryption key. It confirms you have the right key for this person — like a phone number you can verify."
                >
                  {' '}?
                </span>
              </>
            ) : contact.email}
          </p>
        </div>
        <button onClick={onClose} className="btn-ghost-sm">&times; change</button>
      </div>

      {!selectedFile ? (
        <FileDropZone onFile={setSelectedFile} autoFocus />
      ) : (
        <FileSelectedCard file={selectedFile} variant="encrypt" onRemove={() => setSelectedFile(null)} />
      )}

      <div className="sign-row">
        <input
          type="checkbox"
          id="quick-sign-react"
          className="rounded border-gray-300"
          checked={signEnabled}
          disabled={!privateKey && !signEnabled}
          aria-describedby={!privateKey ? 'quick-sign-unavailable' : undefined}
          onChange={(e) => setSignEnabled(e.target.checked)}
        />
        <label htmlFor="quick-sign-react" className="text-xs text-gray-500 cursor-pointer">
          Prove it came from me <span className="text-gray-400">(optional — lets the recipient verify you sent this)</span>
        </label>
      </div>
      {!privateKey && <p id="quick-sign-unavailable" className="text-xs mb-3">Signing is unavailable until you load your private key. You can still encrypt without a signature.</p>}
      {signEnabled && (
        <div className="mb-3">
          {privateKey ? (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <p className="text-sm font-medium text-green-800">Signing as: {userInfo || 'Unknown'}</p>
              <p className="text-xs text-green-600 font-mono mt-1">Fingerprint: {fingerprint}</p>
            </div>
          ) : (
            <NoticeBox variant="warn">
              <p style={{ fontSize: '0.75rem', color: '#92400e', margin: 0 }}>
                No private key loaded. Set up your keys in <button onClick={() => $activeTab.set('keyring')} className="link-inline">My Key Ring</button> first.
              </p>
            </NoticeBox>
          )}
        </div>
      )}

      <ActionButton
        onClick={handleEncrypt}
        disabled={!selectedFile || (signEnabled && !privateKey)}
        loading={encrypting}
        loadingText="Encrypting..."
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        {signEnabled ? 'Encrypt & Sign' : 'Encrypt File'}
      </ActionButton>
    </div>
  );
}
