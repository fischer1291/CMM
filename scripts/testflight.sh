#!/bin/bash
# Same as GitHub → Actions → iOS-Build, started from a terminal: EAS builds the
# production app in the cloud, counts the build number and uploads it to
# App Store Connect (TestFlight). Needs `npx eas-cli login` (account schly21)
# and a clean git tree; the build uses what is committed.
# Usage: scripts/testflight.sh ["what to test"]
set -euo pipefail
cd "$(dirname "$0")/.."

node scripts/version.js
args=(--platform ios --profile production --auto-submit)
[ $# -gt 0 ] && args+=(--what-to-test "$1")
npx eas-cli@latest build "${args[@]}"
