import type { Contact } from '../contexts/ContactsContext';
import { inviteSuggestions, showInviteSuggestions } from '../features/contacts/inviteSuggestions';

let n = 0;
const contact = (name: string, over: Partial<Contact> = {}): Contact => ({
  phone: `+4917000000${String(++n).padStart(2, '0')}`,
  name,
  avatarUrl: null,
  registered: false,
  isAvailable: false,
  lastOnline: null,
  ...over,
});

test('picture first, then first and last name, then alphabetical; three at most', () => {
  const list = [
    contact('Zahnarzt'),
    contact('Anna'),
    contact('Mia Schulz', { hasFullName: true }),
    contact('Ben Kraus', { hasFullName: true }),
    contact('Oma', { hasImage: true }),
    contact('Lea Vogt', { hasImage: true, hasFullName: true }),
  ];
  expect(inviteSuggestions(list).map((c) => c.name)).toEqual(['Lea Vogt', 'Oma', 'Ben Kraus']);
  expect(inviteSuggestions(list, 6).map((c) => c.name)).toEqual(['Lea Vogt', 'Oma', 'Ben Kraus', 'Mia Schulz', 'Anna', 'Zahnarzt']);
});

test('never suggests someone already here or an entry that is only a number', () => {
  const here = contact('Jonas Bauer', { registered: true, hasImage: true, hasFullName: true });
  const number = contact('', { hasImage: true });
  const bare = contact('x');
  bare.name = bare.phone;
  expect(inviteSuggestions([here, number, bare, contact('Paula')]).map((c) => c.name)).toEqual(['Paula']);
});

test('the suggestions show only while nobody is registered, loaded and without a search', () => {
  const nobody = [contact('Anna'), contact('Ben')];
  expect(showInviteSuggestions(nobody, { loading: false, query: '' })).toBe(true);
  expect(showInviteSuggestions(nobody, { loading: true, query: '' })).toBe(false);
  expect(showInviteSuggestions(nobody, { loading: false, query: 'an' })).toBe(false);
  expect(showInviteSuggestions([...nobody, contact('Carl', { registered: true })], { loading: false, query: '' })).toBe(false);
  expect(showInviteSuggestions([], { loading: false, query: '' })).toBe(false);
});
