import { $activeTab, type TabId } from '../stores/activeTab';
import { $privateKey } from '../stores/keys';
import { getKeyCapability, keyCapabilityIconPaths } from './key-capabilities';

const tabIds: TabId[] = ['encrypt', 'decrypt', 'keyring', 'addressbook', 'wizard'];

/** Connect static Astro panels to the shared island state without remounting forms. */
export function initAppNavigation() {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('.app-tab[data-tab]'));
  const controller = new AbortController();
  const { signal } = controller;
  const media = window.matchMedia('(max-width: 760px)');
  const tablist = document.querySelector('[role="tablist"]');
  const setOrientation = () => tablist?.setAttribute('aria-orientation', media.matches ? 'horizontal' : 'vertical');
  setOrientation();
  media.addEventListener('change', setOrientation, { signal });

  function readUrl() {
    const tab = new URLSearchParams(window.location.search).get('tab');
    $activeTab.set(tabIds.includes(tab as TabId) ? tab as TabId : 'encrypt');
  }
  readUrl();
  window.addEventListener('popstate', readUrl, { signal });

  // The key ring is a separate, always-tabbable button above the file-tool tabs.
  // Keep the last tool reachable by Tab while its panel is not selected.
  let lastToolTab = buttons[0]?.dataset.tab;
  const unsubscribe = $activeTab.subscribe((tab) => {
    const selectedTool = buttons.find((button) => button.dataset.tab === tab);
    if (selectedTool) lastToolTab = tab;
    const previousPanel = document.activeElement?.closest('.tab-panel');
    for (const id of tabIds) {
      const panel = document.getElementById(`tab-${id}`);
      if (!panel) continue;
      panel.hidden = id !== tab;
      panel.classList.toggle('hidden', id !== tab);
    }
    for (const button of buttons) {
      const selected = button.dataset.tab === tab;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected || (!selectedTool && button.dataset.tab === lastToolTab) ? 0 : -1;
    }
    // A cross-island action must not leave focus inside the panel it just hid.
    if (previousPanel && previousPanel.id !== `tab-${tab}`) {
      document.getElementById(`tab-${tab}`)?.focus();
    }
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState(window.history.state, '', url);
  });

  const unsubscribeKey = $privateKey.subscribe((key) => {
    for (const button of buttons) {
      const tool = button.dataset.tab;
      if (tool !== 'encrypt' && tool !== 'decrypt') continue;
      const capability = getKeyCapability(tool, !!key);
      button.dataset.capability = capability.state;
      const available = capability.state === 'available';
      const badge = button.querySelector<HTMLElement>('.nav-status-badge');
      const hint = button.querySelector<HTMLElement>('.nav-hint');
      if (badge) badge.hidden = available;
      if (hint) hint.hidden = !available;
      const label = button.querySelector('.nav-status-label');
      const icon = button.querySelector('.nav-status-icon path');
      if (label) label.textContent = capability.mobileHint;
      icon?.setAttribute('d', keyCapabilityIconPaths[capability.state]);
      button.setAttribute('aria-label', `${button.dataset.label ?? tool}. ${capability.navHint}`);
    }
  });

  buttons.forEach((button, index) => {
    button.addEventListener('click', () => $activeTab.set(button.dataset.tab as TabId), { signal });
    button.addEventListener('keydown', (event) => {
      let next: number;
      if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = buttons.length - 1;
      else if (event.key === (media.matches ? 'ArrowRight' : 'ArrowDown')) next = (index + 1) % buttons.length;
      else if (event.key === (media.matches ? 'ArrowLeft' : 'ArrowUp')) next = (index - 1 + buttons.length) % buttons.length;
      else return;
      event.preventDefault();
      buttons[next].focus();
      $activeTab.set(buttons[next].dataset.tab as TabId);
    }, { signal });
  });

  return () => { controller.abort(); unsubscribe(); unsubscribeKey(); };
}
