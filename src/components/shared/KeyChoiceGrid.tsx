interface Props {
  onGenerate: () => void;
  onImport: () => void;
}

export default function KeyChoiceGrid({ onGenerate, onImport }: Props) {
  return (
    <div className="keys-choice-grid">
      <button onClick={onGenerate} className="keys-choice-card">
        <div className="keys-choice-icon keys-choice-icon-generate">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        </div>
        <p className="keys-choice-title">Generate a New Key Pair</p>
        <p className="keys-choice-desc">Create fresh Curve25519 keys. Your private key downloads immediately.</p>
      </button>
      <button onClick={onImport} className="keys-choice-card">
        <div className="keys-choice-icon keys-choice-icon-import">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <p className="keys-choice-title">Import Existing Key</p>
        <p className="keys-choice-desc">Load a private key file (.asc) you already have.</p>
      </button>
    </div>
  );
}
