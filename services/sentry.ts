/**
 * Native crash telemetry (plan 2.1a). Sentry runs only in release builds
 * that carry EXPO_PUBLIC_SENTRY_DSN (EAS secret, GitHub secret for OTA
 * bundles): without a DSN nothing is initialised and the app behaves as
 * before. Everything that leaves the device is scrubbed
 * (services/sentryScrub.ts); the user is only the SHA-256 of the own
 * number, the same hash /contacts/match uses, never the number itself.
 * No tracing, no navigation integration: crashes and errors, nothing more.
 */
import * as Sentry from '@sentry/react-native';
import * as Application from 'expo-application';
import type { ComponentType } from 'react';
import { hashPhone, toE164 } from '../utils/phone';
import { appInfo } from './appInfo';
import { scrubBreadcrumb, scrubEvent } from './sentryScrub';

export type SentryEnvironment = 'production' | 'preview';

export type InitInput = {
  dsn: string | undefined;
  /** Development builds and Metro never report */
  dev: boolean;
  environment: string | undefined;
  bundleId: string | null;
  version: string;
  build: string;
};

let active = false;

function defaultInput(): InitInput {
  return {
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    dev: __DEV__,
    environment: process.env.EXPO_PUBLIC_SENTRY_ENV ?? 'production',
    bundleId: Application.applicationId,
    version: appInfo.version,
    build: appInfo.build,
  };
}

/** "preview" only when the build says so; anything else is production. */
export function environmentOf(value: string | undefined): SentryEnvironment {
  return value === 'preview' ? 'preview' : 'production';
}

/** Release and dist the way Sentry groups native crashes: bundleId@version+build. */
export function releaseOf(input: Pick<InitInput, 'bundleId' | 'version' | 'build'>): { release: string; dist: string } {
  return { release: `${input.bundleId ?? 'app'}@${input.version}+${input.build}`, dist: input.build };
}

/** The options handed to Sentry.init; pure so the tests can read them. */
export function buildOptions(input: InitInput): Sentry.ReactNativeOptions {
  return {
    dsn: input.dsn,
    enabled: true,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    enableAutoSessionTracking: true,
    enableAutoPerformanceTracing: false,
    attachScreenshot: false,
    attachViewHierarchy: false,
    // App hangs (2 s on the main thread) are native events that bypass
    // beforeSend and would eat the free-tier quota during calls; off for now
    enableAppHangTracking: false,
    // sentry-cocoa would record every NSURLSession request with its query
    // (/me?phone=…) in the native scope, which native crashes send past
    // beforeSend; the JS fetch/xhr crumbs cover the same calls, scrubbed
    enableNetworkBreadcrumbs: false,
    // tracesSampleRate 0 still counts as "tracing on" for the SDK and would
    // start app-start, frame and stall tracking that never sends anything
    enableAppStartTracking: false,
    enableNativeFramesTracking: false,
    enableStallTracking: false,
    maxBreadcrumbs: 30,
    ...releaseOf(input),
    environment: environmentOf(input.environment),
    beforeSend: (event) => scrubEvent(event),
    beforeBreadcrumb: (crumb) => scrubBreadcrumb(crumb),
  };
}

/**
 * Start Sentry when the build has a DSN and is not a development build.
 * Returns whether reporting is active. Called once from app/_layout.tsx,
 * before the JavaScript error handler is installed, so Sentry's own handler
 * sits underneath ours (services/diagnostics.ts).
 */
export function init(input: InitInput = defaultInput()): boolean {
  if (input.dev || !input.dsn) {
    active = false;
    return false;
  }
  try {
    Sentry.init(buildOptions(input));
    active = true;
  } catch (e) {
    console.warn('[sentry] init failed', e);
    active = false;
  }
  return active;
}

export function isActive(): boolean {
  return active;
}

/**
 * The signed-in user as a pseudonymous key: SHA-256 of the E.164 number
 * (utils/phone.ts, as for /contacts/match). null clears it on sign-out.
 */
export function setUser(phone: string | null): void {
  if (!active) return;
  if (!phone) {
    Sentry.setUser(null);
    return;
  }
  Sentry.setUser({ id: hashPhone(toE164(phone) ?? phone) });
}

/** Handled errors from services/diagnostics.ts; fatal ones keep their level. */
export function captureException(error: Error, fatal = false): void {
  if (!active) return;
  Sentry.captureException(error, { level: fatal ? 'fatal' : 'error' });
}

/**
 * Options for Sentry.wrap(): the touch boundary must not read the text of
 * tapped elements (friends' names on buttons and cards). Labels from
 * accessibilityLabel/testID still reach the breadcrumb and are dropped in
 * scrubBreadcrumb; only the component names stay.
 */
export const WRAP_OPTIONS: Sentry.ReactNativeWrapperOptions = {
  touchEventBoundaryProps: { extractTextFromChildren: false },
};

/** Sentry.wrap() around the root layout only when active; otherwise the component itself. */
export function wrap<P extends Record<string, unknown>>(component: ComponentType<P>): ComponentType<P> {
  return active ? Sentry.wrap(component, WRAP_OPTIONS) : component;
}

/** Tests only: forget the state of a previous init(). */
export function resetForTests(): void {
  active = false;
}
