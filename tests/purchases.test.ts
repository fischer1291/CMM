import { buy, restore } from '../services/purchases';
import { syncPlus } from '../services/planApi';

const mockSdk = {
  purchasePackage: jest.fn(),
  restorePurchases: jest.fn(),
};
jest.mock('react-native-purchases', () => ({ __esModule: true, default: mockSdk }));
jest.mock('../services/planApi', () => ({ syncPlus: jest.fn(async () => ({ plan: 'plus' })) }));

const active = { entitlements: { active: { plus: {} } } };
const none = { entitlements: { active: {} } };
const offer = { id: 'yearly', title: '', price: '', period: 'year' as const, pkg: {} };

beforeEach(() => jest.clearAllMocks());

test('buy: syncs with the backend once Plus is active', async () => {
  mockSdk.purchasePackage.mockResolvedValue({ customerInfo: active });
  expect(await buy(offer)).toBe(true);
  expect(syncPlus).toHaveBeenCalledTimes(1);
});

test('buy: no sync without entitlement or when cancelled', async () => {
  mockSdk.purchasePackage.mockResolvedValue({ customerInfo: none });
  expect(await buy(offer)).toBe(false);
  mockSdk.purchasePackage.mockRejectedValue({ userCancelled: true });
  expect(await buy(offer)).toBe(false);
  expect(syncPlus).not.toHaveBeenCalled();
});

test('buy: a failing sync does not spoil the purchase', async () => {
  mockSdk.purchasePackage.mockResolvedValue({ customerInfo: active });
  jest.mocked(syncPlus).mockRejectedValueOnce(new Error('not_configured'));
  expect(await buy(offer)).toBe(true);
});

test('restore: syncs only when something came back', async () => {
  mockSdk.restorePurchases.mockResolvedValue(none);
  expect(await restore()).toBe(false);
  expect(syncPlus).not.toHaveBeenCalled();
  mockSdk.restorePurchases.mockResolvedValue(active);
  expect(await restore()).toBe(true);
  expect(syncPlus).toHaveBeenCalledTimes(1);
});
