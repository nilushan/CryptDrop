import { describe, it, expect, beforeEach } from 'vitest';
import { setupDOM, getState } from './setup.ts';

describe('Wizard Navigation', () => {
  beforeEach(() => {
    setupDOM();
  });

  describe('Initial State', () => {
    it('should show path selection screen on load', () => {
      const pathSelect = document.getElementById('screen-path-select')!;
      expect(pathSelect.classList.contains('hidden')).toBe(false);
    });

    it('should hide all flow screens on load', () => {
      const screens = ['screen-encrypt-recipient', 'screen-encrypt-file', 'screen-decrypt-keys', 'screen-decrypt-file'];
      screens.forEach(id => {
        expect(document.getElementById(id)!.classList.contains('hidden')).toBe(true);
      });
    });

    it('should hide progress bar on load', () => {
      expect(document.getElementById('progress-bar')!.classList.contains('hidden')).toBe(true);
    });

    it('should have null flow and step 0', () => {
      const state = getState();
      expect(state.currentFlow).toBeNull();
      expect(state.currentStep).toBe(0);
    });
  });

  describe('startFlow()', () => {
    it('should set encrypt flow and step 1', () => {
      window.startFlow('encrypt');
      const state = getState();
      expect(state.currentFlow).toBe('encrypt');
      expect(state.currentStep).toBe(1);
    });

    it('should show recipient screen when starting encrypt flow (no keys step)', () => {
      window.startFlow('encrypt');
      expect(document.getElementById('screen-encrypt-recipient')!.classList.contains('hidden')).toBe(false);
      expect(document.getElementById('screen-path-select')!.classList.contains('hidden')).toBe(true);
    });

    it('should set decrypt flow and step 1', () => {
      window.startFlow('decrypt');
      const state = getState();
      expect(state.currentFlow).toBe('decrypt');
      expect(state.currentStep).toBe(1);
    });

    it('should show decrypt keys screen when starting decrypt flow', () => {
      window.startFlow('decrypt');
      expect(document.getElementById('screen-decrypt-keys')!.classList.contains('hidden')).toBe(false);
      expect(document.getElementById('screen-path-select')!.classList.contains('hidden')).toBe(true);
    });

    it('should show progress bar', () => {
      window.startFlow('encrypt');
      expect(document.getElementById('progress-bar')!.classList.contains('hidden')).toBe(false);
    });
  });

  describe('advanceStep() — encrypt flow (2 steps)', () => {
    it('should advance from step 1 (recipient) to step 2 (file)', () => {
      window.startFlow('encrypt');
      window.advanceStep();
      const state = getState();
      expect(state.currentStep).toBe(2);
      expect(document.getElementById('screen-encrypt-file')!.classList.contains('hidden')).toBe(false);
      expect(document.getElementById('screen-encrypt-recipient')!.classList.contains('hidden')).toBe(true);
    });

    it('should not advance past step 2 in encrypt flow', () => {
      window.startFlow('encrypt');
      window.advanceStep();
      window.advanceStep(); // Should be a no-op
      expect(getState().currentStep).toBe(2);
    });
  });

  describe('advanceStep() — decrypt flow (2 steps)', () => {
    it('should advance from step 1 (keys) to step 2 (file)', () => {
      window.startFlow('decrypt');
      window.advanceStep();
      const state = getState();
      expect(state.currentStep).toBe(2);
      expect(document.getElementById('screen-decrypt-file')!.classList.contains('hidden')).toBe(false);
    });

    it('should not advance past step 2 in decrypt flow', () => {
      window.startFlow('decrypt');
      window.advanceStep();
      window.advanceStep(); // Should be a no-op
      expect(getState().currentStep).toBe(2);
    });
  });

  describe('advanceStep() — edge cases', () => {
    it('should do nothing if no flow is active', () => {
      window.advanceStep();
      expect(getState().currentStep).toBe(0);
    });
  });

  describe('navigateBack()', () => {
    it('should go back from step 2 to step 1 in encrypt flow', () => {
      window.startFlow('encrypt');
      window.advanceStep();
      window.navigateBack();
      expect(getState().currentStep).toBe(1);
      expect(document.getElementById('screen-encrypt-recipient')!.classList.contains('hidden')).toBe(false);
    });

    it('should return to path selection from step 1', () => {
      window.startFlow('encrypt');
      window.navigateBack();
      expect(getState().currentFlow).toBeNull();
      expect(getState().currentStep).toBe(0);
      expect(document.getElementById('screen-path-select')!.classList.contains('hidden')).toBe(false);
    });

    it('should do nothing if no flow is active', () => {
      window.navigateBack();
      expect(getState().currentStep).toBe(0);
    });
  });

  describe('startOver()', () => {
    it('should reset to path selection', () => {
      window.startFlow('encrypt');
      window.advanceStep();
      window.startOver();
      expect(getState().currentFlow).toBeNull();
      expect(getState().currentStep).toBe(0);
      expect(document.getElementById('screen-path-select')!.classList.contains('hidden')).toBe(false);
    });

    it('should clear recipient and file state', () => {
      window.startFlow('encrypt');
      const state = getState();
      state.recipientKey = 'mock' as unknown as import('openpgp').PublicKey;
      state.selectedFile = 'mock' as unknown as File;
      state.senderKey = 'mock' as unknown as import('openpgp').PublicKey;
      state.encryptedFile = 'mock' as unknown as File;
      window.startOver();
      expect(state.recipientKey).toBeNull();
      expect(state.selectedFile).toBeNull();
      expect(state.senderKey).toBeNull();
      expect(state.encryptedFile).toBeNull();
    });

    it('should hide progress bar', () => {
      window.startFlow('encrypt');
      window.startOver();
      expect(document.getElementById('progress-bar')!.classList.contains('hidden')).toBe(true);
    });
  });

  describe('showScreen()', () => {
    it('should show exactly one screen at a time', () => {
      window.showScreen('screen-encrypt-file');
      const allScreenIds = window.getAllScreenIds();
      allScreenIds.forEach(id => {
        const el = document.getElementById(id)!;
        if (id === 'screen-encrypt-file') {
          expect(el.classList.contains('hidden')).toBe(false);
        } else {
          expect(el.classList.contains('hidden')).toBe(true);
        }
      });
    });
  });
});

