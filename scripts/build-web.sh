#!/usr/bin/env bash
# The website (wannayap.app, Netlify): the app's web build for /einladung,
# /kreis, /datenschutz and /impressum, the landing page at /, plus the static
# files in web/ (download redirect, Universal Links).
set -euo pipefail
cd "$(dirname "$0")/.."

rm -rf dist
npx expo export --platform web
# The landing page replaces the app's start page
node marketing/build.js --landing-only --out dist
cp -R web/. dist/
# Expo's route list is for development only
rm -f dist/_sitemap.html
echo "Website ready in dist/"
