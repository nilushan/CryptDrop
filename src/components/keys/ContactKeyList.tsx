import { useStore } from '@nanostores/react';
import { $contacts, removeContact } from '../../stores/contacts';
import { showToast } from '../../stores/toast';
import { lookupKeyByEmail, parseUserId } from '../../lib/openpgp-helpers';
import { saveContact } from '../../stores/contacts';

export default function ContactKeyList() {
  const contacts = useStore($contacts);

  async function handleRefresh(email: string) {
    showToast('Refreshing key for ' + email + '...', 'info');
    try {
      const result = await lookupKeyByEmail(email);
      if (!result) {
        showToast('Key not found on keyserver for ' + email, 'warning');
        return;
      }
      const parsed = parseUserId(result.key);
      saveContact(email, parsed.name, result.armored, parsed.fingerprint);
      showToast('Key refreshed for ' + email, 'success');
    } catch (e) {
      showToast('Refresh failed: ' + (e as Error).message, 'error');
    }
  }

  function handleRemove(email: string) {
    removeContact(email);
  }

  if (contacts.length === 0) {
    return (
      <div className="public-contacts-empty">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/></svg>
        <p>No saved recipients yet. Look up a recipient in the Wizard or Encrypt tab to save their key here.</p>
      </div>
    );
  }

  return (
    <div>
      {contacts.map((c) => {
        const fp8 = c.fingerprint ? c.fingerprint.slice(-8).toUpperCase() : '';
        return (
          <div key={c.email} className="contact-key-row">
            <div className="contact-key-info">
              <span className="contact-key-name">{c.name || c.email}</span>
              <span className="contact-key-email">{c.email}</span>
              {fp8 && <span className="contact-key-fp">&hellip;{fp8}</span>}
            </div>
            <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
              <button
                onClick={() => handleRefresh(c.email)}
                className="btn-contact-refresh"
                title="Refresh from keyserver"
              >
                Refresh
              </button>
              <button
                onClick={() => handleRemove(c.email)}
                className="btn-contact-remove"
                title="Remove"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
