/**
 * Pure scrubbing for crash reports (services/sentry.ts): phone numbers,
 * e-mail addresses and request details must not leave the device, even
 * inside an error message, a breadcrumb or an object logged with
 * console.error. Kept free of the Sentry SDK so jest can test it without
 * native modules. The phone pattern is deliberately conservative; machine
 * ids (UUIDs such as call ids and the OTA update id, long hex trace ids,
 * ISO dates) are set aside before it runs, so they reach Sentry intact and
 * a console crumb with a call id is not dropped for "holding a number".
 */

// "+" and 8 to 15 digits (E.164 fits), optionally with spaces, dashes or
// slashes between the digits as people type them
const PHONE_SRC = '\\+?(?:\\d[\\s\\-/()]?){7,14}\\d';
const EMAIL_SRC = '[\\w.+-]+@[\\w-]+(?:\\.[\\w-]+)+';
const PHONE = new RegExp(PHONE_SRC, 'g');
const EMAIL = new RegExp(EMAIL_SRC, 'g');
// Non-global copies for tests (a global regex keeps lastIndex between calls)
const PHONE_TEST = new RegExp(PHONE_SRC);
const EMAIL_TEST = new RegExp(EMAIL_SRC);

// Machine ids that the phone pattern would otherwise eat: UUIDs (call ids,
// expo update ids), hex runs of 16+ with at least one letter (trace and
// span ids, ObjectIds; a run of digits only stays exposed, a number with a
// "00" prefix is 17 digits) and ISO dates (19xx/20xx) with an optional time.
const MACHINE_ID = new RegExp(
  [
    '\\b[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}\\b',
    '\\b(?=[0-9A-Fa-f]*[A-Fa-f])[0-9A-Fa-f]{16,}\\b',
    // a date alone must not be followed by more digits ("0176-12-22 2222"
    // stays a number); with a time it ends at the time or the offset
    '\\b(?:19|20)\\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\\d|3[01])' +
      '(?:[T ]\\d{2}:\\d{2}(?::\\d{2}(?:\\.\\d+)?)?(?:Z|[+-]\\d{2}:?\\d{2})?|(?![\\s\\-/()]?\\d))',
  ].join('|'),
  'g',
);
// Private-use markers around the index: no digit run long enough for PHONE
const MARK_OPEN = '\uE000';
const MARK_CLOSE = '\uE001';
const MARKED = new RegExp(`${MARK_OPEN}(\\d+)${MARK_CLOSE}`, 'g');

export const PHONE_PLACEHOLDER = '[nummer]';
export const EMAIL_PLACEHOLDER = '[email]';

/** Run fn on the text with machine ids set aside, then put them back. */
function withIdsKept(text: string, fn: (masked: string) => string): string {
  const kept: string[] = [];
  const masked = text.replace(MACHINE_ID, (id) => `${MARK_OPEN}${kept.push(id) - 1}${MARK_CLOSE}`);
  if (kept.length === 0) return fn(text);
  return fn(masked).replace(MARKED, (marker, i: string) => kept[Number(i)] ?? marker);
}

/** Replace phone numbers and e-mail addresses in free text. */
export function scrubText(text: string): string {
  // e-mails first: an address may hold digits and must go as a whole
  return withIdsKept(text.replace(EMAIL, EMAIL_PLACEHOLDER), (t) => t.replace(PHONE, PHONE_PLACEHOLDER));
}

/** Does the text contain something that looks like a phone number? */
export function hasPhoneNumber(text: string): boolean {
  let found = false;
  withIdsKept(text, (t) => {
    found = PHONE_TEST.test(t);
    return t;
  });
  return found;
}

/** Does the text contain an e-mail address? */
export function hasEmail(text: string): boolean {
  return EMAIL_TEST.test(text);
}

/**
 * Scrub every string inside a value, however deep (console breadcrumbs carry
 * the logged objects in data.arguments, call data among them). Objects and
 * arrays are copied, other values pass through; cycles stop at a marker.
 */
