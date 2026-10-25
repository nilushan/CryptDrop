import PrivateKeyPanel from './PrivateKeyPanel';

export default function KeyRingTab() {
  return (
    <div>
      <div className="tab-header">
        <div>
          <h1 className="tab-title">Your key ring.</h1>
          <p className="tab-subtitle">Create a new identity or import your existing private key. Keep a backup: lost private keys cannot be recovered.</p>
        </div>
      </div>
      <PrivateKeyPanel />
    </div>
  );
}
