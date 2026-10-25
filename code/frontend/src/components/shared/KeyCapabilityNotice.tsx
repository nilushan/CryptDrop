import { useStore } from '@nanostores/react';
import { $privateKey } from '../../stores/keys';
import { $activeTab } from '../../stores/activeTab';
import { getKeyCapability, keyCapabilityIconPaths, type KeyTool } from '../../lib/key-capabilities';

export default function KeyCapabilityNotice({ tool }: { tool: KeyTool }) {
  const privateKey = useStore($privateKey);
  const capability = getKeyCapability(tool, !!privateKey);
  if (capability.state === 'available') return null;

  return (
    <div className="key-capability-notice" data-capability={capability.state} role="status"
      aria-label={tool === 'encrypt' ? 'Encryption key status' : 'Decryption key status'}>
      <p className="key-capability-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d={keyCapabilityIconPaths[capability.state]} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {capability.title}
      </p>
      {capability.action && <button type="button" className="key-capability-action" onClick={() => $activeTab.set('keyring')}>{capability.action} <span aria-hidden="true">→</span></button>}
    </div>
  );
}
