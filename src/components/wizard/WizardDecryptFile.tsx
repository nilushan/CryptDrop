import { $activeTab } from '../../stores/activeTab';
import DecryptFilePanel from '../shared/DecryptFilePanel';

export default function WizardDecryptFile() {
  return (
    <div className="fade-in">
      <DecryptFilePanel
        successActions={(onReset) => (
          <div className="flex gap-2 mt-3" style={{ justifyContent: 'center' }}>
            <button onClick={onReset} className="btn-sm">Unlock Another</button>
            <button onClick={() => $activeTab.set('decrypt')} className="btn-sm btn-ghost-sm">Go to Decrypt tab</button>
          </div>
        )}
      />
    </div>
  );
}
