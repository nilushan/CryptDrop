import { useState } from 'react';
import PrivateKeyPanel from './PrivateKeyPanel';
import PublicKeysPanel from './PublicKeysPanel';

type Subtab = 'private' | 'public';

export default function KeysTab() {
  const [subtab, setSubtab] = useState<Subtab>('private');

  return (
    <div>
      <div className="tab-header">
        <div>
          <h2 className="tab-title">Your Keys</h2>
          <p className="tab-subtitle">Manage your private key and public key. Everything stays in your browser.</p>
        </div>
      </div>

      <div className="keys-subtab-bar mb-5">
        <button
          className={`keys-subtab keys-subtab-private${subtab === 'private' ? ' active' : ''}`}
          onClick={() => setSubtab('private')}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Private Key
        </button>
        <button
          className={`keys-subtab keys-subtab-public${subtab === 'public' ? ' active' : ''}`}
          onClick={() => setSubtab('public')}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/><path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          Public Keys
        </button>
      </div>

      {subtab === 'private' && (
        <PrivateKeyPanel onViewPublic={() => setSubtab('public')} />
      )}

      {subtab === 'public' && (
        <PublicKeysPanel onSwitchToPrivate={() => setSubtab('private')} />
      )}
    </div>
  );
}
