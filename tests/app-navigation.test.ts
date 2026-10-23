import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initAppNavigation } from '../src/lib/app-navigation';
import { $activeTab } from '../src/stores/activeTab';

const ids = ['encrypt', 'decrypt', 'keyring', 'addressbook', 'wizard'] as const;
let cleanup: (() => void) | undefined;
let mobile = false;

beforeEach(() => {
  mobile = false;
  vi.stubGlobal('matchMedia', () => ({ matches: mobile, addEventListener: vi.fn() }));
  window.history.replaceState(null, '', '/app');
  $activeTab.set('encrypt');
  document.body.innerHTML = `<div role="tablist">${ids.map(id =>
    `<button class="app-tab" role="tab" data-tab="${id}" id="nav-${id}">${id}</button>`,
  ).join('')}</div>${ids.map(id =>
    `<div class="tab-panel" id="tab-${id}" tabindex="0"><input value="keep me" /></div>`,
  ).join('')}`;
});

afterEach(() => {
  cleanup?.();
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
    expect(document.getElementById('nav-keyring')).toHaveAttribute('aria-selected', 'true');
    document.getElementById('nav-encrypt')!.click();
    expect(input.value).toBe('selected file state');
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
  });
});
