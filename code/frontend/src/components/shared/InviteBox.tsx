import { useState } from 'react';
import { showToast } from '../../stores/toast';
import { sendInvitation } from '../../lib/api';
import { useStore } from '@nanostores/react';
import { $userInfo } from '../../stores/keys';
import ActionButton from './ActionButton';
import NoticeBox from './NoticeBox';

interface Props {
  /** Email to pre-fill in the mailto link (optional) */
  email?: string;
  /** Title text */
  title?: string;
  /** Description text */
  description?: string;
  /** CSS class on the wrapper */
  className?: string;
}

export default function InviteBox({
  email,
  title = 'Not found on keyserver',
  description = 'They need to set up their own keys first. Send them an invitation:',
  className,
}: Props) {
  const userInfo = useStore($userInfo);
  const [status, setStatus] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  function parseSenderInfo(): { name: string; email: string } | null {
    if (!userInfo) return null;
    const match = userInfo.match(/^(.+?)\s*<([^>]+)>$/);
    return match ? { name: match[1], email: match[2] } : null;
  }

  async function handleSendInvite() {
    if (!email) return;
    const sender = parseSenderInfo();
    if (!sender) {
      setStatus('Set up your own keys first to send invitations');
      showToast('Set up your own keys first to send invitations', 'warning');
      return;
    }

    setSending(true);
    setStatus('');
    try {
      await sendInvitation({
        senderEmail: sender.email,
        senderName: sender.name,
        recipientEmail: email,
      });
      setSent(true);
      showToast('Invitation sent!', 'success');
    } catch (e) {
      // Fall back to mailto if API is unavailable
      handleFallbackEmail();
      setStatus('Opened email client as fallback');
      showToast('Opened email client as fallback', 'info');
    } finally {
      setSending(false);
    }
  }

  function handleFallbackEmail() {
    const subject = encodeURIComponent('Set up encrypted file sharing with CryptDrop');
    const body = encodeURIComponent(
      `Hi!\n\nI'd like to send you encrypted files via CryptDrop.\n\nTo get started:\n1. Go to: ${window.location.origin}/app\n2. Open the Keys tab and generate your key pair\n3. Click "Publish" to make your key searchable\n4. Reply to let me know — I'll find you by email!\n\nIt only takes a minute. Your private key stays on your device.`,
    );
    window.open('mailto:' + encodeURIComponent(email ?? '') + '?subject=' + subject + '&body=' + body);
  }

  function handleCopyInvite() {
    const text = `Hi! I want to send you an encrypted file.\n\n1. Go to: ${window.location.origin}/app\n2. Go to Keys tab and generate your keys\n3. Publish your public key to the keyserver\n4. Let me know when done — I'll search for your email!`;
    setStatus('');
    navigator.clipboard.writeText(text).then(
      () => showToast('Copied!', 'success'),
      () => {
        setStatus('Could not copy instructions. Please try again.');
        showToast('Could not copy instructions', 'error');
      },
    );
  }

  return (
    <NoticeBox variant="warn" className={className}>
      <h4 className="text-sm font-semibold text-amber-900 mb-2">{title}</h4>
      <p className="text-xs text-amber-800 mb-3">{description}</p>
      <div className="action-row">
        {email && !sent && (
          <ActionButton onClick={handleSendInvite} loading={sending} loadingText="Sending…" className="btn-sm">
            <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2"/><polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2"/></svg>
            Send Invitation
          </ActionButton>
        )}
        {sent && (
          <span role="status" className="text-sm font-medium">
            Invitation sent! They'll get an email with a setup link.
          </span>
        )}
        <button onClick={handleCopyInvite} className="btn-sm btn-ghost-sm">
          Copy Instructions
        </button>
      </div>
      {status && <p role="status" className="text-sm mt-3">{status}</p>}
    </NoticeBox>
  );
}
