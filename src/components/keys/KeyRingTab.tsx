import PrivateKeyPanel from './PrivateKeyPanel';

export default function KeyRingTab() {
  return (
    <div>
      <div className="tab-header">
        <div>
          <h2 className="tab-title">My Key Ring</h2>
          <p className="tab-subtitle">Generate, import, or manage your private key. Everything stays in your browser.</p>
        </div>
      </div>
      <PrivateKeyPanel />
    </div>
  );
}
