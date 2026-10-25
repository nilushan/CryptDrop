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
  return (
    <div className="wizard-progress">
      <button type="button" onClick={onBack} className="btn-ghost-sm">
        <span aria-hidden="true">← </span>Back
      </button>
      <ol className="wizard-step-list" aria-label="Setup progress">
        {LABELS[flow].map((label, i) => (
          <li key={label} aria-current={i + 1 === step ? 'step' : undefined} data-completed={i + 1 < step}>
            <span className="wizard-step-number" aria-hidden="true">{i + 1 < step ? '✓' : i + 1}</span>
            <span>{label}</span>
            <span className="sr-only">{i + 1 < step ? ' (completed)' : ''}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
