import { atom } from 'nanostores';

export type TabId = 'encrypt' | 'decrypt' | 'keyring' | 'addressbook' | 'wizard';

// First-time visitors land on the Wizard; returning users stay on Encrypt.
const isFirstVisit = typeof localStorage !== 'undefined' && !localStorage.getItem('cryptdrop_visited');
if (isFirstVisit && typeof localStorage !== 'undefined') {
  localStorage.setItem('cryptdrop_visited', '1');
}

export const $activeTab = atom<TabId>(isFirstVisit ? 'wizard' : 'encrypt');
