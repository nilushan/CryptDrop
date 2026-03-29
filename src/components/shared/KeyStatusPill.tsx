import { useStore } from '@nanostores/react';
import { $privateKey, $userInfo } from '../../stores/keys';

export default function KeyStatusPill() {
  const privateKey = useStore($privateKey);
  const userInfo = useStore($userInfo);

  const loaded = !!privateKey;
  const label = loaded ? (userInfo || 'Key loaded') : 'No keys loaded';
  const className = loaded ? 'key-pill key-pill-ok' : 'key-pill';

  return (
    <div style={{ position: 'fixed', top: '4rem', right: '1rem', zIndex: 50 }}>
      <div className={className}>{label}</div>
    </div>
  );
}
