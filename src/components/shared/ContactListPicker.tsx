import { useState, useMemo } from 'react';
import { useStore } from '@nanostores/react';
import { $contacts, type Contact } from '../../stores/contacts';

interface Props {
  /** Called when a contact is selected */
  onSelect: (contact: Contact) => void;
  /** Show search input */
  showSearch?: boolean;
  /** Show "Recent" badge on contacts with lastUsed */
  showRecent?: boolean;
  /** Label shown above the list */
  label?: string;
  /** Optional CSS class on the wrapper */
  className?: string;
}

export default function ContactListPicker({
  onSelect,
  showSearch = false,
  showRecent = false,
  label,
  className,
}: Props) {
  const contacts = useStore($contacts);
  const [searchQuery, setSearchQuery] = useState('');

  const sorted = useMemo(() => {
    return [...contacts].sort((a, b) => {
      const aTime = a.lastUsed || a.lastUpdated || '';
      const bTime = b.lastUsed || b.lastUpdated || '';
      return bTime.localeCompare(aTime);
    });
  }, [contacts]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return sorted;
    const q = searchQuery.toLowerCase();
    return sorted.filter(
      (c) => c.email.toLowerCase().includes(q) || (c.name && c.name.toLowerCase().includes(q)),
    );
  }, [sorted, searchQuery]);

  if (contacts.length === 0) return null;

  return (
    <div className={className}>
      {label && (
        <p className="text-xs font-medium text-gray-500 mb-2">{label}</p>
      )}

      {showSearch && (
        <div className="search-wrap" style={{ marginBottom: '0.75rem' }}>
          <svg className="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          <input
            type="text"
            placeholder="Search contacts..."
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )}

      {filtered.length > 0 && (
        <div style={{
          border: '1px solid #e2e8f0', borderRadius: '0.75rem',
          overflow: 'hidden',
        }}>
          {filtered.map((c, i) => (
            <button
              key={c.email}
              type="button"
              onClick={() => onSelect(c)}
              className="encrypt-contact-row"
              style={{
                borderBottom: i < filtered.length - 1 ? '1px solid #f1f5f9' : 'none',
              }}
            >
              <div className="encrypt-contact-avatar">
                {(c.name || c.email).charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.name || c.email}
                </p>
                {c.name && (
                  <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.email}
                  </p>
                )}
              </div>
              {showRecent && c.lastUsed && (
                <span className="encrypt-contact-recent">Recent</span>
              )}
            </button>
          ))}
        </div>
      )}

      {showSearch && searchQuery && filtered.length === 0 && (
        <div className="empty-state" style={{ padding: '1.5rem' }}>
          <p className="empty-msg">No recipients match "{searchQuery}".</p>
        </div>
      )}
    </div>
  );
}
