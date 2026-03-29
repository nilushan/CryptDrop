import { useState, useCallback } from 'react';
import type { PublicKey } from 'openpgp';
import WizardHome from './WizardHome';
import WizardProgress from './WizardProgress';
import WizardEncryptRecipient from './WizardEncryptRecipient';
import WizardEncryptFile from './WizardEncryptFile';
import WizardDecryptKeys from './WizardDecryptKeys';
import WizardDecryptFile from './WizardDecryptFile';

type Flow = 'encrypt' | 'decrypt' | null;

export default function WizardTab() {
  const [flow, setFlow] = useState<Flow>(null);
  const [step, setStep] = useState(0);

  // Encrypt flow state
  const [recipientKey, setRecipientKey] = useState<PublicKey | null>(null);
  const [recipientInfo, setRecipientInfo] = useState<RecipientInfo | null>(null);

  function handleStartFlow(f: 'encrypt' | 'decrypt') {
    setFlow(f);
    setStep(1);
  }

  function handleBack() {
    if (!flow || step <= 1) {
      setFlow(null);
      setStep(0);
      setRecipientKey(null);
      setRecipientInfo(null);
      return;
    }
    setStep(step - 1);
  }

  function handleAdvance() {
    if (!flow) return;
    const maxSteps = 2;
    if (step < maxSteps) setStep(step + 1);
  }

  const handleRecipientReady = useCallback((key: PublicKey, info: RecipientInfo) => {
    setRecipientKey(key);
    setRecipientInfo(info);
    // Auto-advance to step 2
    setStep(2);
  }, []);

  // No flow selected — show home
  if (!flow) {
    return <WizardHome onStartFlow={handleStartFlow} />;
  }

  return (
    <div>
      <WizardProgress flow={flow} step={step} onBack={handleBack} />

      {/* Encrypt flow */}
      {flow === 'encrypt' && step === 1 && (
        <WizardEncryptRecipient onRecipientReady={handleRecipientReady} />
      )}
      {flow === 'encrypt' && step === 2 && recipientKey && recipientInfo && (
        <WizardEncryptFile
          recipientKey={recipientKey}
          recipientInfo={recipientInfo}
          onBack={() => setStep(1)}
        />
      )}

      {/* Decrypt flow */}
      {flow === 'decrypt' && step === 1 && (
        <WizardDecryptKeys onAdvance={handleAdvance} />
      )}
      {flow === 'decrypt' && step === 2 && (
        <WizardDecryptFile />
      )}
    </div>
  );
}
