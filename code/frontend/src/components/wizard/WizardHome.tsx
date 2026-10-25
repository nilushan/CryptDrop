interface Props {
  onStartFlow: (flow: 'encrypt' | 'decrypt') => void;
}

export default function WizardHome({ onStartFlow }: Props) {
  return (
    <div className="fade-in">
      <div className="tab-header">
        <div>
          <h1 tabIndex={-1} className="tab-title">A simpler place to start.</h1>
          <p className="tab-subtitle">No PGP experience needed. Choose what you want to do and we’ll walk you through it.</p>
        </div>
      </div>
      <div className="wizard-choice-grid">
        <button onClick={() => onStartFlow('encrypt')} className="card card-btn text-left">
          <div className="card-icon bg-indigo-50">
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="#4f46e5" strokeWidth="2"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round"/></svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-1">Encrypt a File</p>
            <p className="text-xs text-gray-500">Find a recipient's key, then encrypt any file for them.</p>
          </div>
        </button>
        <button onClick={() => onStartFlow('decrypt')} className="card card-btn text-left">
          <div className="card-icon bg-green-50">
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="#16a34a" strokeWidth="2"/><path d="M7 11V7a5 5 0 019.9-1" stroke="#16a34a" strokeWidth="2" strokeLinecap="round"/></svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-1">Decrypt a File</p>
            <p className="text-xs text-gray-500">Set up your private key, then decrypt a file sent to you.</p>
          </div>
        </button>
      </div>
      <div className="text-center mt-4">
        <a href="/how-it-works" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
          How does encryption work? &rarr;
        </a>
      </div>
    </div>
  );
}
