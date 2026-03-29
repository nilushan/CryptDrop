import { useStore } from '@nanostores/react';
import { $contacts } from '../../stores/contacts';
import { showToast } from '../../stores/toast';
import * as openpgp from 'openpgp';
import type { PublicKey } from 'openpgp';

interface Props {
  onSenderKeyLoaded: (key: PublicKey) => void;
}

export default function SenderContactPills({ onSenderKeyLoaded }: Props) {
  const contacts = useStore($contacts);

  if (contacts.length === 0) return null;

  async function handleSelect(contact: typeof contacts[0]) {
    try {
      const key = await openpgp.readKey({ armoredKey: contact.armoredPublicKey });
      onSenderKeyLoaded(key);
      showToast('Sender key loaded', 'success');
    } catch {
      showToast('Could not load key for ' + contact.email, 'error');
    }
  }

  return (
    <div className="mb-3">
      <p style={{ fontSize: '0.75rem', fontWeight: 500, color: '#6b7280', margin: '0 0 0.375rem' }}>
        From saved contacts:
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {contacts.map((c) => (
          <button
            key={c.email}
            type="button"
            onClick={() => handleSelect(c)}
            style={{
              fontSize: '0.75rem', border: '1px solid #e5e7eb', background: '#f9fafb',
              color: '#374151', padding: '0.25rem 0.75rem', borderRadius: '9999px',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#eef2ff'; e.currentTarget.style.borderColor = '#c7d2fe'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
          >
            {c.name || c.email}
          </button>
        ))}
      </div>
    </div>
  );
}
