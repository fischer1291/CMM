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

/**
 * What the address book says about an entry beyond its name, for the invite
 * suggestions (features/contacts/inviteSuggestions.ts). Stays on the device.
 */
export type DeviceDetails = { hasImage: boolean; hasFullName: boolean };

export type ContactMatchResult = {
  /** E.164 -> name from the address book */
  deviceNames: Map<string, string>;
  /** E.164 -> picture and full name in the address book */
  deviceDetails: Map<string, DeviceDetails>;
  matched: MatchedUser[];
};

export class ContactsPermissionError extends Error {}

async function readDeviceContacts(userPhone: string): Promise<{ names: Map<string, string>; details: Map<string, DeviceDetails> }> {
  const region = regionOf(userPhone);
  const { data } = await Contacts.getContactsAsync({
    fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.ImageAvailable, Contacts.Fields.FirstName, Contacts.Fields.LastName],
  });
  const names = new Map<string, string>();
  const details = new Map<string, DeviceDetails>();
  for (const contact of data) {
    for (const entry of contact.phoneNumbers ?? []) {
      const e164 = entry.number ? toE164(entry.number, region) : null;
      if (e164 && e164 !== userPhone && !names.has(e164)) {
        names.set(e164, contact.name);
        details.set(e164, { hasImage: !!contact.imageAvailable, hasFullName: !!contact.firstName?.trim() && !!contact.lastName?.trim() });
      }
    }
  }
  return { names, details };
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

  const { names: deviceNames, details: deviceDetails } = await readDeviceContacts(userPhone);
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
    deviceDetails,
    matched: (result.matched as any[]).map((m) => ({
      phone: m.phone,
      name: m.name || '',
      avatarUrl: m.avatarUrl || '',
      isAvailable: !!m.isAvailable,
      lastOnline: m.lastOnline || null,
    })),
  };
}
