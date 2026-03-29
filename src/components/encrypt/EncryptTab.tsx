import { useState, useMemo } from 'react';
import { useStore } from '@nanostores/react';
import { $contacts, removeContact, type Contact } from '../../stores/contacts';
import { $activeTab } from '../../stores/activeTab';
import ContactCard from './ContactCard';
import QuickEncryptPanel from './QuickEncryptPanel';
import FolderBar from '../shared/FolderBar';

export default function EncryptTab() {
  const contacts = useStore($contacts);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [folderHandle, setFolderHandle] = useState<FileSystemDirectoryHandle | null>(null);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const q = searchQuery.toLowerCase();
    return contacts.filter(
      (c) => c.email.toLowerCase().includes(q) || (c.name && c.name.toLowerCase().includes(q)),
    );
  }, [contacts, searchQuery]);

  function handleRemove(email: string) {
    removeContact(email);
    if (selectedContact?.email === email) setSelectedContact(null);
  }

  function handleNewRecipient() {
    $activeTab.set('keys');
  }

  return (
    <div>
      <div className="tab-header">
        <div>
          <h2 className="tab-title">Encrypt a File</h2>
          <p className="tab-subtitle">Select a recipient from your contacts, then drop a file to encrypt it.</p>
        </div>
        <button onClick={handleNewRecipient} className="btn-ghost">
          + New recipient
        </button>
      </div>

      <FolderBar folderHandle={folderHandle} onFolderChange={setFolderHandle} />

      <div className="local-assurance-bar mb-4">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        <span>Encryption happens <strong>entirely in your browser</strong>. Your file is never uploaded to any server.</span>
      </div>

      {/* Search bar */}
      <div className="search-wrap">
        <svg className="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        <input
          type="text"
          placeholder="Search recipients…"
          className="search-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Contact list */}
      {filtered.length > 0 ? (
        <div className="contact-list">
          {filtered.map((c) => (
            <ContactCard
              key={c.email}
              contact={c}
              isSelected={selectedContact?.email === c.email}
              onSelect={() => setSelectedContact(c)}
              onRemove={() => handleRemove(c.email)}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </div>
          <p className="empty-msg">
            {searchQuery ? `No recipients match "${searchQuery}".` : 'No saved recipients yet.'}
          </p>
          <p className="empty-hint">Add recipients in the Address Book — search by email or import a key file.</p>
          <button onClick={handleNewRecipient} className="btn-primary mt-3">Open Address Book &rarr;</button>
        </div>
      )}

      {/* Quick encrypt panel */}
      {selectedContact && (
        <QuickEncryptPanel
          contact={selectedContact}
          folderHandle={folderHandle}
          onClose={() => setSelectedContact(null)}
        />
      )}
    </div>
  );
}
