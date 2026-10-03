/**
 * "Vorschläge zum Einladen" in the empty contacts screen (plan 2.13): when
 * nobody from the address book uses the app yet, up to three people to
 * invite first, instead of a long list to scroll.
 *
 * Honest about the order: expo-contacts tells us neither how often someone
 * is called nor who is a favourite, so "the three you call most" is out of
 * reach. What it does tell us is whether an entry has a picture and a full
 * name, both hints that someone is a person you know well rather than a
 * plumber or a hotline. So: picture first, then first and last name, then
 * alphabetical. Everything stays on the device.
 */
import type { Contact } from '../../contexts/ContactsContext';

export const MAX_SUGGESTIONS = 3;

/** True when the suggestions should show: loaded, contacts there, nobody registered. */
export function showInviteSuggestions(contacts: Contact[], { loading, query }: { loading: boolean; query: string }): boolean {
  return !loading && !query.trim() && contacts.length > 0 && !contacts.some((c) => c.registered);
}

/** Up to `max` people from "Noch nicht dabei", in the order described above. */
export function inviteSuggestions(contacts: Contact[], max = MAX_SUGGESTIONS): Contact[] {
  const rank = (c: Contact) => (c.hasImage ? 0 : 2) + (c.hasFullName ? 0 : 1);
  return contacts
    .filter((c) => !c.registered)
    // An entry named only by its number is no one you'd recognise in a list
    .filter((c) => c.name && c.name !== c.phone)
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, 'de'))
    .slice(0, max);
}
