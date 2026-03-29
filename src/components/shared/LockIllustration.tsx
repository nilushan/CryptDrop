import { shortName } from '../../lib/file-helpers';

interface Props {
  ownerName: string;
  animationType: 'lock' | 'unlock';
}

export default function LockIllustration({ ownerName, animationType }: Props) {
  const label = animationType === 'lock'
    ? `Sealed with ${ownerName || 'recipient'}'s public key`
    : 'Unlocked with your private key';

  const hint = animationType === 'lock'
    ? `Only ${shortName(ownerName)}'s golden key can open this`
    : 'Your golden key opened the padlock';

  return (
    <div className={`lock-illustration lock-${animationType}`}>
      <svg viewBox="0 0 240 150" className="lock-svg">
        {/* Padlock body */}
        <rect x="55" y="55" width="90" height="80" rx="12" className="lock-body" />
        {/* Keyhole */}
        <circle cx="100" cy="100" r="6" className="lock-keyhole" />
        <rect x="97" y="103" width="6" height="14" rx="2" className="lock-keyhole" />
        {/* Owner name */}
        <text x="100" y="80" textAnchor="middle" className="lock-owner-text">{shortName(ownerName)}</text>
        {/* Shackle */}
        <g className="lock-shackle">
          <path d="M72,57 V38 A28,28 0 0,1 128,38 V57" className="lock-shackle-path" />
        </g>
        {/* Golden key */}
        <g className="lock-key-group">
          <circle cx="200" cy="95" r="14" className="lock-key-bow" />
          <circle cx="200" cy="95" r="5" className="lock-key-inner" />
          <line x1="186" y1="95" x2="158" y2="95" className="lock-key-shaft" />
          <path d="M166,95 V103 M158,95 V106" className="lock-key-teeth" />
        </g>
      </svg>
      <p className="lock-label">{label}</p>
      <p className="lock-hint">{hint}</p>
    </div>
  );
}
