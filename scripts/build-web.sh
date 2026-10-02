#!/usr/bin/env bash
# The website (wannayap.app, Netlify): the app's web build, the landing page
# at /, plus the static files in public/ (download redirect, Universal Links),
# which Expo copies. expo export renders every file in app/, so the app-only
# screens have <route>.web.tsx stubs (components/AppOnlyWeb.tsx: noindex and a
# page load of /, the landing page below, not a router redirect); only
# /einladung, /kreis, /datenschutz and /impressum are real pages. scripts/check-web-stubs.js keeps the list complete (CI) and writes
# dist/_headers (X-Robots-Tag: noindex for the stub routes, for crawlers that
# never run the page's JavaScript). Known gap: without JavaScript a stub route
# shows the empty shell instead of redirecting; Netlify has no per-route
# redirect that could tell a stub from a public page without this list.
# Not verified yet: whether Netlify matches the parenthesised paths in
# _headers (/(tabs), /(tabs)/index) literally. After the first deploy with
# this file, check `curl -I https://wannayap.app/stats` and
# `curl -I "https://wannayap.app/(tabs)/"` for `X-Robots-Tag: noindex` and
# note the result here (owner work after the first deploy).
#
# Environment (Netlify → Site configuration → Environment variables):
# LANDING_MODE=live for the App Store buttons, STORE_URL and PROVIDER_TOKEN for
# the /download redirect (the build stops when live without STORE_URL),
# TESTFLIGHT_URL as the fallback before the store; see marketing/build.js.
set -euo pipefail
cd "$(dirname "$0")/.."

rm -rf dist
npx expo export --platform web
# The landing page replaces the app's start page; download.html (copied from
# public/ above) gets STORE_URL, PROVIDER_TOKEN and TESTFLIGHT_URL written in
node marketing/build.js --landing-only --out dist
# Expo's route list is for development only
rm -f dist/_sitemap.html
# Netlify merges this with netlify.toml: app-only routes are not indexed
node scripts/check-web-stubs.js --headers > dist/_headers
echo "Website ready in dist/"
