import { INVITE_URL, inviteText, inviteUrl, RESEARCH_URL, researchUrl } from '../content/links';

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

test('the research booking page carries the name so the owner can match the booking', () => {
  expect(researchUrl('Anna Müller')).toBe(`${RESEARCH_URL}?name=Anna%20M%C3%BCller`);
  expect(researchUrl('  ')).toBe(RESEARCH_URL);
  expect(researchUrl(null)).toBe(RESEARCH_URL);
});
