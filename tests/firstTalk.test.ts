import type { Contact } from '../contexts/ContactsContext';
import type { Album, AlbumBadge } from '../services/badgesApi';
import { firstTalkCardVisible, firstTalkContact, firstTalkText, nextMomentLabel } from '../features/status/firstTalk';

const contact = (over: Partial<Contact>): Contact => ({
  phone: '+491700000001',
  name: 'Lena Berg',
  avatarUrl: null,
  registered: true,
  isAvailable: false,
  lastOnline: null,
  ...over,
});

const badge = (id: string, earned: boolean): AlbumBadge =>
  ({ id, earned, category: 'connection', icon: 'chatbubbles', title: id, description: '', secret: false, tier: earned ? 1 : 0, tiers: 1, tierName: null, progress: 0, current: null, next: null });

const album = (...badges: AlbumBadge[]): Album => ({ categories: [], badges, new: [], nextUp: null, showcase: [] });

test('the card shows with a registered contact while first_talk is not earned', () => {
  const people = [contact({ registered: false, phone: '+491700000002' }), contact({})];
  expect(firstTalkCardVisible(people, album(badge('first_talk', false)))).toBe(true);
  expect(firstTalkCardVisible(people, album(badge('first_talk', true)))).toBe(false);
});

test('no card without a registered contact, without the album or without the badge (older servers)', () => {
  expect(firstTalkCardVisible([contact({ registered: false })], album(badge('first_talk', false)))).toBe(false);
  expect(firstTalkCardVisible([], album(badge('first_talk', false)))).toBe(false);
  expect(firstTalkCardVisible([contact({})], null)).toBe(false);
  expect(firstTalkCardVisible([contact({})], album(badge('streak', false)))).toBe(false);
});

test('the card suggests the available contact, then the one last online', () => {
  const old = contact({ phone: '+491', name: 'Anna', lastOnline: '2026-10-01T10:00:00.000Z' });
  const recent = contact({ phone: '+492', name: 'Zoe', lastOnline: '2026-10-02T10:00:00.000Z' });
  const never = contact({ phone: '+493', name: 'Ben' });
  const stranger = contact({ phone: '+494', name: 'Carl', registered: false, isAvailable: true });
  expect(firstTalkContact([old, never, recent, stranger])?.phone).toBe('+492');
  expect(firstTalkContact([old, never, contact({ phone: '+495', name: 'Mia', isAvailable: true })])?.phone).toBe('+495');
  expect(firstTalkContact([never, contact({ phone: '+496', name: 'Ada' })])?.name).toBe('Ada');
  expect(firstTalkContact([stranger])).toBeNull();
});

test('the text says when the contact was last online, without pressure', () => {
  const now = new Date('2026-10-03T15:00:00');
  expect(firstTalkText(contact({ lastOnline: new Date('2026-10-03T12:00:00').toISOString() }), now)).toBe(
    'Lena war zuletzt vor 3 Std. online. Ein kurzer Anruf reicht.'
  );
  expect(firstTalkText(contact({ isAvailable: true }), now)).toBe('Lena ist gerade erreichbar. Ein kurzer Anruf reicht.');
  expect(firstTalkText(contact({}), now)).toBe('Lena ist schon dabei. Ein kurzer Anruf reicht.');
});

test('without nextAt the countdown points to tomorrow', () => {
  expect(nextMomentLabel(null)).toBe('Morgen gibt es den nächsten Yap Moment');
  expect(nextMomentLabel(undefined)).toBe('Morgen gibt es den nächsten Yap Moment');
  expect(nextMomentLabel('kaputt')).toBe('Morgen gibt es den nächsten Yap Moment');
});

test('with nextAt the countdown counts hours and minutes', () => {
  const now = Date.parse('2026-10-03T10:00:00.000Z');
  expect(nextMomentLabel('2026-10-03T12:05:30.000Z', now)).toBe('Nächster Yap Moment in 2 Std. 5 Min.');
  expect(nextMomentLabel('2026-10-03T11:00:00.000Z', now)).toBe('Nächster Yap Moment in 1 Std.');
  expect(nextMomentLabel('2026-10-03T10:42:00.000Z', now)).toBe('Nächster Yap Moment in 42 Min.');
  expect(nextMomentLabel('2026-10-03T10:00:30.000Z', now)).toBe('Der nächste Yap Moment startet gleich');
  // due but not reloaded yet
  expect(nextMomentLabel('2026-10-03T09:59:00.000Z', now)).toBe('Der nächste Yap Moment startet gleich');
});
