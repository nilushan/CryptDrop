import { useState } from 'react';
import PrivateKeyPanel from './PrivateKeyPanel';
import AddressBook from './AddressBook';

type Subtab = 'keyring' | 'addressbook';

export default function KeysTab() {
  const [subtab, setSubtab] = useState<Subtab>('keyring');

  return (
    <div>
      <div className="tab-header">
        <div>
          <h2 className="tab-title">Your Keys</h2>
          <p className="tab-subtitle">Manage your key ring and address book. Everything stays in your browser.</p>
        </div>
      </div>

      <div className="keys-subtab-bar mb-5">
        <button
          className={`keys-subtab keys-subtab-private${subtab === 'keyring' ? ' active' : ''}`}
          onClick={() => setSubtab('keyring')}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          My Key Ring
        </button>
        <button
          className={`keys-subtab keys-subtab-public${subtab === 'addressbook' ? ' active' : ''}`}
          onClick={() => setSubtab('addressbook')}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          Address Book
        </button>
      </div>

      {subtab === 'keyring' && (
        <PrivateKeyPanel onViewPublic={() => setSubtab('addressbook')} />
      )}

      {subtab === 'addressbook' && (
        <AddressBook />
      )}
    </div>
  );
}
