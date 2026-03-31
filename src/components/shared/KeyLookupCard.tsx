import { useState } from 'react';
import { showToast } from '../../stores/toast';
import { lookupKeyByEmail, parseUserId } from '../../lib/openpgp-helpers';
import { saveContact } from '../../stores/contacts';
import type { PublicKey } from 'openpgp';
import * as openpgp from 'openpgp';

export interface KeyLookupResult {
  key: PublicKey;
  armored: string;
  email: string;
  name: string;
  fingerprint: string;
  uid: string;
}

interface Props {
  /** Card title */
  title?: string;
  /** Description text below title */
  description?: string;
  /** Placeholder for email input */
  placeholder?: string;
  /** Button label */
  buttonText?: string;
  /** Called when a key is found via lookup or file import */
  onKeyFound: (result: KeyLookupResult) => void;
  /** Called when keyserver lookup finds nothing */
  onNotFound?: (email: string) => void;
  /** Automatically save found keys to the contacts store (default true) */
  saveToContacts?: boolean;
  /** CSS class for the card wrapper */
  className?: string;
  /** Whether to show the card wrapper (default true) */
  showCard?: boolean;
}

export default function KeyLookupCard({
  title = 'Find Public Key',
  description = 'Search by email on the public keyserver, or import a key file.',
  placeholder = 'recipient@email.com',
  buttonText = 'Find Key',
  onKeyFound,
  onNotFound,
  saveToContacts: shouldSave = true,
  className,
  showCard = true,
}: Props) {
  const [email, setEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'warning'; text: string; sub?: string } | null>(null);

  async function handleLookup() {
    if (!email.trim()) { showToast('Enter an email address', 'warning'); return; }
    setSearching(true);
    setStatus(null);
    try {
      const result = await lookupKeyByEmail(email.trim());
      if (!result) {
        onNotFound?.(email.trim());
        showToast('Not found on keyserver', 'warning');
        return;
      }
      const parsed = parseUserId(result.key);
      if (shouldSave && parsed.email) {
        saveContact(email.trim(), parsed.name, result.armored, parsed.fingerprint);
      }
      const lookupResult: KeyLookupResult = {
        key: result.key,
        armored: result.armored,
        email: email.trim(),
        name: parsed.name,
        fingerprint: parsed.fingerprint,
        uid: parsed.uid,
      };
      setStatus({ type: 'success', text: 'Key found: ' + (parsed.name || parsed.uid), sub: 'Fingerprint: ' + parsed.fingerprint });
      onKeyFound(lookupResult);
      setEmail('');
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
      if (shouldSave && parsed.email) {
        saveContact(parsed.email, parsed.name, text, parsed.fingerprint);
      }
      const lookupResult: KeyLookupResult = {
        key,
        armored: text,
        email: parsed.email,
        name: parsed.name,
        fingerprint: parsed.fingerprint,
        uid: parsed.uid,
      };
      setStatus({ type: 'success', text: 'Key imported: ' + (parsed.name || parsed.uid), sub: 'Fingerprint: ' + parsed.fingerprint });
      onKeyFound(lookupResult);
    } catch (err) {
      showToast('Import failed: ' + (err as Error).message, 'error');
    }
    e.target.value = '';
  }

  const content = (
    <>
      {title && <h3 className="card-title" style={showCard ? undefined : { color: '#065f46' }}>{title}</h3>}
      {description && <p className="text-xs text-gray-500 mb-4">{description}</p>}

      <div className="flex gap-2 mb-3">
        <input
          type="email"
          placeholder={placeholder}
          className="input flex-1"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleLookup(); }}
        />
        <button onClick={handleLookup} disabled={searching} className="btn-primary whitespace-nowrap">
          {searching ? 'Searching...' : buttonText}
        </button>
      </div>

      <div className="divider">or</div>

      <label className="drop-zone drop-zone-sm block">
        <input type="file" accept=".asc,.key,.pgp,.gpg" className="hidden" onChange={handleImportFile} />
        <p className="text-sm text-gray-500">Import a public key file (.asc, .key)</p>
      </label>

      {status && (
        <div className={`mt-3 ${status.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'} rounded-md p-3`}>
          <p className={`text-sm font-medium ${status.type === 'success' ? 'text-green-800' : 'text-amber-800'}`}>{status.text}</p>
          {status.sub && <p className="text-xs text-green-600 font-mono mt-1">{status.sub}</p>}
        </div>
      )}
    </>
  );

  if (!showCard) {
    return <div className={className}>{content}</div>;
  }

  return <div className={`card ${className ?? ''}`}>{content}</div>;
}
