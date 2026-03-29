import { atom } from 'nanostores';
import type { PrivateKey, PublicKey } from 'openpgp';

export const $privateKey = atom<PrivateKey | null>(null);
export const $publicKey = atom<PublicKey | null>(null);
export const $armoredPublic = atom<string | null>(null);
export const $armoredPrivate = atom<string | null>(null);
export const $userInfo = atom<string | null>(null);

export function setKeys(
  privateKey: PrivateKey,
  publicKey: PublicKey,
  armoredPrivate: string,
  armoredPublic: string,
  userInfo: string,
): void {
  $privateKey.set(privateKey);
  $publicKey.set(publicKey);
  $armoredPrivate.set(armoredPrivate);
  $armoredPublic.set(armoredPublic);
  $userInfo.set(userInfo);
}

export function clearKeys(): void {
  $privateKey.set(null);
  $publicKey.set(null);
  $armoredPrivate.set(null);
  $armoredPublic.set(null);
  $userInfo.set(null);
}
