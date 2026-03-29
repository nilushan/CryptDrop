import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { $contacts, saveContact } from '../../stores/contacts';
import { showToast } from '../../stores/toast';
import { lookupKeyByEmail, parseUserId } from '../../lib/openpgp-helpers';
import type { PublicKey } from 'openpgp';
import * as openpgp from 'openpgp';

interface Props {
  onRecipientReady: (key: PublicKey, info: RecipientInfo) => void;
}

export default function WizardEncryptRecipient({ onRecipientReady }: Props) {
  const contacts = useStore($contacts);
  const [email, setEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'warning'; text: string; sub?: string } | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [recipientReady, setRecipientReady] = useState(false);

  async function handleLookup() {
    if (!email.trim()) { showToast('Enter a recipient email', 'warning'); return; }
    setSearching(true);
    setShowInvite(false);
    setRecipientReady(false);
    try {
      const result = await lookupKeyByEmail(email.trim());
      if (!result) {
        setStatus(null);
        setShowInvite(true);
        showToast('Recipient not found on keyserver', 'warning');
        return;
      }
      const parsed = parseUserId(result.key);
      saveContact(email.trim(), parsed.name, result.armored, parsed.fingerprint);
      setStatus({ type: 'success', text: 'Key found: ' + parsed.uid, sub: 'Fingerprint: ' + parsed.fingerprint });
      setRecipientReady(true);
      onRecipientReady(result.key, { email: email.trim(), name: parsed.name, fingerprint: parsed.fingerprint });
      showToast('Recipient key found!', 'success');
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
      if (parsed.email) saveContact(parsed.email, parsed.name, text, parsed.fingerprint);
      setStatus({ type: 'success', text: 'Key imported: ' + parsed.uid, sub: 'Fingerprint: ' + parsed.fingerprint });
      setShowInvite(false);
      setRecipientReady(true);
      onRecipientReady(key, { email: parsed.email, name: parsed.name, fingerprint: parsed.fingerprint });
      showToast('Recipient key imported', 'success');
    } catch (e) {
      showToast('Import failed: ' + (e as Error).message, 'error');
    }
  }

  async function handleSelectContact(c: typeof contacts[0]) {
    try {
      const key = await openpgp.readKey({ armoredKey: c.armoredPublicKey });
      setEmail(c.email);
      setStatus({ type: 'success', text: 'Recipient: ' + (c.name || c.email), sub: c.fingerprint ? 'Fingerprint: ' + c.fingerprint : undefined });
      setShowInvite(false);
      setRecipientReady(true);
      onRecipientReady(key, { email: c.email, name: c.name, fingerprint: c.fingerprint });
      showToast('Loaded saved recipient', 'success');
    } catch {
      showToast('Failed to load saved key — try refreshing', 'error');
    }
  }

  function handleCopyInvite() {
    const text = `Hi! I want to send you an encrypted file.\n\n1. Go to: ${window.location.origin}/app\n2. Choose "Wizard" → Encrypt to create your keys\n3. Share your public key with me\n4. Let me know when done!`;
    navigator.clipboard.writeText(text).then(() => showToast('Copied!', 'success'));
  }

  return (
    <div className="fade-in">
      {/* Saved contacts */}
      {contacts.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <p className="text-xs font-medium text-gray-500 mb-2">Saved Recipients</p>
          {contacts.map((c) => (
            <div key={c.email} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-md px-3 py-2 mb-1">
              <button type="button" className="flex-1 text-left cursor-pointer bg-transparent border-0 p-0" onClick={() => handleSelectContact(c)}>
                <span className="text-sm font-medium text-gray-800 block">{c.name || c.email}</span>
                {c.name && <span className="text-xs text-gray-500 block">{c.email}</span>}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h3 className="card-title">Find Recipient's Public Key</h3>
        <p className="text-xs text-gray-500 mb-4">You need their public key (their open padlock) to lock the file so only they can open it.</p>
        <div className="flex gap-2 mb-3">
          <input type="email" placeholder="recipient@email.com" className="input flex-1" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button onClick={handleLookup} disabled={searching} className="btn-primary whitespace-nowrap">
            {searching ? 'Searching…' : 'Find Their Key'}
          </button>
        </div>
        <div className="divider">or</div>
        <label className="drop-zone drop-zone-sm block">
          <input type="file" accept=".asc,.key,.pgp,.gpg" className="hidden" onChange={handleImportFile} />
          <p className="text-sm text-gray-500">Import recipient's public key file</p>
        </label>
        {status && (
          <div className={`mt-3 ${status.type === 'success' ? 'bg-green-50 border border-green-200' : ''} rounded-md p-3`}>
            <p className={`text-sm font-medium ${status.type === 'success' ? 'text-green-800' : 'text-amber-800'}`}>{status.text}</p>
            {status.sub && <p className="text-xs text-green-600 font-mono mt-1">{status.sub}</p>}
          </div>
        )}
      </div>

      {showInvite && (
        <div className="notice-box notice-warn mt-4">
          <h4 className="text-sm font-semibold text-amber-900 mb-2">Recipient not found on keyserver</h4>
          <p className="text-xs text-amber-800 mb-3">They need to set up their own keys first. Share these instructions:</p>
          <div className="code-block mb-3">{`Hi! I want to send you an encrypted file.\n\n1. Go to: ${typeof window !== 'undefined' ? window.location.origin : ''}/app\n2. Choose "Wizard" → Encrypt to create your keys\n3. Share your public key with me\n4. Let me know when done!`}</div>
          <button onClick={handleCopyInvite} className="btn-sm">Copy Instructions</button>
        </div>
      )}

      {recipientReady && (
        <div className="mt-4">
          <button onClick={() => {/* parent handles advance via onRecipientReady already called */}} className="btn-primary w-full" style={{ display: 'none' }}>
            {/* Auto-advanced by parent when onRecipientReady fires */}
          </button>
        </div>
      )}
    </div>
  );
}
