export type KeyTool = 'encrypt' | 'decrypt';
export type KeyCapabilityState = 'limited' | 'blocked' | 'available';

/** Compact outline icons: warning triangle, key, and circled check. */
export const keyCapabilityIconPaths: Record<KeyCapabilityState, string> = {
  limited: 'M10.3 3.9 2.1 18.1A2 2 0 0 0 3.8 21h16.4a2 2 0 0 0 1.7-2.9L13.7 3.9a2 2 0 0 0-3.4 0Z M12 9v4 M12 17h.01',
  blocked: 'M14 7a5 5 0 1 1-3.5 8.6L7 19H4v-3l5.4-5.4A5 5 0 0 1 14 7Z M16 11h.01',
  available: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z m-15 0 3 3 7-7',
};

interface KeyCapability {
  state: KeyCapabilityState;
  navHint: string;
  mobileHint: string;
  title: string;
  action: string;
}

/** Shared wording and visual state for the workspace navigation and page notices. */
export function getKeyCapability(tool: KeyTool, loaded: boolean): KeyCapability {
  if (tool === 'encrypt') {
    return loaded ? {
      state: 'available', navHint: 'Signing available', mobileHint: 'Can sign',
      title: 'Signing available',
      action: '',
    } : {
      state: 'limited', navHint: 'Unsigned encryption only', mobileHint: 'Unsigned',
      title: 'Unsigned encryption only',
      action: 'Load key to sign',
    };
  }
  return loaded ? {
    state: 'available', navHint: 'Private key loaded', mobileHint: 'Key loaded',
    title: 'Private key loaded',
    action: '',
  } : {
    state: 'blocked', navHint: 'Private key required', mobileHint: 'Key needed',
    title: 'Private key required',
    action: 'Load matching key',
  };
}
