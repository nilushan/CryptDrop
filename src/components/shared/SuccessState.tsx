import LockIllustration from './LockIllustration';

interface Props {
  type: 'encrypt' | 'decrypt';
  ownerName: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}

export default function SuccessState({ type, ownerName, title, description, children }: Props) {
  return (
    <div className="animate-fade-in" style={{ textAlign: 'center', padding: '1.5rem 0' }}>
      <LockIllustration ownerName={ownerName} animationType={type === 'encrypt' ? 'lock' : 'unlock'} />

      <h3 style={{
        fontSize: '1.25rem', fontWeight: 700, color: '#0f172a',
        margin: '0.75rem 0 0.375rem',
      }}>
        {title}
      </h3>
      <p style={{
        fontSize: '0.8125rem', color: '#64748b', margin: '0 0 1.5rem',
        lineHeight: 1.5, padding: '0 1rem',
      }}>
        {description}
      </p>

      {children}
    </div>
  );
}