export function scrubDeep<T>(value: T, seen: WeakSet<object> = new WeakSet()): T {
  if (typeof value === 'string') return scrubText(value) as T;
  // an Error's fields are not enumerable; keep its name and message as text
  if (value instanceof Error) return scrubText(`${value.name}: ${value.message}`) as T;
  if (Array.isArray(value)) {
    if (seen.has(value)) return '[cycle]' as T;
    seen.add(value);
    return value.map((v) => scrubDeep(v, seen)) as T;
  }
  if (value !== null && typeof value === 'object') {
    if (seen.has(value)) return '[cycle]' as T;
    seen.add(value);
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, scrubDeep(v, seen)])) as T;
  }
  return value;
}

/** Every string inside a value joined, so a drop check sees nested fields too. */
function flatten(value: unknown, seen: WeakSet<object> = new WeakSet()): string {
  if (typeof value === 'string') return value;
  if (value instanceof Error) return value.message;
  if (Array.isArray(value)) {
    if (seen.has(value)) return '';
    seen.add(value);
    return value.map((v) => flatten(v, seen)).join(' ');
  }
  if (value !== null && typeof value === 'object') {
    if (seen.has(value)) return '';
    seen.add(value);
    return Object.values(value as Record<string, unknown>)
      .map((v) => flatten(v, seen))
      .join(' ');
  }
  return '';
}

/** A URL without its query string and fragment ("/friend?phone=…" -> "/friend"). */
export function stripQuery(url: string): string {
  const cut = url.search(/[?#]/);
  return cut === -1 ? url : url.slice(0, cut);
}

/**
 * A URL as a breadcrumb may carry it: no query, and no phone number or
 * e-mail in the path either. The app puts a friend's number into paths
 * (/friends/:phone, /stats/:phone, /blocks/:phone), percent-encoded
 * ("%2B49…"), so the path is decoded before the scrub and the "+" goes with
 * the number. A path without a hit keeps its original encoding; a broken
 * escape is scrubbed as it stands.
 */
export function scrubUrl(url: string): string {
  const bare = stripQuery(url);
  let decoded: string;
  try {
    decoded = decodeURIComponent(bare);
  } catch {
    return scrubText(bare);
  }
  const scrubbed = scrubText(decoded);
  return scrubbed === decoded ? bare : scrubbed;
}

// Minimal shapes of what Sentry hands to beforeSend/beforeBreadcrumb; the
// SDK's own types are wider and fit these, so no SDK import is needed here
export type ScrubbableEvent = {
  message?: string;
  logentry?: { message?: string; formatted?: string; params?: unknown[] };
  exception?: { values?: { value?: string }[] };
  breadcrumbs?: ScrubbableBreadcrumb[];
  request?: unknown;
  user?: { id?: string | number };
  contexts?: { device?: { name?: string } } & Record<string, unknown>;
  extra?: unknown;
  tags?: Record<string, unknown>;
};

export type ScrubbableBreadcrumb = {
  category?: string;
  message?: string;
  data?: Record<string, unknown>;
};

// Contexts and tags the SDK fills from the device and the build (no user
// input; device without its name, see above): passed through untouched so
// ids, versions and timestamps stay filterable in Sentry (release gate:
// expo.updates.update_id, ota_updates.update_id). Everything else ('route'
// with its params among it) is scrubbed in depth.
const SDK_CONTEXTS = new Set(['trace', 'app', 'os', 'device', 'culture', 'runtime', 'ota_updates', 'expo_constants', 'turbo_module']);
const SDK_TAG_PREFIXES = ['expo.', 'event.'];

function scrubOwnKeys<V extends Record<string, unknown>>(value: V, isSdk: (key: string) => boolean): V {
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, isSdk(k) ? v : scrubDeep(v)])) as V;
}

/**
 * The event as it may leave the device: texts scrubbed, no request, the
 * user reduced to its id (the phone hash), no device name (often the
 * owner's name), no free-form extra; contexts and tags scrubbed in depth
 * except the SDK's own (above).
 */
