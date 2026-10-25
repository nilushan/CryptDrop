import { useId, useState } from 'react';
import { showToast } from '../../stores/toast';
import { lookupKeyByEmail, parseUserId } from '../../lib/openpgp-helpers';
import { saveContact } from '../../stores/contacts';
import type { PublicKey } from 'openpgp';
import * as openpgp from 'openpgp';
import FileDropZone from './FileDropZone';
import FormField from './FormField';
import ActionButton from './ActionButton';
import NoticeBox from './NoticeBox';

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
  const emailId = useId();
  const [email, setEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'warning' | 'error'; text: string; sub?: string } | null>(null);

  async function handleLookup() {
    if (!email.trim()) {
      setStatus({ type: 'warning', text: 'Enter an email address' });
      showToast('Enter an email address', 'warning');
      return;
    }
    setSearching(true);
    setStatus(null);
    try {
      const result = await lookupKeyByEmail(email.trim());
      if (!result) {
        setStatus({ type: 'warning', text: 'Not found on keyserver' });
        onNotFound?.(email.trim());
        showToast('Not found on keyserver', 'warning');
        return;
      }
      const parsed = parseUserId(result.key);

      // Show any warnings from key validation
      for (const warning of result.warnings) {
        showToast(warning, 'warning');
      }

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
      const statusText = result.warnings.length > 0
        ? 'Key found (with warnings): ' + (parsed.name || parsed.uid)
        : 'Key found: ' + (parsed.name || parsed.uid);
      setStatus({ type: result.warnings.length > 0 ? 'warning' : 'success', text: statusText, sub: 'Fingerprint: ' + parsed.fingerprint });
      onKeyFound(lookupResult);
      setEmail('');
    } catch (e) {
      setStatus({ type: 'error', text: 'Lookup failed: ' + (e as Error).message });
      showToast('Lookup failed: ' + (e as Error).message, 'error');
    } finally {
      setSearching(false);
    }
  }

  async function handleImportFile(file: File) {
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
      setStatus({ type: 'error', text: 'Import failed: ' + (err as Error).message });
      showToast('Import failed: ' + (err as Error).message, 'error');
    }
  }

  const content = (
    <>
      {title && <h3 className="card-title">{title}</h3>}
      {description && <p className="text-xs text-gray-500 mb-4">{description}</p>}

      <FormField id={emailId} label="Email address for public key lookup" help="Email lookup uses online services: our directory and a public keyserver. Import a key file below to skip the lookup.">
        <div className="field-action-row">
          <input id={emailId} type="email" placeholder={placeholder} className="input w-full"
            value={email} onChange={(e) => setEmail(e.target.value)}
            aria-describedby={`${emailId}-help`}
            onKeyDown={(e) => { if (e.key === 'Enter' && !searching) handleLookup(); }} />
          <ActionButton onClick={handleLookup} loading={searching} loadingText="Searching…" className="btn-primary">{buttonText}</ActionButton>
        </div>
      </FormField>

      <div className="divider">or</div>

      <FileDropZone
        onFile={handleImportFile}
        placeholder="Import a public key file (.asc, .key)"
        size="sm"
        accept=".asc,.key,.pgp,.gpg,text/plain,application/pgp-keys,application/pgp-encrypted,application/octet-stream"
      />

      {status && (
        <NoticeBox variant={status.type === 'warning' ? 'warn' : status.type} role={status.type === 'error' ? 'alert' : 'status'} className="mt-3">
          <p className="text-sm font-medium">{status.text}</p>
          {status.sub && <p className="text-xs font-mono mt-1">{status.sub}</p>}
        </NoticeBox>
      )}
    </>
  );

  if (!showCard) {
    return <div className={className}>{content}</div>;
  }

  return <div className={`card ${className ?? ''}`}>{content}</div>;
}
