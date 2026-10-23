import { useId } from 'react';

interface Props {
  onGenerate: () => void;
  onImport: () => void;
}

export default function KeyChoiceGrid({ onGenerate, onImport }: Props) {
  const id = useId();
  return (
    <section aria-labelledby={`${id}-heading`}>
      <h3 id={`${id}-heading`} className="keys-actions-heading">Set up your private key</h3>
      <div className="keys-choice-grid">
        <button type="button" onClick={onGenerate} className="keys-choice-card keys-choice-primary"
          aria-labelledby={`${id}-generate`} aria-describedby={`${id}-generate-desc`}>
          <span className="keys-choice-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2"/></svg>
          </span>
          <span id={`${id}-generate`} className="keys-choice-title">Generate a New Key Pair</span>
          <span id={`${id}-generate-desc`} className="keys-choice-desc">Create fresh Curve25519 keys. Your private key downloads immediately.</span>
          <span className="keys-choice-cta" aria-hidden="true">Create new keys <span>→</span></span>
        </button>
        <button type="button" onClick={onImport} className="keys-choice-card"
          aria-labelledby={`${id}-import`} aria-describedby={`${id}-import-desc`}>
          <span className="keys-choice-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </span>
          <span id={`${id}-import`} className="keys-choice-title">Import Existing Key</span>
          <span id={`${id}-import-desc`} className="keys-choice-desc">Load a private key file (.asc) you already have.</span>
          <span className="keys-choice-cta" aria-hidden="true">Choose a key file <span>→</span></span>
        </button>
      </div>
    </section>
  );
}
