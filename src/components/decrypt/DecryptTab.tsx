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
          <h2 className="tab-title">Unlock a File</h2>
          <p className="tab-subtitle">Decrypt an encrypted file using your private key.</p>
        </div>
        {privateKey && (
          <div className="key-badge key-badge-ok">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/></svg>
            <span>{userInfo || 'Key loaded'}</span>
          </div>
        )}
      </div>

      <FolderBar folderHandle={folderHandle} onFolderChange={setFolderHandle} />

      {!privateKey && (
        <NoticeBox variant="info" className="mb-4 animate-fade-in">
          <p className="text-sm text-indigo-800 font-medium mb-1">Private key required</p>
          <p className="text-xs text-indigo-700">You need your private key to decrypt files. Set it up in <button onClick={() => $activeTab.set('keyring')} className="link-inline">My Key Ring</button> or use the Wizard.</p>
        </NoticeBox>
      )}

      <DecryptFilePanel folderHandle={folderHandle} />

      <ActivityHistory />
    </div>
  );
}