describe('Progress Bar', () => {
  beforeEach(() => {
    setupDOM();
  });

  it('should render 2 step indicators for encrypt flow', () => {
    window.startFlow('encrypt');
    const indicators = document.getElementById('step-indicators')!;
    expect(indicators.children.length).toBe(2);
  });

  it('should render 2 step indicators for decrypt flow', () => {
    window.startFlow('decrypt');
    const indicators = document.getElementById('step-indicators')!;
    expect(indicators.children.length).toBe(2);
  });

  it('should mark step 1 as current when on step 1', () => {
    window.startFlow('encrypt');
    const indicators = document.getElementById('step-indicators')!;
    const firstCircle = indicators.children[0].querySelector('div')!;
    expect(firstCircle.className).toContain('bg-indigo-600');
  });

  it('should mark step 1 as completed when on step 2', () => {
    window.startFlow('encrypt');
    window.advanceStep();
    const indicators = document.getElementById('step-indicators')!;
    const firstCircle = indicators.children[0].querySelector('div')!;
    expect(firstCircle.className).toContain('bg-green-600');
    expect(firstCircle.textContent).toBe('\u2713');
  });

  it('should show correct labels for encrypt flow', () => {
    window.startFlow('encrypt');
    const indicators = document.getElementById('step-indicators')!;
    const labels = Array.from(indicators.querySelectorAll('span'));
    expect(labels[0].textContent).toBe('Find Recipient');
    expect(labels[1].textContent).toBe('Encrypt File');
  });

  it('should show correct labels for decrypt flow', () => {
    window.startFlow('decrypt');
    const indicators = document.getElementById('step-indicators')!;
    const labels = Array.from(indicators.querySelectorAll('span'));
    expect(labels[0].textContent).toBe('Your Keys');
    expect(labels[1].textContent).toBe('Decrypt File');
  });
});