export function scrubEvent<T extends ScrubbableEvent>(event: T): T {
  const out: ScrubbableEvent = { ...event };
  if (typeof out.message === 'string') out.message = scrubText(out.message);
  // captureMessage with parameterize() sends the template and its params here
  if (out.logentry) {
    const entry = { ...out.logentry };
    if (typeof entry.message === 'string') entry.message = scrubText(entry.message);
    if (typeof entry.formatted === 'string') entry.formatted = scrubText(entry.formatted);
    if (entry.params) entry.params = scrubDeep(entry.params);
    out.logentry = entry;
  }
  if (out.exception?.values) {
    out.exception = {
      ...out.exception,
      values: out.exception.values.map((v) => (typeof v.value === 'string' ? { ...v, value: scrubText(v.value) } : v)),
    };
  }
  if (out.breadcrumbs) {
    out.breadcrumbs = out.breadcrumbs
      .map((crumb) => scrubBreadcrumb(crumb))
      .filter((crumb): crumb is ScrubbableBreadcrumb => crumb !== null);
  }
  delete out.request;
  delete out.extra;
  if (out.user) out.user = out.user.id !== undefined ? { id: out.user.id } : {};
  if (out.contexts?.device && 'name' in out.contexts.device) {
    const { name: _name, ...device } = out.contexts.device;
    out.contexts = { ...out.contexts, device };
  }
  if (out.contexts) out.contexts = scrubOwnKeys(out.contexts, (key) => SDK_CONTEXTS.has(key));
  if (out.tags) out.tags = scrubOwnKeys(out.tags, (key) => SDK_TAG_PREFIXES.some((p) => key.startsWith(p)));
  return out as T;
}

// Breadcrumb categories of Sentry's TouchEventBoundary (Sentry.wrap):
// 'touch' for a tap, 'ui.multiClick' for rage taps; 'ui.click' is the web name
const TOUCH_CATEGORIES = new Set(['touch', 'ui.click', 'ui.multiClick']);

/** One entry of a touch breadcrumb's component path without its label. */
type TouchPathEntry = { name?: string; element?: string; file?: string };

/**
 * Touch breadcrumbs carry the tapped element's label (text,
 * accessibilityLabel, testID), in this app often a friend's name. Keep only
 * the component names, elements and files of the path and rebuild the
 * message from the first name, never from the label.
 */
function scrubTouchBreadcrumb(out: ScrubbableBreadcrumb): void {
  const raw = Array.isArray(out.data?.path) ? out.data.path : [];
  const path: TouchPathEntry[] = raw
    .filter((entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null)
    .map((entry) => {
      const kept: TouchPathEntry = {};
      if (typeof entry.name === 'string') kept.name = entry.name;
      if (typeof entry.element === 'string') kept.element = entry.element;
      if (typeof entry.file === 'string') kept.file = entry.file;
      return kept;
    });
  const first = path.find((entry) => entry.name);
  out.data = { path };
  out.message = `Touch event within element: ${first?.name ?? 'unknown'}`;
}

/**
 * Breadcrumbs: network crumbs keep method, status and the URL without its
 * query and without numbers or addresses in the path (scrubUrl); touch
 * crumbs lose their label; console crumbs with a phone number or an e-mail
 * anywhere in their message or logged arguments (objects included) are
 * dropped, all others scrubbed in depth. Returns null for a
 * crumb that must not be sent.
 */
export function scrubBreadcrumb<T extends ScrubbableBreadcrumb>(crumb: T): T | null {
  const out: ScrubbableBreadcrumb = { ...crumb };
  if (out.category && TOUCH_CATEGORIES.has(out.category)) {
    scrubTouchBreadcrumb(out);
    return out as T;
  }
  if (out.category === 'fetch' || out.category === 'xhr' || out.category === 'http') {
    const data = out.data ?? {};
    const kept: Record<string, unknown> = {};
    if (typeof data.url === 'string') kept.url = scrubUrl(data.url);
    if (typeof data.method === 'string') kept.method = data.method;
    if (data.status_code !== undefined) kept.status_code = data.status_code;
    out.data = kept;
    if (typeof out.message === 'string') out.message = scrubUrl(out.message);
    return out as T;
  }
  if (out.category === 'console') {
    const text = flatten([out.message, out.data]);
    if (hasPhoneNumber(text) || hasEmail(text)) return null;
  }
  if (typeof out.message === 'string') out.message = scrubText(out.message);
  if (out.data) out.data = scrubDeep(out.data);
  return out as T;
}
