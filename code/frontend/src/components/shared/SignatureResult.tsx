import NoticeBox from './NoticeBox';

interface Props { signatureText: string; }

export default function SignatureResult({ signatureText }: Props) {
  if (!signatureText) return null;
  // Keep the existing signature classification; presentation never infers crypto truth.
  const isVerified = signatureText.includes('verified!');
  const isWarning = signatureText.includes('Warning');
  const isNotChecked = signatureText.includes('not checked');
  if (!isVerified && !isWarning && !isNotChecked) return null;

  return (
    <NoticeBox variant={isVerified ? 'success' : isWarning ? 'warn' : 'info'} className="signature-result">
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
        <path d={isVerified ? 'M9 12l2 2 4-4' : 'M12 8v4M12 16h.01'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span>{isVerified ? 'Signature verified' : isWarning ? 'Signature could not be verified' : 'Signature not checked — no sender key provided'}</span>
    </NoticeBox>
  );
}
