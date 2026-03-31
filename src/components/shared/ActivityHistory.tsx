import { useStore } from '@nanostores/react';
import { $history, clearHistory, type HistoryEntry } from '../../stores/history';
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
  const iconColor = isEncrypt ? '#4f46e5' : '#16a34a';
  const bgColor = isEncrypt ? '#eef2ff' : '#f0fdf4';
  const label = isEncrypt
    ? `for ${entry.recipientOrSender}`
    : `from ${entry.recipientOrSender}`;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      padding: '0.625rem 0',
      borderBottom: '1px solid #f1f5f9',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: '0.5rem', background: bgColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, color: iconColor,
      }}>
        {isEncrypt ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M7 11V7a5 5 0 019.9-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {entry.originalFilename}
          </p>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, color: '#cbd5e1' }}>
            <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {entry.resultFilename}
          </p>
        </div>
        <p style={{ fontSize: '0.6875rem', color: '#94a3b8', margin: '0.125rem 0 0' }}>
          {formatSize(entry.originalSize)} → {formatSize(entry.resultSize)} · {label}
          {entry.signed && ' · signed'}
        </p>
      </div>
      <span style={{ fontSize: '0.6875rem', color: '#94a3b8', flexShrink: 0, whiteSpace: 'nowrap' }}>
        {timeAgo(entry.timestamp)}
      </span>
    </div>
  );
}

export default function ActivityHistory() {
  const history = useStore($history);

  if (history.length === 0) return null;

  return (
    <div style={{ marginTop: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', margin: 0 }}>
          Recent Activity
        </p>
        <button
          onClick={clearHistory}
          style={{ fontSize: '0.6875rem', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: '0.125rem 0.25rem' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; }}
        >
          Clear
        </button>
      </div>
      <div style={{
        border: '1px solid #e2e8f0', borderRadius: '0.75rem',
        padding: '0 0.875rem', background: '#fff',
        maxHeight: '280px', overflowY: 'auto',
      }}>
        {history.slice(0, 20).map((entry) => (
          <EntryRow key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  );
}
