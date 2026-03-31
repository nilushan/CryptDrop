import { useState, useEffect, useRef } from 'react';
import { useStore } from '@nanostores/react';
import { $privateKey, $userInfo } from '../../stores/keys';
import { addHistoryEntry } from '../../stores/history';
import { showToast } from '../../stores/toast';
import { decryptFileData } from '../../lib/openpgp-helpers';
import { sanitizeFolderName, sanitizeDownloadFilename, saveToFolder } from '../../lib/file-helpers';
import type { PublicKey } from 'openpgp';
import * as openpgp from 'openpgp';
import type { Contact } from '../../stores/contacts';
import FileDropZone from './FileDropZone';
import NoticeBox from './NoticeBox';
import ContactListPicker from './ContactListPicker';
import KeyLookupCard from './KeyLookupCard';
import type { KeyLookupResult } from './KeyLookupCard';
import FileSelectedCard from './FileSelectedCard';
import ActionButton from './ActionButton';
import ResultState from './ResultState';

interface Props {
  /** Folder handle for saving decrypted files (null = default Downloads) */
  folderHandle?: FileSystemDirectoryHandle | null;
  /** Extra buttons rendered in the result state */
  resultActions?: React.ReactNode;
}

interface DecryptResult {
  blob: Blob;
  filename: string;
  size: number;
  sigText: string;
  encryptedFile: { name: string; size: number };
}

