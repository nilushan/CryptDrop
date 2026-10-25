import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { $contacts, saveContact, type Contact } from '../../stores/contacts';
import { $activeTab } from '../../stores/activeTab';
import { $publicKey, $armoredPublic, $userInfo } from '../../stores/keys';
import QuickEncryptPanel from './QuickEncryptPanel';
import KeyCapabilityNotice from '../shared/KeyCapabilityNotice';
import FolderBar from '../shared/FolderBar';
import ContactListPicker from '../shared/ContactListPicker';
import ActivityHistory from '../shared/ActivityHistory';
import KeyLookupWithInvite from '../shared/KeyLookupWithInvite';
import type { KeyLookupResult } from '../shared/KeyLookupCard';

export default function EncryptTab() {
  const contacts = useStore($contacts);
  const publicKey = useStore($publicKey);
  const armoredPublic = useStore($armoredPublic);
  const userInfo = useStore($userInfo);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showLookup, setShowLookup] = useState(false);
  const [folderHandle, setFolderHandle] = useState<FileSystemDirectoryHandle | null>(null);

  function handleKeyFound(result: KeyLookupResult) {
    setSelectedContact({
      email: result.email, name: result.name, armoredPublicKey: result.armored,
      fingerprint: result.fingerprint, lastUpdated: new Date().toISOString(),
    });
    setShowLookup(false);
  }

  function handleEncryptForMyself() {
    if (!publicKey || !armoredPublic) return;
    const fp = publicKey.getFingerprint().toUpperCase().match(/.{1,4}/g)?.join(' ') ?? '';
    const match = (userInfo || '').match(/^(.+?)\s*<(.+?)>$/);
    const name = match?.[1]?.trim() || userInfo || 'Me';
    const email = match?.[2]?.trim() || '';
    saveContact(email, name, armoredPublic, fp);
    setSelectedContact({ email, name, armoredPublicKey: armoredPublic, fingerprint: fp, lastUpdated: new Date().toISOString() });
  }

  return (
    <div>
      <div className="tab-header">
        <div>
          <h1 className="tab-title">Encrypt a file.</h1>
          <p className="tab-subtitle">Encrypt a file for someone. Only their private key can open it.</p>
        </div>
      </div>

      <KeyCapabilityNotice tool="encrypt" />

      <ol className="workflow-steps" aria-label="Encryption steps">
        <li aria-current={!selectedContact ? 'step' : undefined}><span>01</span> Choose recipient</li>
        <li aria-current={selectedContact ? 'step' : undefined}><span>02</span> Encrypt &amp; download</li>
      </ol>

      {!selectedContact ? (
        <div className="card animate-fade-in">
          <div className="recipient-heading">
            <h2 className="card-title">Who is this file for?</h2>
            {contacts.length > 0 && (
              <button onClick={() => setShowLookup(!showLookup)} className="btn-ghost" aria-expanded={showLookup} aria-controls="encrypt-recipient-lookup">
                {showLookup ? 'Cancel' : '+ Add recipient'}
              </button>
            )}
          </div>
          <p className="recipient-intro">You need their public key, not your own. Find it by email or import a key they shared with you.</p>
          {contacts.length > 0 && <ContactListPicker onSelect={setSelectedContact} showSearch showRecent />}
          {(contacts.length === 0 || showLookup) && (
            <div className="recipient-lookup" id="encrypt-recipient-lookup">
              <KeyLookupWithInvite
                title="" description="" buttonText="Find recipient" showCard={false}
                onKeyFound={handleKeyFound}
              />
            </div>
          )}
          <div className="recipient-alternatives">
            <button onClick={() => $activeTab.set('wizard')} className="btn-ghost">New to encryption? Get guided help →</button>
            {publicKey && <button onClick={handleEncryptForMyself} className="btn-ghost">Encrypt for myself</button>}
          </div>
        </div>
      ) : (
        <QuickEncryptPanel
          contact={selectedContact} folderHandle={folderHandle}
          onClose={() => setSelectedContact(null)}
        />
      )}
      <FolderBar folderHandle={folderHandle} onFolderChange={setFolderHandle} />
      <ActivityHistory />
    </div>
  );
}
