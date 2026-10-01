import { researchCardVisible } from '../features/status/ResearchCard';

const at = '2026-10-01T10:00:00.000Z';
const none = { invitedAt: null, bookedAt: null, dismissedAt: null, doneAt: null };

test('the card shows once invited and until answered', () => {
  expect(researchCardVisible({ ...none, invitedAt: at })).toBe(true);
  expect(researchCardVisible(none)).toBe(false);
  expect(researchCardVisible({ ...none, invitedAt: at, bookedAt: at })).toBe(false);
  expect(researchCardVisible({ ...none, invitedAt: at, dismissedAt: at })).toBe(false);
  // Done without an answer in the app (booked by other means): nothing to ask any more
  expect(researchCardVisible({ ...none, invitedAt: at, bookedAt: at, doneAt: at })).toBe(false);
});

test('older servers send nothing: no card', () => {
  expect(researchCardVisible(null)).toBe(false);
  expect(researchCardVisible(undefined)).toBe(false);
});
