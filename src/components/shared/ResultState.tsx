import { formatSize } from '../../lib/file-helpers';
import LockIllustration from './LockIllustration';
import SignatureResult from './SignatureResult';
import ActionButton from './ActionButton';

interface FileInfo {
  name: string;
  size: number;
}

interface Props {
  type: 'encrypt' | 'decrypt';
  ownerName: string;
  originalFile: FileInfo;
  resultFile: FileInfo;
  onDownload: () => void;
  onReset: () => void;
  signatureText?: string;
  children?: React.ReactNode;
}

function FileCard({ file, label, variant }: { file: FileInfo; label: string; variant: 'source' | 'result' }) {
  return (
    <div className={`result-file result-file-${variant}`}>
      <p className="result-file-label">{label}</p>
      <p className="result-file-name">{file.name}</p>
      <p className="result-file-size">{formatSize(file.size)}</p>
    </div>
  );
}

export default function ResultState({ type, ownerName, originalFile, resultFile, onDownload, onReset, signatureText, children }: Props) {
  return (
    <div className="result-state animate-fade-in">
      <LockIllustration ownerName={ownerName} animationType={type === 'encrypt' ? 'lock' : 'unlock'} />
      <h3 aria-live="polite" aria-atomic="true" className="result-title">{type === 'encrypt' ? 'File Locked!' : 'File Unlocked!'}</h3>
      <div className="result-comparison">
        <FileCard file={originalFile} label={type === 'encrypt' ? 'Original' : 'Encrypted'} variant="source" />
        <svg className="result-arrow" aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <FileCard file={resultFile} label={type === 'encrypt' ? 'Encrypted' : 'Decrypted'} variant="result" />
      </div>
      {signatureText && <SignatureResult signatureText={signatureText} />}
      <ActionButton className="btn-primary result-download" onClick={onDownload}>
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>Download {resultFile.name}</span>
      </ActionButton>
      <div className="result-actions">
        <button type="button" onClick={onReset} className="btn-sm btn-ghost-sm">
          {type === 'encrypt' ? 'Lock another file' : 'Unlock another file'}
        </button>
        {children}
      </div>
    </div>
  );
}
