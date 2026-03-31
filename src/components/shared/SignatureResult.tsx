interface Props {
  signatureText: string;
}

export default function SignatureResult({ signatureText }: Props) {
  if (!signatureText) return null;

  const isVerified = signatureText.includes('verified!');
  const isWarning = signatureText.includes('Warning');
  const isNotChecked = signatureText.includes('not checked');

  if (isVerified) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.5rem',
        padding: '0.625rem 0.875rem', marginTop: '0.75rem',
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, color: '#16a34a' }}>
          <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
        </svg>
        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#166534' }}>Signature verified</span>
      </div>
    );
  }

  if (isWarning) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '0.5rem',
        padding: '0.625rem 0.875rem', marginTop: '0.75rem',
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, color: '#d97706' }}>
          <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#92400e' }}>Signature could not be verified</span>
      </div>
    );
  }

  if (isNotChecked) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem',
        padding: '0.625rem 0.875rem', marginTop: '0.75rem',
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, color: '#94a3b8' }}>
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
          <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Signature not checked — no sender key provided</span>
      </div>
    );
  }

  return null;
}
