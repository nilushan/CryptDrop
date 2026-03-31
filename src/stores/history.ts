import { atom } from 'nanostores';

export interface HistoryEntry {
  id: string;
  timestamp: string;
  action: 'encrypt' | 'decrypt';
  originalFilename: string;
  originalSize: number;
  resultFilename: string;
  resultSize: number;
  recipientOrSender: string;
  signed: boolean;
}

const HISTORY_KEY = 'cryptdrop_history';
const MAX_ENTRIES = 100;

function readHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeHistory(entries: HistoryEntry[]): void {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
  $history.set(entries);
}

export const $history = atom<HistoryEntry[]>(
  typeof localStorage !== 'undefined' ? readHistory() : [],
);

export function addHistoryEntry(
  entry: Omit<HistoryEntry, 'id' | 'timestamp'>,
): void {
  const entries = readHistory();
  entries.unshift({
    ...entry,
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    timestamp: new Date().toISOString(),
  });
  writeHistory(entries.slice(0, MAX_ENTRIES));
}

export function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
  $history.set([]);
}
