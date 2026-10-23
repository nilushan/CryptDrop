import { formatSize } from '../../lib/file-helpers';
import LockIllustration from './LockIllustration';
import SignatureResult from './SignatureResult';

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
  const isResult = variant === 'result';
  const bg = isResult ? '#f0fdf4' : '#f8fafc';
  const border = isResult ? '#bbf7d0' : '#e2e8f0';
  const labelColor = isResult ? '#166534' : '#64748b';

  return (
    <div style={{
      background: bg, border: `1px solid ${border}`, borderRadius: '0.75rem',
      padding: '0.875rem 1rem', flex: 1, minWidth: 0,
    }}>
      <p style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: labelColor, margin: '0 0 0.5rem' }}>
        {label}
      </p>
      <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#0f172a', margin: '0 0 0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {file.name}
      </p>
      <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
        {formatSize(file.size)}
      </p>
    </div>
  );
}

export default function ResultState({
  type,
  ownerName,
  originalFile,
  resultFile,
  onDownload,
  onReset,
  signatureText,
  children,
}: Props) {
  const title = type === 'encrypt' ? 'File Locked!' : 'File Unlocked!';

  return (
    <div className="animate-fade-in" style={{ textAlign: 'center', padding: '1rem 0' }}>
      <LockIllustration ownerName={ownerName} animationType={type === 'encrypt' ? 'lock' : 'unlock'} />

      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '0.75rem 0 1rem' }}>
        {title}
      </h3>

      {/* Before / After comparison */}
      <div style={{
        display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem',
        textAlign: 'left',
      }}>
        <FileCard
          file={originalFile}
          label={type === 'encrypt' ? 'Original' : 'Encrypted'}
          variant="source"
        />
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, color: '#94a3b8' }}>
          <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <FileCard
          file={resultFile}
          label={type === 'encrypt' ? 'Encrypted' : 'Decrypted'}
          variant="result"
        />
      </div>

      {/* Signature result (decrypt only) */}
      {signatureText && <SignatureResult signatureText={signatureText} />}

      {/* Download button */}
      <button
        className="result-download"
        onClick={onDownload}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          background: '#0f172a', color: '#fff', border: 'none', borderRadius: '0.75rem',
          padding: '0.75rem 1.5rem', fontSize: '0.875rem', fontWeight: 600,
          cursor: 'pointer', transition: 'background 0.15s', marginBottom: '0.75rem',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#1e293b'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = '#0f172a'; }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span>Download {resultFile.name}</span>
      </button>

      <div>
        <button onClick={onReset} className="btn-sm btn-ghost-sm">
          {type === 'encrypt' ? 'Lock another file' : 'Unlock another file'}
        </button>
        {children}
      </div>
    </div>
  );
}
