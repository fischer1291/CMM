/**
 * Web stand-in for screens that exist only in the app. expo-router renders
 * every file in app/ into the static web export (scripts/build-web.sh), and
 * it has no per-platform exclusion, so each app screen gets a sibling
 * <route>.web.tsx that re-exports this: search engines are told not to index
 * it and the browser loads the landing page. The redirect is a real page load
 * (window.location.replace), not expo-router's <Redirect>: inside the router
 * "/" is the app's start route (tabs)/index, which is guarded, so a router
 * redirect would bounce to onboarding, which on the web is this stub again,
 * and loop. The static landing page replaces dist/index.html, so a page load
 * of "/" never reaches the router. +html.tsx does not know the route it
 * wraps, so the noindex hint lives here, in the page itself. Note: the
 * exported HTML of every route is only a shell (app/_layout.tsx waits for the
 * fonts), so the meta tag and the redirect take effect once the page has
 * hydrated; the screen itself is never routed on the web (route tree with
 * platform "web" resolves to this file). scripts/check-web-stubs.js makes
 * sure no screen is missing its stub.
 */
import Head from 'expo-router/head';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';

export const LANDING_PATH = '/';

/**
 * Where the browser should go for an app-only URL, or null when it is already
 * at the landing path (then a redirect would reload the same page forever,
 * e.g. in `expo start --web`, where "/" is the app shell). Pure, for the tests.
 */
export function landingRedirect(pathname: string): string | null {
  const clean = pathname.replace(/\/+$/, '') || '/';
  return clean === LANDING_PATH ? null : LANDING_PATH;
}

export default function AppOnlyWeb() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const target = landingRedirect(window.location.pathname);
    if (target) window.location.replace(target);
  }, []);
  return (
    <Head>
      <meta name="robots" content="noindex" />
    </Head>
  );
}
