import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { $privateKey, $userInfo } from '../../stores/keys';
import { $activeTab } from '../../stores/activeTab';
import FolderBar from '../shared/FolderBar';
import DecryptFilePanel from '../shared/DecryptFilePanel';

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
        <div className="notice-box notice-info mb-4 animate-fade-in">
          <p className="text-sm text-indigo-800 font-medium mb-1">Private key required</p>
          <p className="text-xs text-indigo-700">You need your private key to decrypt files. Set it up in <button onClick={() => $activeTab.set('keyring')} className="link-inline">My Key Ring</button> or use the Wizard.</p>
        </div>
      )}

      <DecryptFilePanel
        folderHandle={folderHandle}
        successActions={(onReset) => (
          <div className="flex gap-2 mt-3" style={{ justifyContent: 'center' }}>
            <button onClick={onReset} className="btn-sm">Unlock Another File</button>
            <button onClick={() => { onReset(); }} className="btn-sm btn-ghost-sm">Clear All</button>
          </div>
        )}
      />
    </div>
  );
}
