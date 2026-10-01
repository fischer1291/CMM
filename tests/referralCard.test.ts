import { referralLines } from '../features/plus/ReferralCard';

const base = { step: 3, rewardDays: 30, maxRewards: 6, earned: 0 };

test('nobody in yet: explains the reward, no counts', () => {
  expect(referralLines({ ...base, joined: 0, activated: 0, toNext: 3 })).toEqual({
    text: 'Für je 3 Leute, die über deine Einladung dazukommen und einmal telefonieren: 1 Monat Wanna yap+ geschenkt.',
    stats: null,
  });
});

test('progress follows activated, the line shows joined and activated apart', () => {
  // two joined, one talked: two more talks to go
  expect(referralLines({ ...base, joined: 2, activated: 1, toNext: 2 })).toEqual({
    text: 'Noch 2 Leute bis zu 1 Monat Wanna yap+.',
    stats: '2 beigetreten · 1 hat schon telefoniert',
  });
  expect(referralLines({ ...base, joined: 4, activated: 2, toNext: 1 }).stats).toBe('4 beigetreten · 2 haben schon telefoniert');
  expect(referralLines({ ...base, joined: 1, activated: 0, toNext: 3 }).stats).toBe('1 beigetreten · 0 haben schon telefoniert');
});

test('older servers without activated: joined counts', () => {
  expect(referralLines({ ...base, joined: 2, toNext: 1 })).toEqual({
    text: 'Noch 1 Person bis zu 1 Monat Wanna yap+.',
    stats: '2 beigetreten · 2 haben schon telefoniert',
  });
});
