import { useId, useState } from 'react';
import { useStore } from '@nanostores/react';
import { $contacts, saveContact } from '../../stores/contacts';
import { showToast } from '../../stores/toast';
import ContactKeyList from './ContactKeyList';
import FormField from '../shared/FormField';
import NoticeBox from '../shared/NoticeBox';
import ActionButton from '../shared/ActionButton';
import KeyLookupWithInvite from '../shared/KeyLookupWithInvite';
import type { KeyLookupResult } from '../shared/KeyLookupCard';

export default function AddressBook() {
  const nameId = useId();
  const contacts = useStore($contacts);
  const [newContactPrompt, setNewContactPrompt] = useState<{ email: string; suggestedName: string } | null>(null);
  const [newContactName, setNewContactName] = useState('');

  function handleKeyFound(result: KeyLookupResult) {
    const isNew = !contacts.find((c) => c.email === result.email);

    if (isNew && !result.name) {
      setNewContactPrompt({ email: result.email, suggestedName: '' });
      setNewContactName('');
    } else {
      setNewContactPrompt(null);
      showToast('Contact added!', 'success');
    }
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
        <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        Address Book
        <span className="keys-section-badge keys-public-badge">Manage your contacts' public keys</span>
      </div>

      {/* Add contact card */}
      <div className="public-key-card mb-4">
        <KeyLookupWithInvite
          title="Add a Contact"
          description="Search for someone by email on the public keyserver, or import their key file directly."
          onKeyFound={handleKeyFound}
          saveToContacts
          showCard={false}
        />

        {/* New contact detected prompt */}
        {newContactPrompt && (
          <NoticeBox variant="info" className="mt-3 animate-fade-in">
            <p className="text-sm font-semibold">New padlock detected!</p>
            <p className="text-xs mb-3">{newContactPrompt.email}</p>
            <FormField id={nameId} label="Contact name (optional)">
              <div className="field-action-row">
                <input id={nameId} type="text" placeholder="e.g., Alice" className="input w-full"
                  value={newContactName} onChange={(e) => setNewContactName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveNewContactName(); }} />
                <ActionButton onClick={handleSaveNewContactName} className="btn-primary">Save</ActionButton>
              </div>
            </FormField>
          </NoticeBox>
        )}

      </div>

      {/* Saved contacts list */}
      <div className="public-key-card">
        <p className="public-key-desc mb-3">
          {contacts.length > 0
            ? 'Your saved contacts — their public keys are stored locally in your browser.'
            : ''}
        </p>
        <ContactKeyList />
      </div>
    </div>
  );
}
