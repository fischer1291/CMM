import { INVITE_URL, inviteText, inviteUrl } from '../content/links';

test('the invite link carries the sender code as ?von=', () => {
  expect(inviteUrl('ABCD2345')).toBe('https://wannayap.app/einladung?von=ABCD2345');
  expect(inviteUrl()).toBe(INVITE_URL);
  expect(inviteUrl(null)).toBe('https://wannayap.app/einladung');
});

test('the share text ends with the personal link, or the plain one without a code', () => {
  const withCode = inviteText('Lea', 'ABCD2345');
  expect(withCode.startsWith('Lea hier! ')).toBe(true);
  expect(withCode.endsWith('Hol dir die App: https://wannayap.app/einladung?von=ABCD2345')).toBe(true);
  // Older servers don't give a code: the link stays without a parameter
  expect(inviteText('Lea')).toMatch(/Hol dir die App: https:\/\/wannayap\.app\/einladung$/);
  expect(inviteText(undefined, null).startsWith('Hey! ')).toBe(true);
});
