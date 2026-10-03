import * as fs from 'fs';
import * as path from 'path';
import { Alert } from 'react-native';
import { roomExit } from '../features/circles/roomExit';
import { explainLimit, plusAllows } from '../features/plus/upsell';
import { planLimitOf } from '../services/moments';
import { countsAsView, FUNNEL_STEPS, offeringEmpty, PAYWALL_SOURCES, parseFrom, paywallHref } from '../services/paywall';
import { reportFunnel } from '../services/planApi';
import { session } from '../services/session';
import { apiPostJson } from '../utils/api';

jest.mock('../utils/api', () => ({ apiFetch: jest.fn(), apiPostJson: jest.fn(async () => ({ ok: true, json: async () => ({ success: true }) })) }));

beforeEach(() => {
  jest.clearAllMocks();
  session.setToken(null);
});

test('sources and steps: exactly the backend contract (CMM-backend-new lib/paywall.js)', () => {
  expect([...PAYWALL_SOURCES]).toEqual([
    'settings', 'memories', 'appicon', 'year', 'room',
    'limit_circles', 'limit_rituals', 'limit_members', 'limit_moments', 'referral',
    'plus_expiring', 'billing_issue', 'plus_winback_3', 'plus_winback_30', 'cancel', 'trial_ending',
    'push', 'other',
  ]);
  expect([...FUNNEL_STEPS]).toEqual([
    'paywall_view', 'purchase_start', 'purchase_success', 'purchase_cancel',
    'purchase_error', 'restore_success', 'restore_error', 'offering_empty',
  ]);
});

test('paywallHref and parseFrom: known sources round-trip, anything else is "other"', () => {
  for (const from of PAYWALL_SOURCES) {
    const href = paywallHref(from);
    expect(href).toBe(`/plus?from=${from}`);
    expect(parseFrom(new URLSearchParams(href.split('?')[1]).get('from'))).toBe(from);
  }
  expect(parseFrom(undefined)).toBe('other');
  expect(parseFrom('')).toBe('other');
  expect(parseFrom('paywall')).toBe('other');
  expect(parseFrom('SETTINGS')).toBe('other');
  expect(parseFrom(['room', 'settings'])).toBe('room');
  expect(parseFrom(42)).toBe('other');
});

test('offering_empty: only when the store is ready and nothing (or an error) came back', () => {
  expect(offeringEmpty(true, 0)).toBe(true);
  expect(offeringEmpty(true, null)).toBe(true);
  expect(offeringEmpty(true, 2)).toBe(false);
  expect(offeringEmpty(false, 0)).toBe(false);
  expect(offeringEmpty(false, null)).toBe(false);
});

test('reportFunnel: only signed in, and a failure stays silent', async () => {
  await reportFunnel('paywall_view', 'settings');
  expect(apiPostJson).not.toHaveBeenCalled();
  session.setToken('t');
  await reportFunnel('offering_empty', 'limit_circles');
  expect(apiPostJson).toHaveBeenCalledWith('/me/plus/funnel', { step: 'offering_empty', from: 'limit_circles' }, 5000);
  jest.mocked(apiPostJson).mockRejectedValueOnce(new Error('offline'));
  await expect(reportFunnel('purchase_error', 'other')).resolves.toBeUndefined();
});

describe('explainLimit: every limit note opens the paywall with its source', () => {
  const pressMore = (error: any, inCall = false) => {
    const router = { push: jest.fn() };
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    expect(explainLimit(error, router, inCall)).toBe(true);
    const buttons = (alert.mock.calls[0][2] ?? []) as { text: string; onPress?: () => void }[];
    alert.mockRestore();
    buttons.find((b) => b.text === 'Mehr zu Plus')?.onPress?.();
    return router.push.mock.calls.map((c) => c[0]);
  };

  test.each([
    [{ code: 'plan_limit', limit: 'circles', value: 3, plus: 20 }, '/plus?from=limit_circles'],
    [{ code: 'plan_limit', limit: 'rituals', value: 1, plus: 3 }, '/plus?from=limit_rituals'],
    [{ code: 'plan_limit', limit: 'momentsPerDay', value: 30, plus: 100 }, '/plus?from=limit_moments'],
    [{ code: 'full' }, '/plus?from=limit_members'],
  ])('%j', (error, href) => {
    expect(pressMore(error)).toEqual([href]);
  });

  test('during a call nothing navigates; a full round has no paywall; anything else is not a limit', () => {
    expect(pressMore({ code: 'plan_limit', limit: 'momentsPerDay', value: 30, plus: 100 }, true)).toEqual([]);
    expect(pressMore({ code: 'room_full' })).toEqual([]);
    expect(explainLimit({ code: 'not_found' }, { push: jest.fn() })).toBe(false);
    expect(explainLimit(null, { push: jest.fn() })).toBe(false);
  });
});

