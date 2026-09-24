/**
 * Which live banners the app just showed (components/InAppBanner), so the
 * foreground push handler only hides a system banner the user already saw
 * in the app, and never swallows a push unseen.
 */
const SHOWN_WINDOW_MS = 30 * 1000;
const shown = new Map<string, number>();

const keyOf = (type: string, phone: string) => `${type}:${phone}`;

export function markBannerShown(type: string, phone: string): void {
  shown.set(keyOf(type, phone), Date.now());
}

export function bannerRecentlyShown(type: string, phone: string | undefined): boolean {
  if (!phone) return false;
  const at = shown.get(keyOf(type, phone));
  return !!at && Date.now() - at < SHOWN_WINDOW_MS;
}
