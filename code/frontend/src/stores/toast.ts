import { atom } from 'nanostores';

export type ToastType = 'info' | 'success' | 'error' | 'warning';

export interface ToastMessage {
  msg: string;
  type: ToastType;
}

export const $toast = atom<ToastMessage | null>(null);

let timeoutId: ReturnType<typeof setTimeout> | undefined;

export function showToast(msg: string, type: ToastType = 'info'): void {
  clearTimeout(timeoutId);
  $toast.set({ msg, type });
  timeoutId = setTimeout(() => $toast.set(null), 4000);
}
