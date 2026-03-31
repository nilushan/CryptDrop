import { useStore } from '@nanostores/react';
import { showToast } from '../../stores/toast';
import { $contacts, type Contact } from '../../stores/contacts';
import ContactListPicker from '../shared/ContactListPicker';
import KeyLookupWithInvite from '../shared/KeyLookupWithInvite';
import type { KeyLookupResult } from '../shared/KeyLookupCard';

interface Props {
  onRecipientReady: (contact: Contact) => void;
}

export default function WizardEncryptRecipient({ onRecipientReady }: Props) {
  const contacts = useStore($contacts);

  function handleKeyFound(result: KeyLookupResult) {
    const saved = contacts.find((c) => c.email === result.email);
    if (saved) {
      onRecipientReady(saved);
    } else {
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

  function handleSelectContact(c: Contact) {
    onRecipientReady(c);
    showToast('Loaded saved recipient', 'success');
  }

  return (
    <div className="fade-in">
      <ContactListPicker
        onSelect={handleSelectContact}
        label="Saved Recipients"
        className="bg-white rounded-lg border border-gray-200 p-4 mb-4"
      />

      <KeyLookupWithInvite
        title="Find Recipient's Public Key"
        description="You need their public key (their open padlock) to lock the file so only they can open it."
        placeholder="recipient@email.com"
        buttonText="Find Their Key"
        onKeyFound={handleKeyFound}
        saveToContacts
        inviteTitle="Recipient not found on keyserver"
        inviteDescription="They need to set up their own keys first. Share these instructions:"
      />
    </div>
  );
}
