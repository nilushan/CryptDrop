import { describe, it, expect, beforeEach } from 'vitest';
import { setupDOM, getState } from './setup.ts';

describe('Tab Navigation', () => {
  beforeEach(() => {
    setupDOM();
  });

  it('should default to encrypt tab active', () => {
    const encryptTab = document.querySelector('.app-tab[data-tab="encrypt"]')!;
    expect(encryptTab.classList.contains('active')).toBe(true);
  });

  it('should show encrypt panel and hide others on load', () => {
    expect(document.getElementById('tab-encrypt')!.classList.contains('hidden')).toBe(false);
    expect(document.getElementById('tab-decrypt')!.classList.contains('hidden')).toBe(true);
    expect(document.getElementById('tab-keys')!.classList.contains('hidden')).toBe(true);
    expect(document.getElementById('tab-wizard')!.classList.contains('hidden')).toBe(true);
  });

  it('should switch to decrypt tab', () => {
    window.switchTab('decrypt');
    expect(document.getElementById('tab-decrypt')!.classList.contains('hidden')).toBe(false);
    expect(document.getElementById('tab-encrypt')!.classList.contains('hidden')).toBe(true);
    expect(window.activeTab).toBe('decrypt');
  });

  it('should switch to keys tab', () => {
    window.switchTab('keys');
    expect(document.getElementById('tab-keys')!.classList.contains('hidden')).toBe(false);
    expect(window.activeTab).toBe('keys');
  });

  it('should switch to wizard tab', () => {
    window.switchTab('wizard');
    expect(document.getElementById('tab-wizard')!.classList.contains('hidden')).toBe(false);
    expect(window.activeTab).toBe('wizard');
  });

  it('should mark only the active tab button as active', () => {
    window.switchTab('decrypt');
    const tabs = Array.from(document.querySelectorAll('.app-tab'));
    const activeTabs = tabs.filter(t => t.classList.contains('active'));
    expect(activeTabs.length).toBe(1);
    expect((activeTabs[0] as HTMLElement).dataset.tab).toBe('decrypt');
  });
});

