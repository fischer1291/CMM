/**
 * Store purchases through RevenueCat. Off until EXPO_PUBLIC_REVENUECAT_IOS_KEY
 * is set and the build contains the native module; until then the paywall
 * shows "Interesse zeigen". The backend learns about purchases from the
 * RevenueCat webhook; the app only shows the result right away.
 */
import { Platform } from 'react-native';

const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || '';
export const ENTITLEMENT = 'plus';

let purchases: any = null;
let configuredFor: string | null = null;

function sdk() {
  if (purchases !== null) return purchases || null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    purchases = require('react-native-purchases').default;
  } catch {
    purchases = false;
  }
  return purchases || null;
}

export const purchasesAvailable = () => Platform.OS === 'ios' && !!IOS_KEY && !!sdk();

/** Connect the store account to our user (RevenueCat app user id = our user id). */
export async function configurePurchases(userId: string): Promise<boolean> {
  const Purchases = purchasesAvailable() ? sdk() : null;
  if (!Purchases) return false;
  try {
    if (!configuredFor) {
      Purchases.configure({ apiKey: IOS_KEY, appUserID: userId });
    } else if (configuredFor !== userId) {
      await Purchases.logIn(userId);
    }
    configuredFor = userId;
    return true;
  } catch {
    return false;
  }
}

export type Offer = { id: string; title: string; price: string; period: 'month' | 'year' | 'other'; pkg: unknown };

/** The current offering's packages, cheapest period first. */
export async function loadOffers(): Promise<Offer[]> {
  const Purchases = sdk();
  if (!Purchases || !configuredFor) return [];
  const offerings = await Purchases.getOfferings();
  const packages: any[] = offerings?.current?.availablePackages ?? [];
  return packages.map((p) => ({
    id: p.identifier,
    title: p.product?.title ?? p.identifier,
    price: p.product?.priceString ?? '',
    period: p.packageType === 'MONTHLY' ? 'month' : p.packageType === 'ANNUAL' ? 'year' : 'other',
    pkg: p,
  }));
}

const hasPlus = (info: any) => !!info?.entitlements?.active?.[ENTITLEMENT];

/** Buy; true when Plus is active afterwards. Cancelling returns false. */
export async function buy(offer: Offer): Promise<boolean> {
  const Purchases = sdk();
  if (!Purchases) return false;
  try {
    const { customerInfo } = await Purchases.purchasePackage(offer.pkg);
    return hasPlus(customerInfo);
  } catch (error: any) {
    if (error?.userCancelled) return false;
    throw error;
  }
}

export async function restore(): Promise<boolean> {
  const Purchases = sdk();
  if (!Purchases) return false;
  return hasPlus(await Purchases.restorePurchases());
}
