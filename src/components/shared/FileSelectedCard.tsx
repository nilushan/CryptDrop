import { formatSize } from '../../lib/file-helpers';

interface Props {
  file: File;
  variant?: 'encrypt' | 'decrypt';
  /** When provided, shows a remove button that calls this callback */
  onRemove?: () => void;
}

export default function FileSelectedCard({ file, variant = 'encrypt', onRemove }: Props) {
  const iconClass = variant === 'encrypt' ? 'file-selected-icon-encrypt' : 'file-selected-icon-decrypt';
  const icon = variant === 'encrypt'
    ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
    : <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;

  return (
    <div className="file-selected-card animate-fade-in">
      <div className={`file-selected-icon ${iconClass}`}>{icon}</div>
      <div className="file-selected-info">
        <p className="file-selected-name">{file.name}</p>
        <p className="file-selected-size">{formatSize(file.size)}</p>
      </div>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          title="Remove file"
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem',
            color: '#9ca3af', transition: 'color 0.15s', display: 'flex', alignItems: 'center',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#9ca3af'; }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        </button>
      ) : (
        <svg className="file-selected-check" width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/></svg>
      )}
    </div>
  );
}