describe('Wizard Navigation', () => {
  beforeEach(() => {
    setupDOM();
    window.switchTab('wizard');
  });

  describe('Initial Wizard State', () => {
    it('should show wizard home on load', () => {
      expect(document.getElementById('wizard-home')!.classList.contains('hidden')).toBe(false);
    });

    it('should hide all wizard screens on load', () => {
      const screens = ['wizard-encrypt-recipient', 'wizard-encrypt-file', 'wizard-decrypt-keys', 'wizard-decrypt-file'];
      screens.forEach(id => {
        expect(document.getElementById(id)!.classList.contains('hidden')).toBe(true);
      });
    });

    it('should hide wizard progress on load', () => {
      expect(document.getElementById('wizard-progress')!.classList.contains('hidden')).toBe(true);
    });

    it('should have null wizardFlow and step 0', () => {
      expect(window.wizardFlow).toBeNull();
      expect(window.wizardStep).toBe(0);
    });
  });

  describe('startWizardFlow()', () => {
    it('should set encrypt flow and step 1', () => {
      window.startWizardFlow('encrypt');
      expect(window.wizardFlow).toBe('encrypt');
      expect(window.wizardStep).toBe(1);
    });

    it('should show recipient screen when starting encrypt flow', () => {
      window.startWizardFlow('encrypt');
      expect(document.getElementById('wizard-encrypt-recipient')!.classList.contains('hidden')).toBe(false);
      expect(document.getElementById('wizard-home')!.classList.contains('hidden')).toBe(true);
    });

    it('should set decrypt flow and step 1', () => {
      window.startWizardFlow('decrypt');
      expect(window.wizardFlow).toBe('decrypt');
      expect(window.wizardStep).toBe(1);
    });

    it('should show decrypt keys screen when starting decrypt flow', () => {
      window.startWizardFlow('decrypt');
      expect(document.getElementById('wizard-decrypt-keys')!.classList.contains('hidden')).toBe(false);
    });

    it('should show wizard progress bar', () => {
      window.startWizardFlow('encrypt');
      expect(document.getElementById('wizard-progress')!.classList.contains('hidden')).toBe(false);
    });
  });

  describe('wizardAdvance() — encrypt flow', () => {
    it('should advance from step 1 to step 2', () => {
      window.startWizardFlow('encrypt');
      window.wizardAdvance();
      expect(window.wizardStep).toBe(2);
      expect(document.getElementById('wizard-encrypt-file')!.classList.contains('hidden')).toBe(false);
      expect(document.getElementById('wizard-encrypt-recipient')!.classList.contains('hidden')).toBe(true);
    });

    it('should not advance past step 2', () => {
      window.startWizardFlow('encrypt');
      window.wizardAdvance();
      window.wizardAdvance(); // no-op
      expect(window.wizardStep).toBe(2);
    });
  });

  describe('wizardAdvance() — decrypt flow', () => {
    it('should advance from step 1 to step 2', () => {
      window.startWizardFlow('decrypt');
      window.wizardAdvance();
      expect(window.wizardStep).toBe(2);
      expect(document.getElementById('wizard-decrypt-file')!.classList.contains('hidden')).toBe(false);
    });

    it('should not advance past step 2', () => {
      window.startWizardFlow('decrypt');
      window.wizardAdvance();
      window.wizardAdvance();
      expect(window.wizardStep).toBe(2);
    });
  });

  describe('wizardAdvance() — edge cases', () => {
    it('should do nothing if no flow is active', () => {
      window.wizardAdvance();
      expect(window.wizardStep).toBe(0);
    });
  });

  describe('wizardBack()', () => {
    it('should go back from step 2 to step 1', () => {
      window.startWizardFlow('encrypt');
      window.wizardAdvance();
      window.wizardBack();
      expect(window.wizardStep).toBe(1);
      expect(document.getElementById('wizard-encrypt-recipient')!.classList.contains('hidden')).toBe(false);
    });

    it('should return to wizard home from step 1', () => {
      window.startWizardFlow('encrypt');
      window.wizardBack();
      expect(window.wizardFlow).toBeNull();
      expect(window.wizardStep).toBe(0);
      expect(document.getElementById('wizard-home')!.classList.contains('hidden')).toBe(false);
    });

    it('should return to wizard home when no flow is active', () => {
      window.wizardBack();
      expect(window.wizardStep).toBe(0);
      expect(document.getElementById('wizard-home')!.classList.contains('hidden')).toBe(false);
    });
  });

  describe('Wizard Progress Bar', () => {
    it('should render 2 step indicators for encrypt flow', () => {
      window.startWizardFlow('encrypt');
      const indicators = document.getElementById('wizard-step-indicators')!;
      expect(indicators.children.length).toBe(2);
    });

    it('should render 2 step indicators for decrypt flow', () => {
      window.startWizardFlow('decrypt');
      const indicators = document.getElementById('wizard-step-indicators')!;
      expect(indicators.children.length).toBe(2);
    });

    it('should show correct labels for encrypt flow', () => {
      window.startWizardFlow('encrypt');
      const indicators = document.getElementById('wizard-step-indicators')!;
      const labels = Array.from(indicators.querySelectorAll('span'));
      expect(labels[0].textContent).toBe('Find Recipient');
      expect(labels[1].textContent).toBe('Encrypt File');
    });

    it('should show correct labels for decrypt flow', () => {
      window.startWizardFlow('decrypt');
      const indicators = document.getElementById('wizard-step-indicators')!;
      const labels = Array.from(indicators.querySelectorAll('span'));
      expect(labels[0].textContent).toBe('Your Keys');
      expect(labels[1].textContent).toBe('Decrypt File');
    });
  });
});
