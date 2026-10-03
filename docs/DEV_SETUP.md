# Development & Production App Setup

This project is configured to support parallel installation of development and production versions on the same device.

## App Variants

### Production App
- **Name:** "Wanna yap?"
- **Bundle ID:** `com.schly21.kontaktlisteapp`
- **Scheme:** `wannayap`
- **Distribution:** TestFlight/App Store

### Development App  
- **Name:** "Wanna yap? (Dev)"
- **Bundle ID:** `com.schly21.kontaktlisteapp.dev`
- **Scheme:** `wannayap-dev`
- **Distribution:** Internal builds

## Building

### Development Build
```bash
# Option 1: Use the script
./scripts/build-dev.sh

# Option 2: Direct command
eas build --profile development --platform ios
```

### Production Build
```bash
eas build --profile production --platform ios
```

## How It Works

The app uses `app.config.js` with environment variables to switch between configurations:

- `APP_VARIANT=development` → Development version
- `APP_VARIANT=production` (or unset) → Production version

## Installation

Both versions can be installed simultaneously on the same device:
- Production version from TestFlight
- Development version from EAS internal distribution

Each has a different bundle identifier, so iOS treats them as separate apps.

## Configuration Details

The dynamic configuration switches:
- App name and display name
- Bundle identifier 
- URL schemes
- Runtime environment flags (`extra.isDev`)

Both versions share the same:
- Assets and icons
- Permissions and capabilities
- Core functionality
- Backend endpoints

## Native modules and the committed `ios/` project

The iOS project is committed (no prebuild). A new native module is linked
by `use_native_modules!` in `ios/Podfile`, so EAS builds pick it up on
their own, but a **local development build needs the pods once** after
such a change:

```bash
npx pod-install        # or: (cd ios && pod install), LANG=en_US.UTF-8
npm run ios
```

This applies to `@sentry/react-native` (crash telemetry, plan 2.1a,
`services/sentry.ts`): the Sentry pod is linked this way, `Podfile.lock`
is updated by `pod install`, never by hand. Sentry itself stays off in
development builds (`__DEV__`) and without `EXPO_PUBLIC_SENTRY_DSN`, so
nothing is reported from a dev build or Metro; the setup for release
builds is in `RELEASE.md`, section "Crash-Telemetrie (Sentry)".
The version is the current 8.x on purpose, not the ~7.2 that Expo SDK 54
lists in `bundledNativeModules.json` (plan 2.1a asked for the latest
release that runs on RN 0.81); `package.json` sets
`expo.install.exclude: ["@sentry/react-native"]`, so `npx expo install
--check` and expo-doctor do not flag it. Revisit on the next SDK upgrade.
