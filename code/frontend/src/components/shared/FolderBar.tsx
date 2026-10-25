import { useState, useEffect } from 'react';
import { isFSASupported, pickSaveFolder as pickFolder } from '../../lib/file-helpers';
import { showToast } from '../../stores/toast';
import NoticeBox from './NoticeBox';

interface Props {
  onFolderChange: (handle: FileSystemDirectoryHandle | null) => void;
  folderHandle: FileSystemDirectoryHandle | null;
}

export default function FolderBar({ onFolderChange, folderHandle }: Props) {
  const [supported, setSupported] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setSupported(isFSASupported());
  }, []);

  async function handlePick() {
    setError('');
    try {
      const handle = await pickFolder();
      if (handle) {
        onFolderChange(handle);
        showToast('Save folder set: ' + handle.name, 'success');
      }
    } catch (e) {
      setError('Could not access folder: ' + (e as Error).message);
      showToast('Could not access folder: ' + (e as Error).message, 'error');
    }
  }

  if (!supported) {
    return (
      <div className="folder-bar mb-4">
        <span className="folder-bar-inner">Save location: your browser’s downloads folder</span>
      </div>
    );
  }

  return (
    <>
      <div className="folder-bar mb-4">
        <div className="folder-bar-inner">
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
          <span className="folder-bar-label">Save to: <strong className="fsa-folder-name">{folderHandle?.name || 'Downloads'}</strong></span>
        </div>
        <button onClick={handlePick} className="btn-xs">
          {folderHandle ? 'Change folder' : 'Choose folder'}
        </button>
      </div>
      {error && <NoticeBox variant="error" role="alert" className="mb-3">{error}</NoticeBox>}
    </>
  );
}
