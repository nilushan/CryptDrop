import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { $privateKey, $userInfo } from '../../stores/keys';
import FolderBar from '../shared/FolderBar';
import DecryptFilePanel from '../shared/DecryptFilePanel';
import ActivityHistory from '../shared/ActivityHistory';
import KeyCapabilityNotice from '../shared/KeyCapabilityNotice';
import { privateKeySecurityHref } from '../../lib/key-security';

export default function DecryptTab() {
  const privateKey = useStore($privateKey);
  const userInfo = useStore($userInfo);
  const [folderHandle, setFolderHandle] = useState<FileSystemDirectoryHandle | null>(null);

  return (
    <div>
      <div className="tab-header">
        <div>
          <h1 className="tab-title">Decrypt a file.</h1>
          <p className="tab-subtitle">Decrypt a PGP file with the private key it was encrypted for.</p>
        </div>
        {privateKey && (
          <div className="key-badge key-badge-ok">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/></svg>
            <span>{userInfo || 'Key loaded'}</span>
          </div>
        )}
      </div>

      <KeyCapabilityNotice tool="decrypt" />
      <p className="key-security-note">
        Decryption happens on your device. While loaded, your private key is held in browser memory.{' '}
        <a href={privateKeySecurityHref} target="_blank" rel="noopener noreferrer">Security &amp; limitations (opens in a new tab)</a>
      </p>

      <DecryptFilePanel folderHandle={folderHandle} />
      <FolderBar folderHandle={folderHandle} onFolderChange={setFolderHandle} />

      <ActivityHistory />
    </div>
  );
}
