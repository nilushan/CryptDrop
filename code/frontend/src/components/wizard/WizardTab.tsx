import { useState, useCallback, useEffect, useRef } from 'react';
import type { Contact } from '../../stores/contacts';
import WizardHome from './WizardHome';
import WizardProgress from './WizardProgress';
import WizardEncryptRecipient from './WizardEncryptRecipient';
import QuickEncryptPanel from '../encrypt/QuickEncryptPanel';
import WizardDecryptKeys from './WizardDecryptKeys';
import WizardDecryptFile from './WizardDecryptFile';

type Flow = 'encrypt' | 'decrypt' | null;

export default function WizardTab() {
  const [flow, setFlow] = useState<Flow>(null);
  const [step, setStep] = useState(0);
  const stepRoot = useRef<HTMLDivElement>(null);
  const previousStep = useRef({ flow, step });
  useEffect(() => {
    if (previousStep.current.flow !== flow || previousStep.current.step !== step) {
      stepRoot.current?.querySelector('h1')?.focus();
    }
    previousStep.current = { flow, step };
  }, [flow, step]);

  // Encrypt flow state
  const [recipientContact, setRecipientContact] = useState<Contact | null>(null);

  function handleStartFlow(f: 'encrypt' | 'decrypt') {
    setFlow(f);
    setStep(1);
  }

  function handleBack() {
    if (!flow || step <= 1) {
      setFlow(null);
      setStep(0);
      setRecipientContact(null);
      return;
    }
    setStep(step - 1);
  }

  function handleAdvance() {
    if (!flow) return;
    const maxSteps = 2;
    if (step < maxSteps) setStep(step + 1);
  }

  const handleRecipientReady = useCallback((contact: Contact) => {
    setRecipientContact(contact);
    setStep(2);
  }, []);

  // No flow selected — show home
  if (!flow) {
    return <div ref={stepRoot}><WizardHome onStartFlow={handleStartFlow} /></div>;
  }

  return (
    <div ref={stepRoot}>
      <h1 tabIndex={-1} className="tab-title wizard-step-heading">
        {flow === 'encrypt' ? (step === 1 ? 'Find a recipient.' : 'Encrypt your file.') : (step === 1 ? 'Set up your private key.' : 'Decrypt your file.')}
      </h1>
      <WizardProgress flow={flow} step={step} onBack={handleBack} />

      {/* Encrypt flow */}
      {flow === 'encrypt' && step === 1 && (
        <WizardEncryptRecipient onRecipientReady={handleRecipientReady} />
      )}
      {flow === 'encrypt' && step === 2 && recipientContact && (
        <QuickEncryptPanel
          contact={recipientContact}
          folderHandle={null}
          onClose={() => setStep(1)}
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
