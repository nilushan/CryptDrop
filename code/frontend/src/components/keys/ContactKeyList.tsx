import { useState } from 'react';
import NoticeBox from '../shared/NoticeBox';
import ActionButton from '../shared/ActionButton';
import { useStore } from '@nanostores/react';
import { $contacts, removeContact } from '../../stores/contacts';
import { showToast } from '../../stores/toast';
import { lookupKeyByEmail, parseUserId } from '../../lib/openpgp-helpers';
import { saveContact } from '../../stores/contacts';

export default function ContactKeyList() {
  const contacts = useStore($contacts);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function handleRefresh(email: string) {
    setRefreshing(email);
    setError('');
    showToast('Refreshing key for ' + email + '...', 'info');
    try {
      const result = await lookupKeyByEmail(email);
      if (!result) {
        setError('Key not found on keyserver for ' + email);
        showToast('Key not found on keyserver for ' + email, 'warning');
        return;
      }
      const parsed = parseUserId(result.key);
      saveContact(email, parsed.name, result.armored, parsed.fingerprint);
      showToast('Key refreshed for ' + email, 'success');
    } catch (e) {
      setError('Refresh failed: ' + (e as Error).message);
      showToast('Refresh failed: ' + (e as Error).message, 'error');
    } finally {
      setRefreshing(null);
    }
  }

  function handleRemove(email: string) {
    removeContact(email);
  }

  if (contacts.length === 0) {
    return (
      <div className="public-contacts-empty">
        <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/></svg>
        <p>No saved recipients yet. Look up a recipient in the Wizard or Encrypt tab to save their key here.</p>
      </div>
    );
  }

  return (
    <div>
      {error && <NoticeBox variant="error" role="alert" className="mb-3">{error}</NoticeBox>}
      {contacts.map((c) => {
        const fingerprint = c.fingerprint?.toUpperCase();
        return (
          <div key={c.email} className="contact-key-row">
            <div className="contact-key-info">
              <span className="contact-key-name">{c.name || c.email}</span>
              <span className="contact-key-email">{c.email}</span>
              {fingerprint && <span className="contact-key-fp">Fingerprint: {fingerprint}</span>}
            </div>
            <div className="contact-key-actions">
              <ActionButton onClick={() => handleRefresh(c.email)} disabled={refreshing !== null}
                loading={refreshing === c.email} loadingText="Refreshing…" className="btn-contact-refresh">
                Refresh{' '}<span className="sr-only">key for {c.email}</span>
              </ActionButton>
              <button
                onClick={() => handleRemove(c.email)}
                className="btn-contact-remove"
                type="button"
                aria-label={`Remove contact ${c.email}`}
              >
                <svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
