# Wanna yap?

Expo / React Native app that shows which of your contacts are available for a
call right now, with native video calls (Agora + iOS CallKit) and shared
"CallMoments".

The backend lives in the `CMM-backend-new` submodule (Node/Express, MongoDB,
Socket.IO, deployed on Render).

## Setup

```bash
git clone --recurse-submodules https://github.com/fischer1291/CMM.git
cd CMM
npm install
```

The app uses native modules (CallKeep, Agora, PushKit), so it needs a
development build — Expo Go does not work.

```bash
npm run ios        # build + run on simulator or a connected device
npm start          # only start Metro for an installed dev build
```

### Configuration

Set via environment variables when starting Metro (see `config/env.ts`):

| Variable | Default |
|---|---|
| `EXPO_PUBLIC_API_URL` | `https://api.wannayap.app` |
| `EXPO_PUBLIC_AGORA_APP_ID` | production Agora App ID |
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY` | none: purchases stay off. Store builds and OTA updates take it from `eas.json` (`scripts/eas-env.js`) |
| `EXPO_PUBLIC_SENTRY_DSN` | none: crash telemetry stays off (also always off in development builds). Release builds take it from the EAS environment variable, OTA bundles from the GitHub secret of the same name (`docs/RELEASE.md`, "Crash-Telemetrie") |
| `EXPO_PUBLIC_SENTRY_ENV` | `production`; `eas.json` sets `preview` for the preview profile |

### Local machine notes

- With Node 25, start Metro with `NODE_OPTIONS='--no-experimental-webstorage'`
  (Node 22 LTS is unaffected).
- `pod install` needs a UTF-8 locale: `export LANG=en_US.UTF-8`.

## Checks

```bash
npm run check      # typecheck + lint, same as CI
```

## Project layout

| Path | Contents |
|---|---|
| `app/` | Screens (expo-router file-based routes only) |
| `components/` | Shared UI components |
| `contexts/` | Auth and call React contexts |
| `services/` | Call state, CallKit/CallKeep, notifications, PushKit token |
| `config/` | Runtime configuration |
| `ios/` | Native iOS project (committed; contains the PushKit/CallKit AppDelegate) |
| `docs/` | Index in [`docs/README.md`](docs/README.md): dev setup, release checklist, [`RUNBOOK.md`](docs/RUNBOOK.md) (alarms, backup and restore, rollback, deploy window), [`SERVICES.md`](docs/SERVICES.md) (every service and how to hand over access), [`EMERGENCY.md`](docs/EMERGENCY.md) (if the founder is out), [`RESEARCH.md`](docs/RESEARCH.md) (user research), [`PRIVACY-CHANGE.md`](docs/PRIVACY-CHANGE.md) (privacy change process), historical fix notes and [`SCALE-PLAN.md`](docs/SCALE-PLAN.md): the 12-month plan for the processes and automation that turn the app into a company |

## Calls on iOS

Incoming calls are delivered by socket (app open) and VoIP push (app in
background/killed). `ios/CallMeMaybe/AppDelegate.swift` reports every VoIP push
to CallKit natively; `services/PlatformCallAdapter.ts` bridges CallKit events
into the app. See `docs/DEV_SETUP.md` for build variants.
