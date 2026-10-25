import { $activeTab } from '../../stores/activeTab';
import DecryptFilePanel from '../shared/DecryptFilePanel';

export default function WizardDecryptFile() {
  return (
    <div className="fade-in">
      <DecryptFilePanel
        resultActions={
          <button onClick={() => $activeTab.set('decrypt')} className="btn-sm btn-ghost-sm">
            Go to Decrypt tab
          </button>
        }
      />
    </div>
  );
}
