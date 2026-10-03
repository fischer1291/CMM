# CLAUDE.md

Wanna yap?, an iOS app for spontaneous calls among friends: Expo / React
Native with expo-router, TypeScript, native calls (Agora, CallKit, PushKit),
built with EAS, shipped through TestFlight to the App Store. The backend
lives in the `CMM-backend-new` repo (Node, Express, Socket.IO, Mongoose on
Render); the plan everything follows is `docs/SCALE-PLAN.md`.

## Working here

- `npm run check` runs typecheck, lint and jest, the same as CI; it must be
  green before a commit. Native modules mean a development build
  (`npm run ios`), Expo Go does not work.
- Screens are files under `app/` (expo-router, file-based routes only);
  shared UI in `components/`, state in `contexts/`, calls, push and
  purchases in `services/`, runtime config in `config/env.ts`
  (`EXPO_PUBLIC_*`, inlined at build time). Comments are English;
  everything a user reads is German, "du", no pressure in tone. No
  translation layer: locale is only measured (`docs/adr/0001-i18n.md`).
- No new dependencies without a reason in the commit message (native
  modules also change the iOS project). No secrets in the repo: keys live
  in EAS, GitHub Actions secrets and `.env` files that stay local; store
  and campaign links come from the build environment
  (`scripts/build-web.sh`).
- Before a release, run the test matrix in `docs/RELEASE.md` (section 5)
  on two devices whenever calls, pushes, moments or account deletion are
  touched; the full checklist is there, not here.
- Operations docs live in `docs/` (index: `docs/README.md`): runbook,
  services, emergency, research, privacy change process. A new data type
  or provider brings its line in `CMM-backend-new/COMPLIANCE.md` and the
  checklist in `.github/PULL_REQUEST_TEMPLATE.md` in the same PR
  (`docs/PRIVACY-CHANGE.md`). Never edit `docs/SCALE-PLAN.md` as a side
  effect of implementing an item.
- Deploy window for the backend: never within ±15 minutes of the Yap
  Moment (`docs/RUNBOOK.md`); app builds have no window but a phased
  release that can be paused.

## Glossary

- **Call**: one ring, answered or not. **Talk**: an answered call with
  real talk time, the unit the stats and milestones count.
- **Moment**: a picture from a real call, shared once the other person
  agreed, visible to friends for 24 hours. **Yap Moment**: the daily
  ten-minute window at a random time per time zone when everyone is
  pushed to be reachable at once.
- **Plus** (Wanna yap+): the paid plan via RevenueCat (`services/purchases.ts`).
  Sources on the backend: `store`, `sandbox`, `admin`, `referral`,
  `waitlist`, `gift`.
- **Kreis** (circle): a small group with a shared invite link (`/kreis`),
  rituals run inside it. **Einladungscode**: the per-user code in the
  invite link (`content/links.ts`, `/einladung?von=CODE`).
- **Dev / Prod variant**: `APP_VARIANT=development` gives a second bundle
  id and scheme so both installs fit on one device (`docs/DEV_SETUP.md`).
- **Owner / support / viewer**: roles in the backend's admin console.
