import type * as OpenPGP from 'openpgp';

declare global {
  const openpgp: typeof OpenPGP;
}

export {};
