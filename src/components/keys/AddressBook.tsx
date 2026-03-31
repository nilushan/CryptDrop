import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { $contacts, saveContact } from '../../stores/contacts';
import { showToast } from '../../stores/toast';
import { lookupKeyByEmail, parseUserId } from '../../lib/openpgp-helpers';
import * as openpgp from 'openpgp';
import ContactKeyList from './ContactKeyList';

export default function AddressBook() {
  const contacts = useStore($contacts);
  const [email, setEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [status, setStatus] = useState<{ type: 'success'; text: string; sub?: string } | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [newContactPrompt, setNewContactPrompt] = useState<{ email: string; suggestedName: string } | null>(null);
  const [newContactName, setNewContactName] = useState('');

  async function handleLookup() {
    if (!email.trim()) { showToast('Enter an email address', 'warning'); return; }
    setSearching(true);
    setShowInvite(false);
    setStatus(null);
    try {
      const result = await lookupKeyByEmail(email.trim());
      if (!result) {
        setShowInvite(true);
        showToast('Not found on keyserver', 'warning');
        return;
      }
      const parsed = parseUserId(result.key);
      const isNew = !contacts.find((c) => c.email === email.trim());
      saveContact(email.trim(), parsed.name, result.armored, parsed.fingerprint);

      if (isNew && !parsed.name) {
        // Key found but no name in the UID — prompt user to name the contact
        setNewContactPrompt({ email: email.trim(), suggestedName: '' });
        setNewContactName('');
        setStatus(null);
      } else {
        setNewContactPrompt(null);
        setStatus({ type: 'success', text: 'Added: ' + (parsed.name || email.trim()), sub: 'Fingerprint: ' + parsed.fingerprint });
      }
      setEmail('');
      showToast('Contact added!', 'success');
    } catch (e) {
      showToast('Lookup failed: ' + (e as Error).message, 'error');
    } finally {
      setSearching(false);
    }
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const key = await openpgp.readKey({ armoredKey: text });
      const parsed = parseUserId(key);
      const isNew = parsed.email && !contacts.find((c) => c.email === parsed.email);

      if (parsed.email) {
        saveContact(parsed.email, parsed.name, text, parsed.fingerprint);
      }

      setShowInvite(false);

      if (isNew && parsed.email) {
        // Show "New padlock detected!" prompt to name the contact
        setNewContactPrompt({ email: parsed.email, suggestedName: parsed.name });
        setNewContactName(parsed.name);
        setStatus(null);
        showToast('New contact key detected!', 'success');
      } else {
        setNewContactPrompt(null);
        setStatus({ type: 'success', text: 'Updated: ' + (parsed.name || parsed.email || parsed.uid), sub: 'Fingerprint: ' + parsed.fingerprint });
        showToast('Contact key updated', 'success');
      }
    } catch (err) {
      showToast('Import failed: ' + (err as Error).message, 'error');
    }
    e.target.value = '';
  }

  function handleSaveNewContactName() {
    if (!newContactPrompt) return;
    // Re-save with the user's chosen name
    const existing = contacts.find((c) => c.email === newContactPrompt.email);
    if (existing) {
      saveContact(existing.email, newContactName || existing.name, existing.armoredPublicKey, existing.fingerprint);
    }
    setStatus({ type: 'success', text: 'Added: ' + (newContactName || newContactPrompt.email) });
    setNewContactPrompt(null);
    showToast('Contact saved!', 'success');
  }

  function handleCopyInvite() {
    const text = `Hi! I want to send you an encrypted file.\n\n1. Go to: ${window.location.origin}/app\n2. Go to Keys tab and generate your keys\n3. Publish your public key to the keyserver\n4. Let me know when done — I'll search for your email!`;
    navigator.clipboard.writeText(text).then(() => showToast('Copied!', 'success'));
  }

  function handleSendInviteEmail() {
    const subject = encodeURIComponent('Set up encrypted file sharing with CryptDrop');
    const body = encodeURIComponent(
      `Hi!\n\nI'd like to send you encrypted files via CryptDrop.\n\nTo get started:\n1. Go to: ${window.location.origin}/app\n2. Open the Keys tab and generate your key pair\n3. Click "Publish" to make your key searchable\n4. Reply to let me know — I'll find you by email!\n\nIt only takes a minute. Your private key stays on your device.`,
    );
    window.open('mailto:' + encodeURIComponent(email.trim()) + '?subject=' + subject + '&body=' + body);
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
        <h3 className="card-title" style={{ color: '#065f46' }}>Add a Contact</h3>
        <p className="text-xs text-gray-500 mb-4">Search for someone by email on the public keyserver, or import their key file directly.</p>

        <div className="flex gap-2 mb-3">
          <input
            type="email"
            placeholder="recipient@email.com"
            className="input flex-1"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleLookup(); }}
          />
          <button onClick={handleLookup} disabled={searching} className="btn-primary whitespace-nowrap">
            {searching ? 'Searching...' : 'Find Key'}
          </button>
        </div>

        <div className="divider">or</div>

        <label className="drop-zone drop-zone-sm block">
          <input type="file" accept=".asc,.key,.pgp,.gpg" className="hidden" onChange={handleImportFile} />
          <p className="text-sm text-gray-500">Import a public key file (.asc, .key)</p>
        </label>

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

        {/* Status feedback */}
        {status && (
          <div className="mt-3 bg-green-50 border border-green-200 rounded-md p-3">
            <p className="text-sm font-medium text-green-800">{status.text}</p>
            {status.sub && <p className="text-xs text-green-600 font-mono mt-1">{status.sub}</p>}
          </div>
        )}

        {/* Invite box (when not found on keyserver) */}
        {showInvite && (
          <div className="notice-box notice-warn mt-4">
            <h4 className="text-sm font-semibold text-amber-900 mb-2">Not found on keyserver</h4>
            <p className="text-xs text-amber-800 mb-3">They need to set up their own keys first. Send them an invitation:</p>
            <div className="flex gap-2">
              <button onClick={handleSendInviteEmail} className="btn-sm" style={{ background: '#d97706' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ marginRight: 4 }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2"/><polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2"/></svg>
                Send Invite Email
              </button>
              <button onClick={handleCopyInvite} className="btn-sm btn-ghost-sm">
                Copy Instructions
              </button>
            </div>
          </div>
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
