import { useState, useMemo, useEffect, useId } from 'react';
import { useStore } from '@nanostores/react';
import { $contacts, type Contact } from '../../stores/contacts';
import { $activeTab } from '../../stores/activeTab';
import ContactAvatar from './ContactAvatar';
import FormField from './FormField';

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
  const searchId = useId();
  const contacts = useStore($contacts);
  const [searchQuery, setSearchQuery] = useState('');
  const activeTab = useStore($activeTab);

  // Clear stale search text whenever the user switches tabs
  useEffect(() => {
    if (showSearch) setSearchQuery('');
  }, [activeTab]);

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
        <FormField id={searchId} label="Search contacts">
          <div className="search-wrap">
            <svg aria-hidden="true" className="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            <input
              id={searchId}
              type="text"
              placeholder="Search contacts..."
              className="search-input"
              autoComplete="off"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </FormField>
      )}

      {filtered.length > 0 && (
        <div className="contact-picker-list">
          {filtered.map((c) => (
            <button
              key={c.email}
              type="button"
              onClick={() => onSelect(c)}
              className="encrypt-contact-row"
            >
              <ContactAvatar name={c.name || c.email} />
              <div className="contact-picker-info">
                <p className="contact-picker-name">
                  {c.name || c.email}
                </p>
                {c.name && (
                  <p className="contact-picker-email">
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
        <div className="empty-state" role="status">
          <p className="empty-msg">No recipients match "{searchQuery}".</p>
        </div>
      )}
    </div>
  );
}
