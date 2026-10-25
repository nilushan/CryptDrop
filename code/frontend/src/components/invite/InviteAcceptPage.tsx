import { useState, useEffect } from 'react';
import { validateInviteToken } from '../../lib/api';
import NoticeBox from '../shared/NoticeBox';
import type { InviteValidation } from '../../lib/api';

export default function InviteAcceptPage() {
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<InviteValidation | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) {
      setError('Missing invitation link');
      setLoading(false);
      return;
    }

    validateInviteToken(token)
      .then((result) => {
        if (!result.valid) {
          setError(result.status === 'accepted' ? 'This invitation has already been used.' : 'This invitation is no longer valid.');
        } else {
          setInvite(result);
        }
      })
      .catch(() => setError('Could not validate invitation. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="invite-page-container">
        <div className="invite-card">
          <h1>Accept invitation</h1>
          <p className="invite-loading" role="status">Validating invitation…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="invite-page-container">
        <div className="invite-card">
          <h1>Accept invitation</h1>
          <NoticeBox variant="error" role="alert" className="invite-error">
            <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            <h2>{error}</h2>
            <p>
              You can still set up CryptDrop manually.{' '}
              <a href="/app?tab=keyring">Go to the app</a>
            </p>
          </NoticeBox>
        </div>
      </div>
    );
  }

  return (
    <div className="invite-page-container">
      <div className="invite-card">
          <h1>Accept invitation</h1>
        <div className="invite-welcome" role="status">
          <svg aria-hidden="true" width="40" height="40" viewBox="0 0 24 24" fill="none" className="invite-lock">
            <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <h2>
            <strong>{invite?.senderName}</strong> wants to send you encrypted files
          </h2>
          <p>
            To receive encrypted files, you need to set up your own encryption keys. It only takes a minute — your keys are created in your browser and never leave your device.
          </p>
          <a
            href={`/app?tab=keyring${invite?.token ? `&inviteToken=${encodeURIComponent(invite.token)}` : ''}`}
            className="invite-cta-btn"
          >
            Set Up My Keys
          </a>
          <p className="invite-footnote">
            Once your keys are created, <strong>{invite?.senderName}</strong> will be automatically notified that you're ready.
          </p>
        </div>
      </div>
    </div>
  );
}
