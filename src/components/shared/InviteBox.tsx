import { showToast } from '../../stores/toast';

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
  function handleCopyInvite() {
    const text = `Hi! I want to send you an encrypted file.\n\n1. Go to: ${window.location.origin}/app\n2. Go to Keys tab and generate your keys\n3. Publish your public key to the keyserver\n4. Let me know when done — I'll search for your email!`;
    navigator.clipboard.writeText(text).then(() => showToast('Copied!', 'success'));
  }

  function handleSendInviteEmail() {
    const subject = encodeURIComponent('Set up encrypted file sharing with CryptDrop');
    const body = encodeURIComponent(
      `Hi!\n\nI'd like to send you encrypted files via CryptDrop.\n\nTo get started:\n1. Go to: ${window.location.origin}/app\n2. Open the Keys tab and generate your key pair\n3. Click "Publish" to make your key searchable\n4. Reply to let me know — I'll find you by email!\n\nIt only takes a minute. Your private key stays on your device.`,
    );
    window.open('mailto:' + encodeURIComponent(email ?? '') + '?subject=' + subject + '&body=' + body);
  }

  return (
    <div className={`notice-box notice-warn ${className ?? ''}`}>
      <h4 className="text-sm font-semibold text-amber-900 mb-2">{title}</h4>
      <p className="text-xs text-amber-800 mb-3">{description}</p>
      <div className="flex gap-2">
        {email && (
          <button onClick={handleSendInviteEmail} className="btn-sm" style={{ background: '#d97706' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ marginRight: 4 }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2"/><polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2"/></svg>
            Send Invite Email
          </button>
        )}
        <button onClick={handleCopyInvite} className="btn-sm btn-ghost-sm">
          Copy Instructions
        </button>
      </div>
    </div>
  );
}
