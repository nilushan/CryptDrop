import { useEffect, useState } from 'react';
import { readProtectedPrivateKey } from '../../lib/key-backup';

type Protection = 'checking' | 'protected' | 'unsafe';

export function useKeyProtection(armoredPrivate: string | null): Protection {
  const [result, setResult] = useState<{ armored: string; protection: Protection } | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (armoredPrivate) {
      readProtectedPrivateKey(armoredPrivate).then(
        () => { if (!cancelled) setResult({ armored: armoredPrivate, protection: 'protected' }); },
        () => { if (!cancelled) setResult({ armored: armoredPrivate, protection: 'unsafe' }); },
      );
    }
    return () => { cancelled = true; };
  }, [armoredPrivate]);
  // Never expose the previous key's protection state while a new key is checked.
  return result?.armored === armoredPrivate ? result.protection : 'checking';
}
