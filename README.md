# Call Me Maybe

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
| `EXPO_PUBLIC_API_URL` | `https://cmm-backend-gdqx.onrender.com` |
| `EXPO_PUBLIC_AGORA_APP_ID` | production Agora App ID |

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
| `docs/` | Dev setup and historical fix notes |

## Calls on iOS

Incoming calls are delivered by socket (app open) and VoIP push (app in
background/killed). `ios/CallMeMaybe/AppDelegate.swift` reports every VoIP push
to CallKit natively; `services/PlatformCallAdapter.ts` bridges CallKit events
into the app. See `docs/DEV_SETUP.md` for build variants.
