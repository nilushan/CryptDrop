interface Props {
  flow: 'encrypt' | 'decrypt';
  step: number;
  onBack: () => void;
}

const LABELS: Record<'encrypt' | 'decrypt', string[]> = {
  encrypt: ['Find Recipient', 'Encrypt File'],
  decrypt: ['Your Keys', 'Decrypt File'],
};

export default function WizardProgress({ flow, step, onBack }: Props) {
  const labels = LABELS[flow];

  return (
    <div className="wizard-progress">
      <button onClick={onBack} className="btn-ghost-sm flex items-center gap-1">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Back
      </button>
      <div className="flex items-center gap-2">
        {labels.map((label, i) => {
          const stepNum = i + 1;
          const isCompleted = stepNum < step;
          const isCurrent = stepNum === step;
          return (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 600, flexShrink: 0,
                background: isCompleted ? '#16a34a' : isCurrent ? '#4f46e5' : '#e5e7eb',
                color: (isCompleted || isCurrent) ? '#fff' : '#9ca3af',
              }}>
                {isCompleted ? '✓' : stepNum}
              </div>
              <span style={{
                fontSize: 12, whiteSpace: 'nowrap',
                color: isCurrent ? '#4f46e5' : '#9ca3af',
                fontWeight: isCurrent ? 500 : 400,
              }}>
                {label}
              </span>
              {i < labels.length - 1 && (
                <div style={{ width: 20, height: 1, background: '#d1d5db', margin: '0 2px' }} />
              )}
            </div>
          );
        })}
      </div>
      <div style={{ width: 48 }} />
    </div>
  );
}
