import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initAppNavigation } from '../src/lib/app-navigation';
import { keyCapabilityIconPaths } from '../src/lib/key-capabilities';
import { $activeTab } from '../src/stores/activeTab';
import { $privateKey, clearKeys } from '../src/stores/keys';
import type { PrivateKey } from 'openpgp';

const ids = ['encrypt', 'decrypt', 'keyring', 'addressbook', 'wizard'] as const;
let cleanup: (() => void) | undefined;
let mobile = false;

beforeEach(() => {
  mobile = false;
  vi.stubGlobal('matchMedia', () => ({ matches: mobile, addEventListener: vi.fn() }));
  window.history.replaceState(null, '', '/app');
  $activeTab.set('encrypt');
  clearKeys();
  document.body.innerHTML = `<button id="nav-keyring" aria-controls="tab-keyring">My key ring</button><div role="tablist">${ids.filter(id => id !== 'keyring').map(id =>
    `<button class="app-tab" role="tab" data-tab="${id}" id="nav-${id}">${id}${id === 'encrypt' || id === 'decrypt'
      ? '<span class="nav-hint" hidden>Tool description</span><span class="nav-status-badge" aria-hidden="true"><svg class="nav-status-icon"><path /></svg><span class="nav-status-label"></span></span>'
      : '<span class="nav-hint">Tool description</span>'}</button>`,
  ).join('')}</div>${ids.map(id =>
    `<div class="tab-panel" id="tab-${id}" tabindex="0"><input value="keep me" /></div>`,
  ).join('')}`;
});

