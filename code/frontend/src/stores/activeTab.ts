import { atom } from 'nanostores';

export type TabId = 'encrypt' | 'decrypt' | 'keyring' | 'addressbook' | 'wizard';

// Start with the primary task. Guided setup remains available without a forced detour.
export const $activeTab = atom<TabId>('encrypt');
