# Development & Production App Setup

This project is configured to support parallel installation of development and production versions on the same device.

## App Variants

### Production App
- **Name:** "Call Me Maybe"
- **Bundle ID:** `com.schly21.kontaktlisteapp`
- **Scheme:** `kontaktlisteapp`
- **Distribution:** TestFlight/App Store

### Development App  
- **Name:** "Call Me Maybe (Dev)"
- **Bundle ID:** `com.schly21.kontaktlisteapp.dev`
- **Scheme:** `kontaktlisteapp-dev`
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