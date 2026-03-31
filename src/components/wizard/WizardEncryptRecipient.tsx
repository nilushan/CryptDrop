import { useState } from 'react';
import { showToast } from '../../stores/toast';
import type { Contact } from '../../stores/contacts';
import type { PublicKey } from 'openpgp';
import * as openpgp from 'openpgp';
import ContactListPicker from '../shared/ContactListPicker';
import KeyLookupCard from '../shared/KeyLookupCard';
import InviteBox from '../shared/InviteBox';
import type { KeyLookupResult } from '../shared/KeyLookupCard';

interface Props {
  onRecipientReady: (key: PublicKey, info: RecipientInfo) => void;
}

export default function WizardEncryptRecipient({ onRecipientReady }: Props) {
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  function handleKeyFound(result: KeyLookupResult) {
    setShowInvite(false);
    onRecipientReady(result.key, { email: result.email, name: result.name, fingerprint: result.fingerprint });
    showToast('Recipient key found!', 'success');
  }

  function handleNotFound(email: string) {
    setInviteEmail(email);
    setShowInvite(true);
  }

  async function handleSelectContact(c: Contact) {
    try {
      const key = await openpgp.readKey({ armoredKey: c.armoredPublicKey });
      setShowInvite(false);
      onRecipientReady(key, { email: c.email, name: c.name, fingerprint: c.fingerprint });
      showToast('Loaded saved recipient', 'success');
    } catch {
      showToast('Failed to load saved key — try refreshing', 'error');
    }
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