export default function DecryptFilePanel({ folderHandle = null, resultActions }: Props) {
  const privateKey = useStore($privateKey);
  const userInfo = useStore($userInfo);

  const [encryptedFile, setEncryptedFile] = useState<File | null>(null);
  const [senderKey, setSenderKey] = useState<PublicKey | null>(null);
  const [showLookup, setShowLookup] = useState(false);
  const [decrypting, setDecrypting] = useState(false);
  const [senderEmail, setSenderEmail] = useState('');
  const [result, setResult] = useState<DecryptResult | null>(null);
  const [expirySeconds, setExpirySeconds] = useState<number | null>(null);
  const expiryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const RESULT_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

  useEffect(() => {
    if (result) {
      setExpirySeconds(Math.ceil(RESULT_EXPIRY_MS / 1000));

      countdownTimer.current = setInterval(() => {
        setExpirySeconds((prev) => (prev !== null && prev > 1 ? prev - 1 : 0));
      }, 1000);

      expiryTimer.current = setTimeout(() => {
        setResult(null);
        setExpirySeconds(null);
        showToast('Decrypted file cleared from memory for security', 'info');
      }, RESULT_EXPIRY_MS);
    }

    return () => {
      if (expiryTimer.current) clearTimeout(expiryTimer.current);
      if (countdownTimer.current) clearInterval(countdownTimer.current);
    };
  }, [result]);

  function handleFileSelect(file: File) {
    setEncryptedFile(file);
  }

  async function handleDecrypt() {
    if (!privateKey || !encryptedFile) return;
    setDecrypting(true);
    setResult(null);
    try {
      const fileData = new Uint8Array(await encryptedFile.arrayBuffer());
      const decResult = await decryptFileData(fileData, privateKey, senderKey);
      const outName = sanitizeDownloadFilename(
        decResult.filename || encryptedFile.name.replace(/\.(pgp|gpg|asc)$/, '') || 'decrypted_file',
      );
      const blob = new Blob([decResult.data as BlobPart]);

      setResult({
        blob,
        filename: outName,
        size: decResult.data.byteLength,
        sigText: decResult.signatureText,
        encryptedFile: { name: encryptedFile.name, size: encryptedFile.size },
      });

      addHistoryEntry({
        action: 'decrypt',
        originalFilename: encryptedFile.name,
        originalSize: encryptedFile.size,
        resultFilename: outName,
        resultSize: decResult.data.byteLength,
        recipientOrSender: senderEmail.trim() || 'unknown',
        signed: !!decResult.signatureText,
      });

      showToast('File decrypted!', 'success');
    } catch (e) {
      showToast('Decryption failed: ' + (e as Error).message, 'error');
    } finally {
      setDecrypting(false);
    }
  }

  function handleDownload() {
    if (!result) return;
    const senderLabel = senderEmail.trim() || 'unknown';
    const subDir = 'decrypted/' + sanitizeFolderName(senderLabel);
    saveToFolder(result.blob, result.filename, subDir, folderHandle ?? null);
  }

  function handleRemoveFile() {
    setEncryptedFile(null);
  }

  function handleReset() {
    if (expiryTimer.current) clearTimeout(expiryTimer.current);
    if (countdownTimer.current) clearInterval(countdownTimer.current);
    setEncryptedFile(null);
    setSenderKey(null);
    setSenderEmail('');
    setResult(null);
    setExpirySeconds(null);
    setShowLookup(false);
  }

  async function handleSelectSenderContact(contact: Contact) {
    try {
      const key = await openpgp.readKey({ armoredKey: contact.armoredPublicKey });
      setSenderKey(key);
      setSenderEmail(contact.email);
      showToast('Sender key loaded', 'success');
    } catch {
      showToast('Could not load key for ' + contact.email, 'error');
    }
  }

  function handleSenderKeyFound(lookupResult: KeyLookupResult) {
    setSenderKey(lookupResult.key);
    setSenderEmail(lookupResult.email);
    showToast('Sender key found', 'success');
  }

  if (result) {
    const minutes = expirySeconds !== null ? Math.floor(expirySeconds / 60) : 0;
    const seconds = expirySeconds !== null ? expirySeconds % 60 : 0;

    return (
      <>
        <ResultState
          type="decrypt"
          ownerName={userInfo || 'You'}
          originalFile={result.encryptedFile}
          resultFile={{ name: result.filename, size: result.size }}
          onDownload={handleDownload}
          onReset={handleReset}
          signatureText={result.sigText}
        >
          {resultActions}
        </ResultState>
        {expirySeconds !== null && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
            fontSize: '0.75rem', color: expirySeconds < 60 ? '#dc2626' : '#64748b',
            marginTop: '0.75rem', transition: 'color 0.3s',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Decrypted file clears from memory in {minutes}:{seconds.toString().padStart(2, '0')}
          </div>
        )}
      </>
    );
  }

  return (
    <div>
      {/* File drop */}
      <div className="card mb-4">
        <h3 className="card-title">Encrypted File</h3>
        {!encryptedFile ? (
          <FileDropZone
            onFile={handleFileSelect}
            placeholder="Drop an encrypted file here or click to select (.pgp, .gpg, .asc)"
          />
        ) : (
          <FileSelectedCard file={encryptedFile} variant="decrypt" onRemove={handleRemoveFile} />
        )}
      </div>

      {/* Verify sender */}
      {senderKey ? (
        <NoticeBox variant="success" className="mb-3 animate-fade-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ color: '#16a34a', flexShrink: 0 }}>
              <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#166534' }}>Sender verification key loaded</span>
            <button
              onClick={() => setSenderKey(null)}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#6ee7b7', cursor: 'pointer', padding: '0.125rem', fontSize: '0.75rem' }}
            >
              clear
            </button>
          </div>
        </NoticeBox>
      ) : (
        <div className="card mb-4">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <h3 className="card-title" style={{ margin: '0 0 0.25rem' }}>Verify Sender <span className="text-gray-400 font-normal">(optional)</span></h3>
              <p className="text-xs text-gray-500" style={{ margin: 0 }}>If the file was signed, load the sender's public key to verify their identity.</p>
            </div>
            <button onClick={() => setShowLookup((v) => !v)} className="btn-ghost" style={{ flexShrink: 0 }}>
              {showLookup ? 'Cancel' : '+ New sender'}
            </button>
          </div>

          {!showLookup && (
            <ContactListPicker onSelect={handleSelectSenderContact} />
          )}

          {showLookup && (
            <KeyLookupCard
              placeholder="sender@email.com"
              buttonText="Find Key"
              onKeyFound={handleSenderKeyFound}
              saveToContacts={false}
              showCard={false}
            />
          )}
        </div>
      )}

      <ActionButton
        onClick={handleDecrypt}
        disabled={!privateKey || !encryptedFile}
        loading={decrypting}
        loadingText="Unlocking..."
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M7 11V7a5 5 0 019.9-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        Unlock File
      </ActionButton>
    </div>
  );
}
