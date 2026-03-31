import { useState, useMemo } from 'react';
import { useStore } from '@nanostores/react';
import { $contacts, type Contact } from '../../stores/contacts';
import { $activeTab } from '../../stores/activeTab';
import QuickEncryptPanel from './QuickEncryptPanel';
import FolderBar from '../shared/FolderBar';

export default function EncryptTab() {
  const contacts = useStore($contacts);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [folderHandle, setFolderHandle] = useState<FileSystemDirectoryHandle | null>(null);

  // Sort by lastUsed (most recent first), then lastUpdated as fallback
  const sorted = useMemo(() => {
    return [...contacts].sort((a, b) => {
      const aTime = a.lastUsed || a.lastUpdated || '';
      const bTime = b.lastUsed || b.lastUpdated || '';
      return bTime.localeCompare(aTime);
    });
  }, [contacts]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return sorted;
    const q = searchQuery.toLowerCase();
    return sorted.filter(
      (c) => c.email.toLowerCase().includes(q) || (c.name && c.name.toLowerCase().includes(q)),
    );
  }, [sorted, searchQuery]);

  function handleSelectContact(c: Contact) {
    setSelectedContact(c);
    setSearchQuery('');
  }

  function handleClearSelection() {
    setSelectedContact(null);
    setSearchQuery('');
  }

  function handleNewRecipient() {
    $activeTab.set('addressbook');
  }

  return (
    <div>
      <div className="tab-header">
        <div>
          <h2 className="tab-title">Lock a File</h2>
          <p className="tab-subtitle">Select a recipient, then drop a file to encrypt it.</p>
        </div>
      </div>

      <FolderBar folderHandle={folderHandle} onFolderChange={setFolderHandle} />

      {/* Recipient selection */}
      {!selectedContact && (
        <div className="animate-fade-in">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a', margin: '0 0 0.25rem' }}>
                Who are you locking this for?
              </h3>
              <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: 0 }}>
                Select a contact or add a new recipient.
              </p>
            </div>
            <button onClick={handleNewRecipient} className="btn-ghost" style={{ flexShrink: 0 }}>
              + New recipient
            </button>
          </div>

          {/* Search (only shown when there are contacts to filter) */}
          {contacts.length > 0 && (
            <div className="search-wrap" style={{ marginBottom: '0.75rem' }}>
              <svg className="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              <input
                type="text"
                placeholder="Search contacts..."
                className="search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}

          {/* Contact list */}
          {filtered.length > 0 && (
            <div style={{
              border: '1px solid #e2e8f0', borderRadius: '0.75rem',
              overflow: 'hidden', marginBottom: '1rem',
            }}>
              {filtered.map((c, i) => (
                <button
                  key={c.email}
                  type="button"
                  onClick={() => handleSelectContact(c)}
                  className="encrypt-contact-row"
                  style={{
                    borderBottom: i < filtered.length - 1 ? '1px solid #f1f5f9' : 'none',
                  }}
                >
                  <div className="encrypt-contact-avatar">
                    {(c.name || c.email).charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.name || c.email}
                    </p>
                    {c.name && (
                      <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.email}
                      </p>
                    )}
                  </div>
                  {c.lastUsed && (
                    <span className="encrypt-contact-recent">Recent</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Empty state — no contacts at all */}
          {contacts.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </div>
              <p className="empty-msg">No saved recipients yet.</p>
              <p className="empty-hint">Add recipients in the Address Book — search by email or import a key file.</p>
              <button onClick={handleNewRecipient} className="btn-primary mt-3">Open Address Book &rarr;</button>
            </div>
          )}

          {/* No match for search */}
          {searchQuery && filtered.length === 0 && contacts.length > 0 && (
            <div className="empty-state" style={{ padding: '1.5rem' }}>
              <p className="empty-msg">No recipients match "{searchQuery}".</p>
              <button onClick={handleNewRecipient} className="btn-ghost mt-3">Add from Address Book</button>
            </div>
          )}
        </div>
      )}

      {/* Quick encrypt panel (progressive disclosure — only shown after selecting) */}
      {selectedContact && (
        <QuickEncryptPanel
          contact={selectedContact}
          folderHandle={folderHandle}
          onClose={handleClearSelection}
        />
      )}
    </div>
  );
}
