/**
 * Where the paywall (/plus) was opened from, and the steps on it, as the
 * backend counts them (POST /me/plus/funnel, CMM-backend-new lib/paywall.js,
 * plan 2.6a). No event log: the backend keeps day counters per step and,
 * for views and purchases, per source. Both lists are the contract with the
 * backend; a value missing there counts as "other".
 */

/** Every entry point to the paywall: screens, limit notes and pushes. */
export const PAYWALL_SOURCES = [
  'settings',
  'memories',
  'appicon',
  'year',
  'room',
  'limit_circles',
  'limit_rituals',
  'limit_members',
  'limit_moments',
  'referral',
  'plus_expiring',
  'billing_issue',
  'plus_winback_3',
  'plus_winback_30',
  'cancel',
  'trial_ending',
  'push',
  'other',
] as const;
export type PaywallSource = (typeof PAYWALL_SOURCES)[number];

/** What happens on the paywall; restore_success only when Plus came back. */
export const FUNNEL_STEPS = [
  'paywall_view',
  'purchase_start',
  'purchase_success',
  'purchase_cancel',
  'purchase_error',
  'restore_success',
  'restore_error',
  'offering_empty',
] as const;
export type FunnelStep = (typeof FUNNEL_STEPS)[number];

const KNOWN = new Set<string>(PAYWALL_SOURCES);

/** The `from` search param as a known source; anything else is "other". */
export function parseFrom(param: unknown): PaywallSource {
  const value = Array.isArray(param) ? param[0] : param;
  return typeof value === 'string' && KNOWN.has(value) ? (value as PaywallSource) : 'other';
}

/** The route that opens the paywall for `from` (router.push(paywallHref('settings'))). */
export const paywallHref = (from: PaywallSource): `/plus?from=${PaywallSource}` => `/plus?from=${from}`;

/**
 * After the offers loaded: the store is configured (purchasesAvailable and
 * the account connected) but the offering came back empty or failed. That
 * is an App Store Connect or RevenueCat problem, never the person's.
 */
export const offeringEmpty = (storeReady: boolean, offers: number | null): boolean => storeReady && !offers;

/**
 * Sources that bring people who still have Plus (their plan is ending,
 * billing failed, they cancelled, their trial ends). From anywhere else a
 * Plus member only looks at or manages the plan, which is no paywall view.
 */
const MEMBER_SOURCES = new Set<PaywallSource>(['plus_expiring', 'billing_issue', 'cancel', 'trial_ending']);

/**
 * Does this opening count as paywall_view? Only once the plan is known:
 * people without Plus always, Plus members only from MEMBER_SOURCES, so the
 * conversion "view → purchase" per source isn't diluted by members who
 * open /plus from their profile.
 */
export const countsAsView = (from: PaywallSource, isPlus: boolean): boolean => !isPlus || MEMBER_SOURCES.has(from);
