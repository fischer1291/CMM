#!/usr/bin/env bash
# The website (wannayap.app, Netlify): the app's web build (expo export renders
# every screen in app/ statically, not only /einladung, /kreis, /datenschutz
# and /impressum; limiting the web routes is a later step, docs/SCALE-PLAN.md
# 2.16), the landing page
# at /, plus the static files in public/ (download redirect, Universal Links),
# which Expo copies.
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
echo "Website ready in dist/"
