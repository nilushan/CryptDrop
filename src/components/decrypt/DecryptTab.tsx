import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { $privateKey, $userInfo } from '../../stores/keys';
import { $activeTab } from '../../stores/activeTab';
import FolderBar from '../shared/FolderBar';
import DecryptFilePanel from '../shared/DecryptFilePanel';
import ActivityHistory from '../shared/ActivityHistory';
import NoticeBox from '../shared/NoticeBox';

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

      {!privateKey && (
        <NoticeBox variant="info" className="mb-4 animate-fade-in">
          <p className="text-sm text-indigo-900 font-medium mb-1">First, load your private key</p>
          <p className="text-xs text-indigo-700">You can choose your file now. To unlock it, <button onClick={() => $activeTab.set('keyring')} className="link-inline">import the matching private key</button>. A newly generated key cannot open an existing file.</p>
        </NoticeBox>
      )}

      <DecryptFilePanel folderHandle={folderHandle} />
      <FolderBar folderHandle={folderHandle} onFolderChange={setFolderHandle} />

      <ActivityHistory />
    </div>
  );
}
