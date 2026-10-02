import { buy, introLine, introOf, introPeriodText, purchaseErrorCode, restore } from '../services/purchases';
import { syncPlus } from '../services/planApi';

const mockSdk = {
  purchasePackage: jest.fn(),
  restorePurchases: jest.fn(),
};
jest.mock('react-native-purchases', () => ({ __esModule: true, default: mockSdk }));
jest.mock('../services/planApi', () => ({ syncPlus: jest.fn(async () => ({ plan: 'plus' })) }));

const active = { entitlements: { active: { plus: {} } } };
const none = { entitlements: { active: {} } };
const offer = { id: 'yearly', title: '', price: '', period: 'year' as const, intro: null, pkg: {} };

beforeEach(() => jest.clearAllMocks());

test('buy: syncs with the backend once Plus is active', async () => {
  mockSdk.purchasePackage.mockResolvedValue({ customerInfo: active });
  expect(await buy(offer)).toBe('success');
  expect(syncPlus).toHaveBeenCalledTimes(1);
});

test('buy: no sync without entitlement, when cancelled or waiting for approval', async () => {
  mockSdk.purchasePackage.mockResolvedValue({ customerInfo: none });
  expect(await buy(offer)).toBe('no_entitlement');
  mockSdk.purchasePackage.mockRejectedValue({ userCancelled: true });
  expect(await buy(offer)).toBe('cancelled');
  mockSdk.purchasePackage.mockRejectedValue({ code: '20', userCancelled: false });
  expect(await buy(offer)).toBe('pending');
  expect(syncPlus).not.toHaveBeenCalled();
});

test('buy: any other store error is thrown, with a code free of user data', async () => {
  const storeError = { code: '2', message: 'The App Store had a problem for +4915111111111', userInfo: { readableErrorCode: 'STORE_PROBLEM_ERROR' } };
  mockSdk.purchasePackage.mockRejectedValue(storeError);
  await expect(buy(offer)).rejects.toBe(storeError);
  expect(purchaseErrorCode(storeError)).toBe('STORE_PROBLEM_ERROR');
  expect(purchaseErrorCode({ code: '23' })).toBe('23');
  expect(purchaseErrorCode({ readableErrorCode: 'a b/c<d>' })).toBe('abcd');
  expect(purchaseErrorCode(new Error('x'))).toBe('unknown');
  expect(purchaseErrorCode(undefined)).toBe('unknown');
});

test('buy: a failing sync does not spoil the purchase', async () => {
  mockSdk.purchasePackage.mockResolvedValue({ customerInfo: active });
  jest.mocked(syncPlus).mockRejectedValueOnce(new Error('not_configured'));
  expect(await buy(offer)).toBe('success');
});

test('restore: syncs only when something came back', async () => {
  mockSdk.restorePurchases.mockResolvedValue(none);
  expect(await restore()).toBe(false);
  expect(syncPlus).not.toHaveBeenCalled();
  mockSdk.restorePurchases.mockResolvedValue(active);
  expect(await restore()).toBe(true);
  expect(syncPlus).toHaveBeenCalledTimes(1);
});

// App Store data as react-native-purchases reports it (product.introPrice)
const trialWeek = { price: 0, priceString: '0,00 €', cycles: 1, period: 'P1W', periodUnit: 'WEEK', periodNumberOfUnits: 1 };
const ELIGIBLE = 2;
const INELIGIBLE = 1;
const UNKNOWN = 0;
const NO_INTRO = 3;

test('intro period: weeks read as days, singular and plural in German', () => {
  expect(introPeriodText('WEEK', 1)).toBe('7 Tage');
  expect(introPeriodText('DAY', 3)).toBe('3 Tage');
  expect(introPeriodText('DAY', 1)).toBe('1 Tag');
  expect(introPeriodText('MONTH', 1)).toBe('1 Monat');
  expect(introPeriodText('MONTH', 1, 3)).toBe('3 Monate');
  expect(introPeriodText('YEAR', 1)).toBe('1 Jahr');
  expect(introPeriodText('FORTNIGHT', 1)).toBe('');
});

test('intro offer: from the store data, promised only when Apple says eligible', () => {
  expect(introOf({ introPrice: trialWeek }, ELIGIBLE)).toEqual({ eligible: true, periodText: '7 Tage', priceText: 'gratis', free: true });
  expect(introOf({ introPrice: trialWeek }, INELIGIBLE)?.eligible).toBe(false);
  expect(introOf({ introPrice: trialWeek }, UNKNOWN)?.eligible).toBe(false);
  expect(introOf({ introPrice: trialWeek }, undefined)?.eligible).toBe(false);
  expect(introOf({ introPrice: trialWeek }, NO_INTRO)).toBeNull();
  expect(introOf({ introPrice: null }, ELIGIBLE)).toBeNull();
  expect(introOf(undefined, ELIGIBLE)).toBeNull();
  const paid = { price: 0.99, priceString: '0,99 €', cycles: 3, period: 'P1M', periodUnit: 'MONTH', periodNumberOfUnits: 1 };
  expect(introOf({ introPrice: paid }, ELIGIBLE)).toEqual({ eligible: true, periodText: '3 Monate', priceText: '0,99 € pro Monat', free: false });
});

test('intro line: "7 Tage gratis, dann {price}" with the price from the store', () => {
  const intro = introOf({ introPrice: trialWeek }, ELIGIBLE);
  expect(introLine({ intro, price: '29,99 €', period: 'year' })).toBe('7 Tage gratis, dann 29,99 € / Jahr');
  expect(introLine({ intro, price: '3,49 €', period: 'month' })).toBe('7 Tage gratis, dann 3,49 € / Monat');
  expect(introLine({ intro: { ...intro!, eligible: false }, price: '29,99 €', period: 'year' })).toBeNull();
  expect(introLine({ intro: null, price: '29,99 €', period: 'year' })).toBeNull();
  expect(introLine({ intro, price: '', period: 'year' })).toBeNull();
});
