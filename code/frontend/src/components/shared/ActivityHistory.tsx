import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { $history, clearHistory, isAutoClearEnabled, setAutoClear, type HistoryEntry } from '../../stores/history';
import { formatSize } from '../../lib/file-helpers';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function EntryRow({ entry }: { entry: HistoryEntry }) {
  const isEncrypt = entry.action === 'encrypt';
  const label = isEncrypt
    ? `for ${entry.recipientOrSender}`
    : entry.signed || entry.recipientOrSender !== 'unknown'
      ? `from ${entry.recipientOrSender}`
      : 'unsigned';

  return (
    <li className="history-row">
      <span className={`history-icon history-icon-${entry.action}`} aria-hidden="true">
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
          <path d={isEncrypt ? 'M7 11V7a5 5 0 0110 0v4' : 'M7 11V7a5 5 0 019.9-1'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
      <div className="history-info">
        <p className="history-filenames">{entry.originalFilename} → {entry.resultFilename}</p>
        <p className="history-meta">{isEncrypt ? 'Encrypted' : 'Decrypted'} · {formatSize(entry.originalSize)} → {formatSize(entry.resultSize)} · {label}{entry.signed && ' · signed'}</p>
      </div>
      <time className="history-time" dateTime={entry.timestamp}>{timeAgo(entry.timestamp)}</time>
    </li>
  );
}

export default function ActivityHistory() {
  const history = useStore($history);
  const [autoClear, setAutoClearState] = useState(isAutoClearEnabled);

  function toggleAutoClear() {
    const next = !autoClear;
    setAutoClearState(next);
    setAutoClear(next);
  }

  if (history.length === 0) return null;

  return (
    <section className="activity-history" aria-label="Recent activity">
      <div className="history-header">
        <h2>Recent Activity</h2>
        <div className="history-controls">
          <label><input type="checkbox" checked={autoClear} onChange={toggleAutoClear} /> Clear on close</label>
          <button type="button" onClick={clearHistory} className="btn-ghost-sm">Clear</button>
        </div>
      </div>
      <ul className="history-list" tabIndex={0} aria-label="Recent file operations">
        {history.slice(0, 20).map((entry) => <EntryRow key={entry.id} entry={entry} />)}
      </ul>
    </section>
  );
}
