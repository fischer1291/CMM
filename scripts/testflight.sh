#!/bin/bash
# Same as GitHub → Actions → iOS-Build, started from a terminal: EAS builds the
# production app in the cloud, counts the build number and uploads it to
# App Store Connect (TestFlight). Needs `npx eas-cli login` (account schly21)
# and a clean git tree; the build uses what is committed.
# Usage: scripts/testflight.sh ["what to test"]
# The note is printed, not sent: EAS passes it to TestFlight on the Enterprise
# plan only and refuses the submission otherwise; paste it into App Store
# Connect → TestFlight → the build → "Was testen?".
set -euo pipefail
cd "$(dirname "$0")/.."

node scripts/version.js
args=(--platform ios --profile production --auto-submit)
npx eas-cli@latest build "${args[@]}"
if [ $# -gt 0 ]; then
  printf '\nWas testen? (in TestFlight einfügen):\n%s\n' "$1"
fi