test('moment upload: 403 plan_limit becomes a limit for explainLimit, anything else not', () => {
  expect(planLimitOf(403, { success: false, error: 'plan_limit', limit: 'momentsPerDay', value: 30, plus: 100 })).toEqual({
    code: 'plan_limit',
    limit: 'momentsPerDay',
    value: 30,
    plus: 100,
  });
  expect(planLimitOf(403, { error: 'no_call' })).toBeNull();
  expect(planLimitOf(429, { error: 'upload_limit' })).toBeNull();
  expect(planLimitOf(200, { url: 'https://x' })).toBeNull();
});

test('no paywall entry without its source: every router call to /plus in app/ and features/ uses paywallHref', () => {
  const root = path.join(__dirname, '..');
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.tsx?$/.test(entry.name)) files.push(full);
    }
  };
  walk(path.join(root, 'app'));
  walk(path.join(root, 'features'));
  const bare = files.filter((f) => /router\.(push|replace|navigate)\(\s*['"`]\/plus/.test(fs.readFileSync(f, 'utf8')));
  expect(bare.map((f) => path.relative(root, f))).toEqual([]);
});

test('paywall_view: everyone without Plus; Plus members only from the sources that concern their plan', () => {
  for (const from of PAYWALL_SOURCES) expect(countsAsView(from, false)).toBe(true);
  const members = PAYWALL_SOURCES.filter((from) => countsAsView(from, true));
  expect(members).toEqual(['plus_expiring', 'billing_issue', 'cancel', 'trial_ending']);
});

describe('limit notes for people who already have what Plus allows', () => {
  const show = (error: any) => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const router = { push: jest.fn() };
    expect(explainLimit(error, router)).toBe(true);
    const [title, text, buttons] = alert.mock.calls[0];
    alert.mockRestore();
    return { title, text: text ?? '', buttons: (buttons ?? []).map((b) => b.text) };
  };

  test('plusAllows: number, unlimited, null (no more with Plus), fallback for an older server', () => {
    expect(plusAllows({ plus: 100 }, 1)).toBe(100);
    expect(plusAllows({ plus: 'unlimited' }, 1)).toBe('unlimited');
    expect(plusAllows({ plus: null }, 1)).toBeNull();
    expect(plusAllows({}, 7)).toBe(7);
    expect(plusAllows({ plus: undefined }, 7)).toBe(7);
  });

  test.each([
    { code: 'plan_limit', limit: 'momentsPerDay', value: 100, plus: null },
    { code: 'plan_limit', limit: 'circles', value: 20, plus: null },
    { code: 'plan_limit', limit: 'rituals', value: 3, plus: null },
  ])('%j: no Plus mention, no Plus button', (error) => {
    const { text, buttons } = show(error);
    expect(text).not.toMatch(/Plus|Gratis/);
    expect(text).toContain(String(error.value));
    expect(buttons).not.toContain('Mehr zu Plus');
  });

  test('unlimited reads as words, not "bis zu unlimited"', () => {
    const { text, buttons } = show({ code: 'plan_limit', limit: 'momentsPerDay', value: 30, plus: 'unlimited' });
    expect(text).not.toContain('unlimited');
    expect(text).toContain('kein Tageslimit');
    expect(buttons).toContain('Mehr zu Plus');
  });

  test('free plan still names the Plus value', () => {
    expect(show({ code: 'plan_limit', limit: 'momentsPerDay', value: 30, plus: 100 }).text).toContain('bis zu 100');
  });
});

test('round screen: closes now while in front, otherwise once it is in front again', () => {
  const back = jest.fn();
  const exit = roomExit(back);
  expect(exit.isFocused()).toBe(true);
  exit.close();
  expect(back).toHaveBeenCalledTimes(1);

  // The paywall opens above the round, the round ends meanwhile
  exit.blur();
  expect(exit.isFocused()).toBe(false);
  exit.close();
  expect(back).toHaveBeenCalledTimes(1);
  exit.focus();
  expect(back).toHaveBeenCalledTimes(2);
  // Only once
  exit.blur();
  exit.focus();
  expect(back).toHaveBeenCalledTimes(2);
});
