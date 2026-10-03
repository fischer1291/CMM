/**
 * The "Dein erstes Gespräch" card on the home screen (plan 2.13): someone
 * from the address book is already here, but no talk has happened yet. The
 * card names the contact seen most recently and offers a nudge or the next
 * Yap Moment. Pure functions, so the rules are testable without a screen.
 */
import type { Contact } from '../../contexts/ContactsContext';
import type { Album } from '../../services/badgesApi';
import { formatLastSeen } from '../../utils/time';

/** The badge for the first real talk (backend lib/badges.js) */
export const FIRST_TALK_BADGE = 'first_talk';

/**
 * Visible while at least one contact is registered and the first_talk badge
 * is not earned. Without the album (not loaded yet, or an older server without
 * that badge) the card stays hidden rather than flashing up for people who
 * talk every day.
 */
export function firstTalkCardVisible(contacts: Contact[], album: Album | null | undefined): boolean {
  if (!album || !contacts.some((c) => c.registered)) return false;
  const badge = album.badges.find((b) => b.id === FIRST_TALK_BADGE);
  return !!badge && !badge.earned;
}

const seenAt = (c: Contact) => {
  const t = c.lastOnline ? new Date(c.lastOnline).getTime() : NaN;
  return Number.isNaN(t) ? -Infinity : t;
};

/**
 * The registered contact to suggest: available right now first, then the one
 * last online (the server only sends lastOnline for mutual contacts), then the
 * first by name.
 */
export function firstTalkContact(contacts: Contact[]): Contact | null {
  const registered = contacts.filter((c) => c.registered);
  if (!registered.length) return null;
  return [...registered].sort(
    (a, b) => Number(b.isAvailable) - Number(a.isAvailable) || seenAt(b) - seenAt(a) || a.name.localeCompare(b.name, 'de')
  )[0];
}

/** "Lena war zuletzt vor 3 Std. online. Ein kurzer Anruf reicht." */
export function firstTalkText(contact: Contact, now = new Date()): string {
  const first = contact.name.split(' ')[0] || contact.name;
  if (contact.isAvailable) return `${first} ist gerade erreichbar. Ein kurzer Anruf reicht.`;
  const seen = formatLastSeen(contact.lastOnline, now);
  if (seen) return `${first} war zuletzt ${seen} online. Ein kurzer Anruf reicht.`;
  return `${first} ist schon dabei. Ein kurzer Anruf reicht.`;
}

/**
 * The countdown under "Beim Yap Moment treffen". Without nextAt (today's is
 * over, or an older server) there is only tomorrow's.
 */
export function nextMomentLabel(nextAt: string | null | undefined, now = Date.now()): string {
  const at = nextAt ? new Date(nextAt).getTime() : NaN;
  if (Number.isNaN(at)) return 'Morgen gibt es den nächsten Yap Moment';
  const minutes = Math.floor((at - now) / 60000);
  if (minutes < 1) return 'Der nächste Yap Moment startet gleich';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `Nächster Yap Moment in ${minutes} Min.`;
  return rest ? `Nächster Yap Moment in ${hours} Std. ${rest} Min.` : `Nächster Yap Moment in ${hours} Std.`;
}
