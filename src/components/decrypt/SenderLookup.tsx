import { useState } from 'react';
import { showToast } from '../../stores/toast';
import { lookupKeyByEmail, parseUserId } from '../../lib/openpgp-helpers';
import type { PublicKey } from 'openpgp';
import * as openpgp from 'openpgp';

interface Props {
  onSenderKeyLoaded: (key: PublicKey) => void;
}

export default function SenderLookup({ onSenderKeyLoaded }: Props) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'warning'; text: string; sub?: string } | null>(null);

  async function handleLookup() {
    if (!email.trim()) return;
    try {
      const result = await lookupKeyByEmail(email.trim());
      if (!result) {
        setStatus({ type: 'warning', text: 'No key found. Signature verification will be skipped.' });
        return;
      }
      const parsed = parseUserId(result.key);
      onSenderKeyLoaded(result.key);
      setStatus({ type: 'success', text: 'Verification key found: ' + parsed.uid });
      showToast('Sender key found', 'success');
    } catch (e) {
      showToast('Lookup failed: ' + (e as Error).message, 'error');
    }
  }

  async function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const key = await openpgp.readKey({ armoredKey: text });
      const uid = key.users[0]?.userID?.userID ?? 'Unknown';
      onSenderKeyLoaded(key);
      setStatus({ type: 'success', text: 'Verification key imported: ' + uid });
      showToast('Sender key imported', 'success');
    } catch (e) {
      showToast('Import failed: ' + (e as Error).message, 'error');
    }
  }

  return (
    <div className="card mb-4">
      <h3 className="card-title">Verify Sender <span className="text-gray-400 font-normal">(optional)</span></h3>
      <p className="text-xs text-gray-500 mb-3">If the file was signed, load the sender's public key to verify their identity.</p>
      <div className="flex gap-2 mb-3">
        <input
          type="email"
          placeholder="sender@email.com"
          className="input flex-1"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button onClick={handleLookup} className="btn-secondary whitespace-nowrap">Find Key</button>
      </div>
      <div className="divider">or</div>
      <label className="drop-zone drop-zone-sm block">
        <input type="file" accept=".asc,.key,.pgp,.gpg" className="hidden" onChange={handleFileImport} />
        <p className="text-sm text-gray-500">Click to import sender's public key file</p>
      </label>
      {status && (
        <div className={`mt-3 ${status.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'} rounded-md p-3`}>
          <p className={`text-sm font-medium ${status.type === 'success' ? 'text-green-800' : 'text-amber-600'}`}>
            {status.text}
          </p>
        </div>
      )}
    </div>
  );
}
