import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { $publicKey, $armoredPublic, $userInfo } from '../../stores/keys';
import { downloadTextFile } from '../../lib/file-helpers';
import { showToast } from '../../stores/toast';
import ContactKeyList from './ContactKeyList';

interface Props {
  onSwitchToPrivate: () => void;
}

export default function PublicKeysPanel({ onSwitchToPrivate }: Props) {
  const publicKey = useStore($publicKey);
  const armoredPublic = useStore($armoredPublic);
  const userInfo = useStore($userInfo);
  const [publishStatus, setPublishStatus] = useState<{ type: 'info' | 'warn'; text: string } | null>(null);
  const [publishing, setPublishing] = useState(false);

  function handleDownload() {
    if (armoredPublic) downloadTextFile(armoredPublic, 'public_key.asc');
  }

  function handleCopy() {
    if (!armoredPublic) { showToast('No public key loaded', 'warning'); return; }
    navigator.clipboard.writeText(armoredPublic).then(
      () => showToast('Public key copied to clipboard', 'success'),
      () => showToast('Could not copy — please copy manually', 'error'),
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
      const resp = await fetch('https://keys.openpgp.org/vks/v1/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keytext: armoredPublic }),
      });
      const data = await resp.json();
      if (resp.ok) {
        setPublishStatus({ type: 'info', text: 'Key uploaded! Check your email — keys.openpgp.org will send a verification link to confirm your address and make the key searchable.' });
        showToast('Key uploaded — check your email to verify', 'success');
      } else {
        const msg = data?.error || 'HTTP ' + resp.status;
        setPublishStatus({ type: 'warn', text: 'Upload failed: ' + msg });
        showToast('Publish failed: ' + msg, 'error');
      }
    } catch (e) {
      const errMsg = (e as Error).message;
      setPublishStatus({ type: 'warn', text: 'Network error: ' + errMsg });
      showToast('Publish failed: ' + errMsg, 'error');
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div>
      {/* YOUR PUBLIC KEY */}
      <div className="keys-section-label keys-public-label">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/><path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        Your Public Key
        <span className="keys-section-badge keys-public-badge">Safe to share freely</span>
      </div>

      {publicKey ? (
        <div className="public-key-card mb-4">
          <div className="public-key-intro">
            <p className="public-key-desc">Your public key is your open padlock — anyone can use it to encrypt files for you. Share it widely. It's designed to be public.</p>
            <p className="public-key-source-note">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M12 8h.01M11 12h1v4h1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              When someone searches for your email in CryptDrop, your public key is retrieved from <strong>keys.openpgp.org</strong> — a public keyserver. Publishing it there lets anyone find you automatically.
            </p>
          </div>
          <div className="public-key-actions">
            <button onClick={handleDownload} className="btn-public-action">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Download Public Key
            </button>
            <button onClick={handleCopy} className="btn-public-action">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="2"/></svg>
              Copy Public Key
            </button>
            <button onClick={handleShareEmail} className="btn-public-action">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2"/><polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2"/></svg>
              Share via Email
            </button>
            <button onClick={handlePublish} disabled={publishing} className="btn-public-publish">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="currentColor" strokeWidth="2"/></svg>
              {publishing ? 'Publishing…' : 'Publish to Keyserver'}
            </button>
          </div>
          {publishStatus && (
            <div className={`mt-3 notice-box ${publishStatus.type === 'info' ? 'notice-info' : 'notice-warn'}`}>
              <p className={publishStatus.type === 'info' ? 'text-sm text-indigo-800' : 'text-sm text-amber-800'}>
                {publishStatus.type === 'info' && <strong>Key uploaded! </strong>}
                {publishStatus.text}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="public-key-card public-key-card-empty mb-4">
          <div className="public-key-empty-inner">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/><path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            <div>
              <p className="public-key-empty-title">No public key yet</p>
              <p className="public-key-empty-desc">Generate or import a private key first — your public key is derived from it.</p>
            </div>
          </div>
          <button onClick={onSwitchToPrivate} className="btn-public-action mt-3">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Go to Private Key
          </button>
        </div>
      )}

      {/* RECIPIENTS' PUBLIC KEYS */}
      <div className="keys-section-label keys-public-label" style={{ marginTop: '1.5rem' }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        Recipients' Public Keys
        <span className="keys-section-badge keys-public-badge">Saved from keyserver lookups</span>
      </div>
      <div className="public-key-card">
        <p className="public-key-desc" style={{ marginBottom: '0.75rem' }}>These are your saved contacts' public keys — retrieved from the internet when you looked them up. They're safe to store and share.</p>
        <ContactKeyList />
      </div>
    </div>
  );
}