afterEach(() => {
  cleanup?.();
  clearKeys();
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

describe('workspace navigation', () => {
  it('opens validated deep links and exposes one selected tab and panel', () => {
    window.history.replaceState(null, '', '/app?tab=decrypt&source=test');
    cleanup = initAppNavigation();
    expect($activeTab.get()).toBe('decrypt');
    expect(document.querySelectorAll('[aria-selected="true"]')).toHaveLength(1);
    expect(document.querySelectorAll('.tab-panel:not([hidden])')).toHaveLength(1);
    expect(document.getElementById('tab-decrypt')).not.toHaveAttribute('hidden');
    expect(window.location.search).toContain('source=test');
  });

  it('falls back to Encrypt for an invalid tab', () => {
    window.history.replaceState(null, '', '/app?tab=bogus');
    cleanup = initAppNavigation();
    expect($activeTab.get()).toBe('encrypt');
    expect(window.location.search).toBe('?tab=encrypt');
  });

  it('supports vertical arrow keys, wrapping, Home and End', () => {
    cleanup = initAppNavigation();
    const encrypt = document.getElementById('nav-encrypt')!;
    encrypt.focus();
    encrypt.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(document.activeElement?.id).toBe('nav-wizard');
    document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    expect($activeTab.get()).toBe('encrypt');
    encrypt.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect($activeTab.get()).toBe('wizard');
    expect(document.querySelectorAll('.app-tab[tabindex="0"]')).toHaveLength(1);
  });

  it('uses horizontal navigation on mobile', () => {
    mobile = true;
    cleanup = initAppNavigation();
    expect(document.querySelector('[role="tablist"]')).toHaveAttribute('aria-orientation', 'horizontal');
    document.getElementById('nav-encrypt')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect($activeTab.get()).toBe('decrypt');
  });

  it('preserves form state and moves focus out of a panel hidden by an island action', () => {
    cleanup = initAppNavigation();
    const input = document.querySelector<HTMLInputElement>('#tab-encrypt input')!;
    input.value = 'selected file state';
    input.focus();
    $activeTab.set('keyring');
    expect(document.activeElement?.id).toBe('tab-keyring');
    expect(document.querySelectorAll('.app-tab[aria-selected="true"]')).toHaveLength(0);
    expect(document.getElementById('nav-encrypt')).toHaveAttribute('tabindex', '0');
    document.getElementById('nav-encrypt')!.click();
    expect(input.value).toBe('selected file state');
  });

  it('keeps tools keyboard-reachable when opening the separate key ring directly', () => {
    window.history.replaceState(null, '', '/app?tab=keyring');
    cleanup = initAppNavigation();
    expect(document.getElementById('tab-keyring')).not.toHaveAttribute('hidden');
    expect(document.querySelectorAll('.app-tab[tabindex="0"]')).toHaveLength(1);
    const encrypt = document.getElementById('nav-encrypt')!;
    encrypt.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect($activeTab.get()).toBe('decrypt');
    $activeTab.set('keyring');
    expect(document.getElementById('nav-decrypt')).toHaveAttribute('tabindex', '0');
  });

  it('reactively updates status badge text, icons and accessible names without disabling navigation', () => {
    cleanup = initAppNavigation();
    const encrypt = document.getElementById('nav-encrypt')!;
    const decrypt = document.getElementById('nav-decrypt')!;
    expect(encrypt).toHaveAttribute('data-capability', 'limited');
    expect(encrypt).toHaveAccessibleName(/Unsigned encryption only/);
    expect(decrypt).toHaveAttribute('data-capability', 'blocked');
    expect(encrypt.querySelector('.nav-status-label')).toHaveTextContent('Unsigned');
    expect(encrypt.querySelector('.nav-status-icon path')).toHaveAttribute('d', keyCapabilityIconPaths.limited);
    expect(decrypt.querySelector('.nav-status-label')).toHaveTextContent('Key needed');
    expect(decrypt.querySelector('.nav-status-icon path')).toHaveAttribute('d', keyCapabilityIconPaths.blocked);
    for (const button of [encrypt, decrypt]) {
      expect(button.querySelector('.nav-status-badge')).not.toHaveAttribute('hidden');
      expect(button.querySelector('.nav-hint')).toHaveAttribute('hidden');
    }
    expect(decrypt).toBeEnabled();
    decrypt.click();
    expect($activeTab.get()).toBe('decrypt');
    $privateKey.set({} as PrivateKey);
    expect(encrypt).toHaveAttribute('data-capability', 'available');
    expect(encrypt).toHaveAccessibleName(/Signing available/);
    expect(decrypt).toHaveAccessibleName(/Private key loaded/);
    expect(encrypt.querySelector('.nav-status-label')).toHaveTextContent('Can sign');
    expect(decrypt.querySelector('.nav-status-label')).toHaveTextContent('Key loaded');
    for (const button of [encrypt, decrypt]) {
      expect(button.querySelector('.nav-status-icon path')).toHaveAttribute('d', keyCapabilityIconPaths.available);
      expect(button.querySelector('.nav-status-badge')).toHaveAttribute('hidden');
      expect(button.querySelector('.nav-hint')).not.toHaveAttribute('hidden');
    }
    expect(decrypt).toHaveClass('active');
    clearKeys();
    expect(decrypt).toHaveAttribute('data-capability', 'blocked');
    expect(decrypt.querySelector('.nav-status-label')).toHaveTextContent('Key needed');
    expect(decrypt.querySelector('.nav-status-icon path')).toHaveAttribute('d', keyCapabilityIconPaths.blocked);
    expect(encrypt.querySelector('.nav-status-icon path')).toHaveAttribute('d', keyCapabilityIconPaths.limited);
    for (const button of [encrypt, decrypt]) {
      expect(button.querySelector('.nav-status-badge')).not.toHaveAttribute('hidden');
      expect(button.querySelector('.nav-hint')).toHaveAttribute('hidden');
    }
    for (const id of ['addressbook', 'wizard']) {
      const button = document.getElementById(`nav-${id}`)!;
      expect(button).not.toHaveAttribute('data-capability');
      expect(button.querySelector('.nav-status-badge')).toBeNull();
      expect(button.querySelector('.nav-hint')).toHaveTextContent('Tool description');
    }
  });

  it('responds to browser history navigation', () => {
    cleanup = initAppNavigation();
    window.history.replaceState(null, '', '/app?tab=addressbook');
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect($activeTab.get()).toBe('addressbook');
  });

  it('removes event handlers and store listeners on cleanup', () => {
    cleanup = initAppNavigation();
    cleanup();
    document.getElementById('nav-decrypt')!.click();
    expect($activeTab.get()).toBe('encrypt');
    $activeTab.set('wizard');
    expect(document.getElementById('nav-encrypt')).toHaveAttribute('aria-selected', 'true');
    $privateKey.set({} as PrivateKey);
    expect(document.getElementById('nav-encrypt')).toHaveAttribute('data-capability', 'limited');
  });
});
