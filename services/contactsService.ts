/**
 * Matches the device address book against registered users.
 *
 * Numbers are normalized to E.164 (with the region of the user's own number)
 * and sent as SHA-256 hashes, so numbers of people who don't use the app never
 * leave the device. The backend stores the matches as the user's contacts,
 * which decides who receives their availability updates.
 */
import * as Contacts from 'expo-contacts';
import { apiPostJson } from '../utils/api';
import { hashPhone, regionOf, toE164 } from '../utils/phone';

export type MatchedUser = {
  phone: string;
  name: string;
  avatarUrl: string;
  isAvailable: boolean;
  lastOnline: string | null;
};

export type ContactMatchResult = {
  /** E.164 -> name from the address book */
  deviceNames: Map<string, string>;
  matched: MatchedUser[];
};

export class ContactsPermissionError extends Error {}

async function readDeviceContacts(userPhone: string): Promise<Map<string, string>> {
  const region = regionOf(userPhone);
  const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.PhoneNumbers] });
  const names = new Map<string, string>();
  for (const contact of data) {
    for (const entry of contact.phoneNumbers ?? []) {
      const e164 = entry.number ? toE164(entry.number, region) : null;
      if (e164 && e164 !== userPhone && !names.has(e164)) {
        names.set(e164, contact.name);
      }
    }
  }
  return names;
}

/**
 * @param askPermission false for background syncs: never shows a prompt,
 *   silently does nothing without permission.
 */
export async function matchContacts(
  userPhone: string,
  { askPermission }: { askPermission: boolean }
): Promise<ContactMatchResult> {
  const permission = askPermission
    ? await Contacts.requestPermissionsAsync()
    : await Contacts.getPermissionsAsync();
  if (permission.status !== 'granted') {
    throw new ContactsPermissionError('Contacts permission not granted');
  }

  const deviceNames = await readDeviceContacts(userPhone);
  const phones = [...deviceNames.keys()];

  let response = await apiPostJson('/contacts/match', { hashes: phones.map(hashPhone) }, 15000);
  if (response.status === 400) {
    // Backend without hash support
    response = await apiPostJson('/contacts/match', { phones }, 15000);
  }
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Contact matching failed');
  }

  return {
    deviceNames,
    matched: (result.matched as any[]).map((m) => ({
      phone: m.phone,
      name: m.name || '',
      avatarUrl: m.avatarUrl || '',
      isAvailable: !!m.isAvailable,
      lastOnline: m.lastOnline || null,
    })),
  };
}
