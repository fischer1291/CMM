/**
 * Store purchases through RevenueCat. Off until EXPO_PUBLIC_REVENUECAT_IOS_KEY
 * is set and the build contains the native module; until then the paywall
 * says "Plus kommt bald" (or, with the flag plus_interest, "Interesse
 * zeigen"). Products, offerings and the intro offer: docs/PLUS.md. The backend learns about purchases from the
 * RevenueCat webhook; after a purchase or restore the app also asks it to
 * sync right away (POST /me/plus/sync), so Plus is there before the webhook.
 */
import { Platform } from 'react-native';
import { syncPlus } from './planApi';

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

/**
 * The App Store intro offer of a product (7 days free, docs/PLUS.md) as the
 * paywall shows it. `eligible` is Apple's answer for this account: only then
 * may the page promise it; unknown counts as not eligible (RevenueCat's
 * advice, no misleading price).
 */
export type Intro = { eligible: boolean; periodText: string; priceText: string; free: boolean };

export type Offer = {
  id: string;
  title: string;
  price: string;
  period: 'month' | 'year' | 'other';
  /** null: the product has no intro offer */
  intro: Intro | null;
  pkg: unknown;
};

// react-native-purchases INTRO_ELIGIBILITY_STATUS (numbers in the SDK)
const INTRO_ELIGIBLE = 2;
const INTRO_NONE = 3;

const UNIT: Record<string, [string, string]> = {
  DAY: ['Tag', 'Tage'],
  WEEK: ['Woche', 'Wochen'],
  MONTH: ['Monat', 'Monate'],
  YEAR: ['Jahr', 'Jahre'],
};

/** "7 Tage", "1 Monat": weeks become days, the way the App Store sells a trial. */
export function introPeriodText(unit: string, units: number, cycles = 1): string {
  let n = Math.max(1, units || 1) * Math.max(1, cycles || 1);
  let key = String(unit).toUpperCase();
  if (key === 'WEEK') {
    n *= 7;
    key = 'DAY';
  }
  const names = UNIT[key];
  if (!names) return '';
  return `${n} ${n === 1 ? names[0] : names[1]}`;
}

/**
 * The intro offer from the store data (product.introPrice) and the
 * eligibility status; null without an intro offer. Texts come from Apple's
 * data, nothing is hard coded: a free trial reads "gratis", a paid intro
 * its price (per period when it repeats).
 */
export function introOf(product: any, status: number | undefined): Intro | null {
  const intro = product?.introPrice;
  if (!intro || status === INTRO_NONE) return null;
  const periodText = introPeriodText(intro.periodUnit, intro.periodNumberOfUnits, intro.cycles);
  if (!periodText) return null;
  const free = Number(intro.price) === 0;
  const one = introPeriodText(intro.periodUnit, intro.periodNumberOfUnits);
  const perPeriod = (intro.cycles ?? 1) > 1 ? ` pro ${one.replace(/^1 /, '')}` : '';
  return { eligible: status === INTRO_ELIGIBLE, periodText, priceText: free ? 'gratis' : `${intro.priceString}${perPeriod}`, free };
}

const PER: Record<Offer['period'], string> = { year: ' / Jahr', month: ' / Monat', other: '' };

/** "7 Tage gratis, dann 29,99 € / Jahr", or null when the offer can't be promised to this account. */
export function introLine(offer: Pick<Offer, 'intro' | 'price' | 'period'>): string | null {
  const { intro } = offer;
  if (!intro?.eligible || !offer.price) return null;
  const then = `dann ${offer.price}${PER[offer.period]}`;
  return intro.free ? `${intro.periodText} gratis, ${then}` : `${intro.periodText} für ${intro.priceText}, ${then}`;
}

/** Apple's answer per product id; empty when the check fails (then no intro is promised). */
async function eligibility(Purchases: any, ids: string[]): Promise<Record<string, { status: number }>> {
  if (!ids.length || typeof Purchases.checkTrialOrIntroductoryPriceEligibility !== 'function') return {};
  try {
    return (await Purchases.checkTrialOrIntroductoryPriceEligibility(ids)) ?? {};
  } catch {
    return {};
  }
}

/** The current offering's packages with their intro offer. */
export async function loadOffers(): Promise<Offer[]> {
  const Purchases = sdk();
  if (!Purchases || !configuredFor) return [];
  const offerings = await Purchases.getOfferings();
  const packages: any[] = offerings?.current?.availablePackages ?? [];
  const withIntro = packages.filter((p) => p.product?.introPrice).map((p) => p.product.identifier);
  const eligible = await eligibility(Purchases, withIntro);
  return packages.map((p) => ({
    id: p.identifier,
    title: p.product?.title ?? p.identifier,
    price: p.product?.priceString ?? '',
    period: p.packageType === 'MONTHLY' ? 'month' : p.packageType === 'ANNUAL' ? 'year' : 'other',
    intro: introOf(p.product, eligible[p.product?.identifier]?.status),
    pkg: p,
  }));
}

/**
 * A store error as a short code for reports and alerts, never with user
 * data: RevenueCat's readable code ("STORE_PROBLEM_ERROR") or its number.
 */
export function purchaseErrorCode(error: any): string {
  const raw = error?.userInfo?.readableErrorCode || error?.readableErrorCode || error?.code || 'unknown';
  return String(raw).replace(/[^A-Za-z0-9_]/g, '').slice(0, 60) || 'unknown';
}

const hasPlus = (info: any) => !!info?.entitlements?.active?.[ENTITLEMENT];

/** Best effort: the webhook or the next plan refresh catches up when this fails. */
async function syncBackend(): Promise<void> {
  try {
    await syncPlus();
  } catch {
    // not configured, offline, or RevenueCat slow: the webhook still arrives
  }
}

/**
 * How a purchase ended: Plus active, cancelled by the person, waiting for
 * approval (Ask to Buy: Apple asks a parent first), or bought without the
 * entitlement (a RevenueCat setup problem; the webhook may still fix it).
 * Any other store error is thrown.
 */
export type BuyResult = 'success' | 'cancelled' | 'pending' | 'no_entitlement';

export async function buy(offer: Offer): Promise<BuyResult> {
  const Purchases = sdk();
  if (!Purchases) throw Object.assign(new Error('Purchases unavailable'), { code: 'unavailable' });
  try {
    const { customerInfo } = await Purchases.purchasePackage(offer.pkg);
    if (!hasPlus(customerInfo)) return 'no_entitlement';
    await syncBackend();
    return 'success';
  } catch (error: any) {
    if (error?.userCancelled) return 'cancelled';
    // PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR is "20"
    if (String(error?.code) === '20' || purchaseErrorCode(error) === 'PAYMENT_PENDING_ERROR') return 'pending';
    throw error;
  }
}

export async function restore(): Promise<boolean> {
  const Purchases = sdk();
  if (!Purchases) return false;
  if (!hasPlus(await Purchases.restorePurchases())) return false;
  await syncBackend();
  return true;
}
