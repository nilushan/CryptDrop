import { downloadTextFile } from '../../lib/file-helpers';

interface Props {
  userInfo: string;
  fingerprint: string;
  armoredPrivate: string | null;
  onReplace: () => void;
  onViewPublic: () => void;
}

export default function KeyLoadedView({ userInfo, fingerprint, armoredPrivate, onReplace, onViewPublic }: Props) {
  function handleDownloadPrivate() {
    if (armoredPrivate) {
      downloadTextFile(armoredPrivate, 'private_key.asc');
    }
  }

  return (
    <div>
      <div className="private-key-card mb-4">
        <div className="private-key-vault-row">
          <div className="private-key-vault-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2.5"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/><circle cx="12" cy="16" r="1.5" fill="currentColor"/></svg>
          </div>
          <div className="private-key-vault-info">
            <p className="private-key-uid">{userInfo || 'Unknown'}</p>
            <p className="private-key-fp">Fingerprint: {fingerprint}</p>
          </div>
          <div className="private-key-vault-status">
            <span className="vault-loaded-badge">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
              Loaded
            </span>
          </div>
        </div>

        <div className="private-key-warning-strip">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{flexShrink:0}}><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span>This key lives only in your browser's memory and is erased when you close this tab. We intentionally don't save it — browser storage can be read by malicious scripts or extensions. <strong>Back it up securely</strong> — if you lose it, you cannot decrypt files sent to you.</span>
        </div>

        <div className="private-key-actions">
          <button onClick={handleDownloadPrivate} className="btn-vault-action">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Download Private Key
          </button>
          <button onClick={onReplace} className="btn-vault-secondary">
            Replace keys
          </button>
        </div>
      </div>

      <div className="keys-public-cta" onClick={onViewPublic}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/><path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        <div>
          <p className="keys-public-cta-title">Your public key is ready to share</p>
          <p className="keys-public-cta-desc">Download, copy, email, or publish it to a keyserver.</p>
        </div>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{flexShrink:0}}><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
    </div>
  );
}
