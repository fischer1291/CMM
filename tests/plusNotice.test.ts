import { interestModeOpen, plusNotice } from '../features/plus/PlusView';
import { supportPrefill } from '../features/support/SupportView';

test('billing_issue push: a note with the way to Apple payment settings', () => {
  expect(plusNotice('billing_issue')).toMatchObject({ kind: 'billing', title: 'Zahlung bei Apple prüfen', button: 'Zahlungsmethode ansehen' });
});

test('cancel_survey push (/plus?from=cancel): asks why, voluntary, with a way to answer', () => {
  const notice = plusNotice('cancel');
  expect(notice).toMatchObject({ kind: 'survey', title: 'Magst du uns sagen, warum?', button: 'Kurz schreiben' });
  expect(notice?.text).toContain('ganz freiwillig');
});

test('trial_ending push: a calm note without a button, nothing to do', () => {
  expect(plusNotice('trial_ending')).toEqual({
    kind: 'trial',
    title: 'Deine Probezeit endet bald',
    text: 'Du musst nichts tun, wenn Plus weiterlaufen soll.',
  });
});

test('everything else shows the normal page', () => {
  for (const from of [undefined, '', 'plus_expiring', 'plus_winback_3', 'plus_winback_30', 'paywall', 'settings', 'other']) expect(plusNotice(from)).toBeNull();
});

test('support: topic=cancel starts under "Sonstiges" with a fitting hint, otherwise as before', () => {
  expect(supportPrefill('cancel')).toEqual({ category: 'other', placeholder: 'Was hat bei Plus nicht gepasst? Ein Satz reicht.' });
  expect(supportPrefill(undefined)).toEqual({ category: 'bug', placeholder: null });
  expect(supportPrefill('anything')).toEqual({ category: 'bug', placeholder: null });
});

test('interest mode: only with the flag, in a build without a store, once loading is done', () => {
  expect(interestModeOpen({ interestMode: true, storeConfigured: false, offers: 0, loadingOffers: false })).toBe(true);
  expect(interestModeOpen({ interestMode: false, storeConfigured: false, offers: 0, loadingOffers: false })).toBe(false);
  // Store set up but the offering came back empty: a store problem, no interest mode
  expect(interestModeOpen({ interestMode: true, storeConfigured: true, offers: 0, loadingOffers: false })).toBe(false);
  expect(interestModeOpen({ interestMode: true, storeConfigured: false, offers: 2, loadingOffers: false })).toBe(false);
  expect(interestModeOpen({ interestMode: true, storeConfigured: false, offers: 0, loadingOffers: true })).toBe(false);
});
