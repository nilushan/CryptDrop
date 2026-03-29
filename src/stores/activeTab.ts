import { atom } from 'nanostores';

export type TabId = 'encrypt' | 'decrypt' | 'keys' | 'wizard';

export const $activeTab = atom<TabId>('encrypt');
