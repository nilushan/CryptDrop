import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { $contacts, type Contact } from '../../stores/contacts';
import { $activeTab } from '../../stores/activeTab';
import QuickEncryptPanel from './QuickEncryptPanel';
import FolderBar from '../shared/FolderBar';
import ContactListPicker from '../shared/ContactListPicker';
import ActivityHistory from '../shared/ActivityHistory';

export default function EncryptTab() {
  const contacts = useStore($contacts);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [folderHandle, setFolderHandle] = useState<FileSystemDirectoryHandle | null>(null);

  function handleSelectContact(c: Contact) {
    setSelectedContact(c);
  }

  function handleClearSelection() {
    setSelectedContact(null);
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

          <ContactListPicker
            onSelect={handleSelectContact}
            showSearch
            showRecent
          />

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

      <ActivityHistory />
    </div>
  );
}
