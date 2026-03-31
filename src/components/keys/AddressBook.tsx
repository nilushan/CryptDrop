import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { $contacts, saveContact } from '../../stores/contacts';
import { showToast } from '../../stores/toast';
import ContactKeyList from './ContactKeyList';
import KeyLookupCard from '../shared/KeyLookupCard';
import InviteBox from '../shared/InviteBox';
import type { KeyLookupResult } from '../shared/KeyLookupCard';

export default function AddressBook() {
  const contacts = useStore($contacts);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [newContactPrompt, setNewContactPrompt] = useState<{ email: string; suggestedName: string } | null>(null);
  const [newContactName, setNewContactName] = useState('');

  function handleKeyFound(result: KeyLookupResult) {
    setShowInvite(false);
    const isNew = !contacts.find((c) => c.email === result.email);

    if (isNew && !result.name) {
      // Key found but no name in the UID — prompt user to name the contact
      setNewContactPrompt({ email: result.email, suggestedName: '' });
      setNewContactName('');
    } else {
      setNewContactPrompt(null);
      showToast('Contact added!', 'success');
    }
  }

  function handleNotFound(email: string) {
    setInviteEmail(email);
    setShowInvite(true);
  }

  function handleSaveNewContactName() {
    if (!newContactPrompt) return;
    const existing = contacts.find((c) => c.email === newContactPrompt.email);
    if (existing) {
      saveContact(existing.email, newContactName || existing.name, existing.armoredPublicKey, existing.fingerprint);
    }
    setNewContactPrompt(null);
    showToast('Contact saved!', 'success');
  }

  return (
    <div>
      {/* Section label */}
      <div className="keys-section-label keys-public-label">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        Address Book
        <span className="keys-section-badge keys-public-badge">Manage your contacts' public keys</span>
      </div>

      {/* Add contact card */}
      <div className="public-key-card mb-4">
        <KeyLookupCard
          title="Add a Contact"
          description="Search for someone by email on the public keyserver, or import their key file directly."
          onKeyFound={handleKeyFound}
          onNotFound={handleNotFound}
          saveToContacts
          showCard={false}
        />

        {/* New contact detected prompt */}
        {newContactPrompt && (
          <div className="animate-fade-in" style={{
            background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '0.75rem',
            padding: '1rem', marginTop: '0.75rem',
          }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, color: '#4f46e5', marginTop: '0.125rem' }}>
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                <path d="M23 11h-6M20 8v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#312e81', margin: '0 0 0.25rem' }}>New padlock detected!</p>
                <p style={{ fontSize: '0.75rem', color: '#4338ca', margin: '0 0 0.5rem' }}>{newContactPrompt.email}</p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Name (e.g., Alice)"
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    style={{
                      flex: 1, fontSize: '0.8125rem', padding: '0.375rem 0.625rem',
                      borderRadius: '0.375rem', border: '1px solid #c7d2fe',
                      outline: 'none',
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveNewContactName(); }}
                  />
                  <button
                    onClick={handleSaveNewContactName}
                    style={{
                      background: '#4f46e5', color: '#fff', fontSize: '0.8125rem',
                      fontWeight: 600, padding: '0.375rem 0.75rem', borderRadius: '0.375rem',
                      border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                    }}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showInvite && (
          <InviteBox email={inviteEmail} className="mt-4" />
        )}
      </div>

      {/* Saved contacts list */}
      <div className="public-key-card">
        <p className="public-key-desc" style={{ marginBottom: '0.75rem' }}>
          {contacts.length > 0
            ? 'Your saved contacts — their public keys are stored locally in your browser.'
            : ''}
        </p>
        <ContactKeyList />
      </div>
    </div>
  );
}
