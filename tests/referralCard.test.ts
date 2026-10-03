import { referralLines } from '../features/plus/ReferralCard';

const base = { step: 3, rewardDays: 30, maxRewards: 6, earned: 0 };

test('nobody in yet: explains the reward, no counts', () => {
  expect(referralLines({ ...base, joined: 0, activated: 0, toNext: 3 })).toEqual({
    text: 'Für je 3 Leute, die über deine Einladung dazukommen und einmal telefonieren: 1 Monat Wanna yap+ geschenkt.',
    stats: null,
    pair: null,
  });
});

test('progress follows activated, the line shows joined and activated apart', () => {
  // two joined, one talked: two more talks to go
  expect(referralLines({ ...base, joined: 2, activated: 1, toNext: 2 })).toEqual({
    text: 'Noch 2 Leute bis zu 1 Monat Wanna yap+.',
    stats: '2 beigetreten · 1 hat schon telefoniert',
    pair: null,
  });
  expect(referralLines({ ...base, joined: 4, activated: 2, toNext: 1 }).stats).toBe('4 beigetreten · 2 haben schon telefoniert');
  expect(referralLines({ ...base, joined: 1, activated: 0, toNext: 3 }).stats).toBe('1 beigetreten · noch niemand hat telefoniert');
});

test('older servers without activated: joined counts', () => {
  expect(referralLines({ ...base, joined: 2, toNext: 1 })).toEqual({
    text: 'Noch 1 Person bis zu 1 Monat Wanna yap+.',
    stats: '2 beigetreten',
    pair: null,
  });
});

test('two-sided experiment: one extra line for both of a pair, only while the flag is on', () => {
  const line = 'Nach eurem ersten Gespräch bekommt ihr beide 7 Tage Plus geschenkt.';
  expect(referralLines({ ...base, joined: 0, activated: 0, toNext: 3, twoSided: true, pairDays: 7 }).pair).toBe(line);
  expect(referralLines({ ...base, joined: 2, activated: 1, toNext: 2, twoSided: true, pairDays: 7 })).toEqual({
    text: 'Noch 2 Leute bis zu 1 Monat Wanna yap+.',
    stats: '2 beigetreten · 1 hat schon telefoniert',
    pair: line,
  });
  // the ladder text stays the same; pairDays falls back to 7
  expect(referralLines({ ...base, joined: 0, toNext: 3, twoSided: true }).pair).toBe(line);
  expect(referralLines({ ...base, joined: 0, toNext: 3, twoSided: false, pairDays: 7 }).pair).toBeNull();
});
