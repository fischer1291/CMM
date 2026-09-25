#!/bin/bash
# Builds a Release archive and uploads it to App Store Connect (TestFlight).
# Usage: scripts/testflight.sh [build-number]
# Without a build number, the current one is incremented by 1. Needs the
# Apple account signed in to Xcode (Settings > Accounts) and the app record
# in App Store Connect (bundle ID com.schly21.kontaktlisteapp).
set -euo pipefail
cd "$(dirname "$0")/.."

PLIST=ios/CallMeMaybe/Info.plist
current=$(/usr/libexec/PlistBuddy -c "Print :CFBundleVersion" "$PLIST")
build=${1:-$((current + 1))}
version=$(/usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" "$PLIST")
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion $build" "$PLIST"
echo "▶ Wanna yap? $version ($build)"

OUT=build/testflight
rm -rf "$OUT" && mkdir -p "$OUT"
export LANG=en_US.UTF-8 NODE_OPTIONS='--no-experimental-webstorage'

xcodebuild -workspace ios/CallMeMaybe.xcworkspace -scheme CallMeMaybe -configuration Release \
  -destination 'generic/platform=iOS' -archivePath "$OUT/CallMeMaybe.xcarchive" \
  -allowProvisioningUpdates archive | tail -3

xcodebuild -exportArchive -archivePath "$OUT/CallMeMaybe.xcarchive" \
  -exportOptionsPlist scripts/ExportOptions-TestFlight.plist -exportPath "$OUT/export" \
  -allowProvisioningUpdates | tail -5

echo "✅ Uploaded $version ($build). App Store Connect processes it for a few minutes, then it appears in TestFlight."
