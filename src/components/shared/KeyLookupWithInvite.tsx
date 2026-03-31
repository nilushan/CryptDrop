import { useState } from 'react';
import KeyLookupCard from './KeyLookupCard';
import InviteBox from './InviteBox';
import type { KeyLookupResult } from './KeyLookupCard';

interface Props {
  /** KeyLookupCard title */
  title?: string;
  /** KeyLookupCard description */
  description?: string;
  /** Placeholder for email input */
  placeholder?: string;
  /** Button label */
  buttonText?: string;
  /** Called when a key is found */
  onKeyFound: (result: KeyLookupResult) => void;
  /** Save to contacts (default true) */
  saveToContacts?: boolean;
  /** Show card wrapper on KeyLookupCard (default true) */
  showCard?: boolean;
  /** InviteBox title override */
  inviteTitle?: string;
  /** InviteBox description override */
  inviteDescription?: string;
  /** Extra CSS class on invite box */
  inviteClassName?: string;
}

export default function KeyLookupWithInvite({
  title,
  description,
  placeholder,
  buttonText,
  onKeyFound,
  saveToContacts = true,
  showCard = true,
  inviteTitle,
  inviteDescription,
  inviteClassName = 'mt-4',
}: Props) {
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  function handleKeyFound(result: KeyLookupResult) {
    setShowInvite(false);
    onKeyFound(result);
  }

  function handleNotFound(email: string) {
    setInviteEmail(email);
    setShowInvite(true);
  }

  return (
    <>
      <KeyLookupCard
        title={title}
        description={description}
        placeholder={placeholder}
        buttonText={buttonText}
        onKeyFound={handleKeyFound}
        onNotFound={handleNotFound}
        saveToContacts={saveToContacts}
        showCard={showCard}
      />
      {showInvite && (
        <InviteBox
          email={inviteEmail}
          title={inviteTitle}
          description={inviteDescription}
          className={inviteClassName}
        />
      )}
    </>
  );
}
