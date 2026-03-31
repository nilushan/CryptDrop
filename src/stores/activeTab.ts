import { atom } from 'nanostores';

export type TabId = 'encrypt' | 'decrypt' | 'keyring' | 'addressbook' | 'wizard';

export const $activeTab = atom<TabId>('encrypt');
