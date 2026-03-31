import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { showToast } from '../../stores/toast';
import { $contacts, type Contact } from '../../stores/contacts';
import ContactListPicker from '../shared/ContactListPicker';
import KeyLookupCard from '../shared/KeyLookupCard';
import InviteBox from '../shared/InviteBox';
import type { KeyLookupResult } from '../shared/KeyLookupCard';

interface Props {
  onRecipientReady: (contact: Contact) => void;
}

export default function WizardEncryptRecipient({ onRecipientReady }: Props) {
  const contacts = useStore($contacts);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  function handleKeyFound(result: KeyLookupResult) {
    setShowInvite(false);
    // KeyLookupCard already saved to contacts store — look it up
    const saved = contacts.find((c) => c.email === result.email);
    if (saved) {
      onRecipientReady(saved);
    } else {
      // Fallback: construct a Contact-like object from the lookup result
      onRecipientReady({
        email: result.email,
        name: result.name,
        armoredPublicKey: result.armored,
        fingerprint: result.fingerprint,
        lastUpdated: new Date().toISOString(),
      });
    }
    showToast('Recipient key found!', 'success');
  }

  function handleNotFound(email: string) {
    setInviteEmail(email);
    setShowInvite(true);
  }

  function handleSelectContact(c: Contact) {
    setShowInvite(false);
    onRecipientReady(c);
    showToast('Loaded saved recipient', 'success');
  }

  return (
    <div className="fade-in">
      {/* Saved contacts */}
      <ContactListPicker
        onSelect={handleSelectContact}
        label="Saved Recipients"
        className="bg-white rounded-lg border border-gray-200 p-4 mb-4"
      />

      <KeyLookupCard
        title="Find Recipient's Public Key"
        description="You need their public key (their open padlock) to lock the file so only they can open it."
        placeholder="recipient@email.com"
        buttonText="Find Their Key"
        onKeyFound={handleKeyFound}
        onNotFound={handleNotFound}
        saveToContacts
      />

      {showInvite && (
        <InviteBox
          email={inviteEmail}
          title="Recipient not found on keyserver"
          description="They need to set up their own keys first. Share these instructions:"
          className="mt-4"
        />
      )}
    </div>
  );
}
