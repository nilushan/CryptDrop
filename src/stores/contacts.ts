import { atom } from 'nanostores';

export interface Contact {
  email: string;
  name: string;
  armoredPublicKey: string;
  fingerprint: string;
  lastUpdated: string;
}

const CONTACTS_KEY = 'cryptdrop_contacts';

function readContacts(): Contact[] {
  try {
    const raw = localStorage.getItem(CONTACTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeContacts(contacts: Contact[]): void {
  localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
  $contacts.set(contacts);
}

export const $contacts = atom<Contact[]>(
  typeof localStorage !== 'undefined' ? readContacts() : [],
);

export function saveContact(
  email: string,
  name: string,
  armoredPublicKey: string,
  fingerprint: string,
): Contact[] {
  const contacts = readContacts();
  const existing = contacts.findIndex((c) => c.email === email);
  const entry: Contact = {
    email,
    name: name || '',
    armoredPublicKey,
    fingerprint: fingerprint || '',
    lastUpdated: new Date().toISOString(),
  };
  if (existing >= 0) {
    contacts[existing] = entry;
  } else {
    contacts.push(entry);
  }
  writeContacts(contacts);
  return contacts;
}

export function removeContact(email: string): Contact[] {
  const contacts = readContacts().filter((c) => c.email !== email);
  writeContacts(contacts);
  return contacts;
}

export function clearContacts(): void {
  localStorage.removeItem(CONTACTS_KEY);
  $contacts.set([]);
}
