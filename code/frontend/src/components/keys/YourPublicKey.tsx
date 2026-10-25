import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { $publicKey, $armoredPublic, $userInfo } from '../../stores/keys';
import { downloadTextFile } from '../../lib/file-helpers';
import { showToast } from '../../stores/toast';
import ActionButton from '../shared/ActionButton';
import NoticeBox from '../shared/NoticeBox';

export default function YourPublicKey() {
  const publicKey = useStore($publicKey);
  const armoredPublic = useStore($armoredPublic);
  const userInfo = useStore($userInfo);
  const [publishStatus, setPublishStatus] = useState<{ type: 'info' | 'warn'; text: string } | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [copyError, setCopyError] = useState('');

  function handleDownload() {
    if (armoredPublic) downloadTextFile(armoredPublic, 'public_key.asc');
  }

  function handleCopy() {
    if (!armoredPublic) { showToast('No public key loaded', 'warning'); return; }
    setCopyError('');
    navigator.clipboard.writeText(armoredPublic).then(
      () => showToast('Public key copied to clipboard', 'success'),
      () => {
        setCopyError('Could not copy the public key. Try again or use Download.');
        showToast('Could not copy — please copy manually', 'error');
      },
    );
  }

  function handleShareEmail() {
    if (!armoredPublic) { showToast('No public key loaded', 'warning'); return; }
    const uid = userInfo || 'My CryptDrop Public Key';
    const subject = encodeURIComponent('My PGP Public Key — ' + uid);
    const body = encodeURIComponent(
      'Hi,\n\nHere is my PGP public key so you can send me encrypted files via CryptDrop (https://cryptdrop.app).\n\n' +
      armoredPublic +
      '\n\nYou can paste this key directly into CryptDrop when encrypting a file for me.',
    );
    window.open('mailto:?subject=' + subject + '&body=' + body);
  }

  async function handlePublish() {
    if (!armoredPublic) { showToast('No public key loaded', 'warning'); return; }
    setPublishing(true);
    setPublishStatus(null);
    try {
      // Step 1: Upload key to keyserver
      const uploadResp = await fetch('https://keys.openpgp.org/vks/v1/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keytext: armoredPublic }),
      });
      const uploadData = await uploadResp.json();
      if (!uploadResp.ok) {
        const msg = uploadData?.error || 'HTTP ' + uploadResp.status;
        setPublishStatus({ type: 'warn', text: 'Upload failed: ' + msg });
        showToast('Publish failed: ' + msg, 'error');
        return;
      }

      // Step 2: Request verification emails for unpublished addresses
      const token = uploadData.token as string;
      const status = uploadData.status as Record<string, string>;
      const unpublished = Object.entries(status)
        .filter(([, s]) => s === 'unpublished')
        .map(([addr]) => addr);

      if (unpublished.length > 0 && token) {
        const verifyResp = await fetch('https://keys.openpgp.org/vks/v1/request-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, addresses: unpublished }),
        });
        if (verifyResp.ok) {
          setPublishStatus({ type: 'info', text: 'Key uploaded! A verification email has been sent to ' + unpublished.join(', ') + '. Click the link in the email to make your key searchable.' });
          showToast('Key uploaded — check your email to verify', 'success');
        } else {
          setPublishStatus({ type: 'info', text: 'Key uploaded, but could not request verification email. Try publishing again.' });
          showToast('Key uploaded — verification email may be delayed', 'warning');
        }
      } else {
        // All addresses already published or no addresses found
        const published = Object.entries(status).filter(([, s]) => s === 'published').map(([addr]) => addr);
        if (published.length > 0) {
          setPublishStatus({ type: 'info', text: 'Key already published and verified for ' + published.join(', ') + '.' });
          showToast('Key already published!', 'success');
        } else {
          setPublishStatus({ type: 'info', text: 'Key uploaded successfully.' });
          showToast('Key uploaded', 'success');
        }
      }
    } catch (e) {
      const errMsg = (e as Error).message;
      setPublishStatus({ type: 'warn', text: 'Network error: ' + errMsg });
      showToast('Publish failed: ' + errMsg, 'error');
    } finally {
      setPublishing(false);
    }
  }

  if (!publicKey) return null;

  return (
    <div className="mt-6">
      <div className="keys-section-label keys-public-label">
        <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/><path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        Your Public Key
        <span className="keys-section-badge keys-public-badge">Safe to share freely</span>
      </div>

      <div className="public-key-card mb-4">
        <div className="public-key-intro">
          <p className="public-key-desc">Your public key is your open padlock — anyone can use it to encrypt files for you. Share it widely.</p>
          <p className="public-key-source-note">
            <svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M12 8h.01M11 12h1v4h1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            Publishing to <strong>keys.openpgp.org</strong> lets anyone find you automatically when they search by email.
          </p>
        </div>
        <div className="public-key-actions">
          <button onClick={handleDownload} className="btn-public-action">
            <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Download
          </button>
          <button onClick={handleCopy} className="btn-public-action">
            <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="2"/></svg>
            Copy
          </button>
          <button onClick={handleShareEmail} className="btn-public-action">
            <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2"/><polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2"/></svg>
            Email
          </button>
          <ActionButton onClick={handlePublish} loading={publishing} loadingText="Publishing…" className="btn-public-publish">
            <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="currentColor" strokeWidth="2"/></svg>
            Publish
          </ActionButton>
        </div>
        {copyError && <NoticeBox variant="error" role="alert" className="mt-3">{copyError}</NoticeBox>}
        {publishStatus && (
          <NoticeBox role="status" variant={publishStatus.type} className="mt-3">
            <p className={publishStatus.type === 'info' ? 'text-sm text-indigo-800' : 'text-sm text-amber-800'}>
              {publishStatus.type === 'info' && <strong>Key uploaded! </strong>}
              {publishStatus.text}
            </p>
          </NoticeBox>
        )}
      </div>
    </div>
  );
}
