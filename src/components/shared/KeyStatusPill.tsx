import { useStore } from '@nanostores/react';
import { $privateKey, $userInfo } from '../../stores/keys';
import { $activeTab } from '../../stores/activeTab';

export default function KeyStatusPill() {
  const privateKey = useStore($privateKey);
  const userInfo = useStore($userInfo);
  const loaded = !!privateKey;

  // Parse name and email from userInfo like "Alice Smith <alice@example.com>"
  let displayName = '';
  let displayEmail = '';
  if (userInfo) {
    const match = userInfo.match(/^(.+?)\s*<(.+)>$/);
    if (match) {
      displayName = match[1].trim();
      displayEmail = match[2].trim();
    } else {
      displayName = userInfo;
    }
  }

  function handleClick() {
    $activeTab.set('keyring');
  }

  if (!loaded) {
    return (
      <button onClick={handleClick} className="key-status-bar key-status-empty">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        <span>No private key loaded<br /><strong>Set up your keys →</strong></span>
      </button>
    );
  }

  return (
    <button onClick={handleClick} className="key-status-bar key-status-loaded">
      <div className="key-status-avatar">
        {displayName.charAt(0).toUpperCase() || displayEmail.charAt(0).toUpperCase() || 'K'}
      </div>
      <div className="key-status-info">
        <span className="key-status-name">{displayName || displayEmail}</span>
        {displayEmail && displayName && (
          <span className="key-status-email">{displayEmail}</span>
        )}
      </div>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
        <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
      </svg>
    </button>
  );
}
