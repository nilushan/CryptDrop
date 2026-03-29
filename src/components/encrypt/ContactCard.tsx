import type { Contact } from '../../stores/contacts';

interface Props {
  contact: Contact;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}

export default function ContactCard({ contact, isSelected, onSelect, onRemove }: Props) {
  return (
    <div
      className="encrypt-contact-card"
      data-email={contact.email}
      onClick={onSelect}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: isSelected ? '#eef2ff' : '#fff',
        border: `1px solid ${isSelected ? '#6366f1' : '#e5e7eb'}`,
        borderRadius: '0.625rem', padding: '0.75rem 1rem',
        cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', background: '#eef2ff', color: '#4f46e5',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.875rem', fontWeight: 600, flexShrink: 0, userSelect: 'none',
        }}>
          {(contact.name || contact.email).charAt(0).toUpperCase()}
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827', margin: '0 0 0.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {contact.name || contact.email}
          </p>
          {contact.name && (
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {contact.email}
            </p>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          style={{ fontSize: '0.75rem', background: '#4f46e5', color: '#fff', padding: '0.3rem 0.75rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          Encrypt file
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          style={{ color: '#d1d5db', background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.25rem', display: 'flex', alignItems: 'center' }}
          title="Remove contact"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        </button>
      </div>
    </div>
  );
}
