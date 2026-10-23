import { useStore } from '@nanostores/react';
import { $privateKey, $userInfo } from '../../stores/keys';
import { $activeTab } from '../../stores/activeTab';

export default function KeyStatusPill() {
  const privateKey = useStore($privateKey);
  const userInfo = useStore($userInfo);
  const activeTab = useStore($activeTab);
  const loaded = !!privateKey;
  const description = loaded
    ? `Private key loaded${userInfo ? ` for ${userInfo}` : ''}. Available in this session; this does not confirm a backup.`
    : 'No private key loaded. Encryption is available without signing. Load a matching key to decrypt.';

  return (
    <button type="button" id="nav-keyring" onClick={() => $activeTab.set('keyring')}
      className={`key-status-bar ${loaded ? 'key-status-loaded' : 'key-status-empty'}`}
      aria-controls="tab-keyring" aria-current={activeTab === 'keyring' ? 'page' : undefined}
      aria-label={`My key ring. ${description}`} title={description}>
      <svg className="key-status-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M14 10a5 5 0 10-4 4l3 3h3v3h4v-4l-6-6z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="key-status-copy">
        <span className="key-status-label">My key ring</span>
        <span className="key-status-state">
          <span aria-hidden="true">{loaded ? '✓' : '!'}</span>
          {loaded ? 'Loaded' : 'No private key loaded'}
        </span>
      </span>
      <span className="key-status-arrow" aria-hidden="true">›</span>
    </button>
  );
}
