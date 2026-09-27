#!/bin/bash
# Word timestamps for a voice recording:  npm run transcribe -- hero/audio/voiceover.wav
# Builds a tiny app (macOS only grants speech recognition to apps) and runs it.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
FILE="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
APP="$HERE/../../dist/transcribe.app"
if [ ! -x "$APP/Contents/MacOS/transcribe" ] || [ "$HERE/main.swift" -nt "$APP/Contents/MacOS/transcribe" ]; then
  mkdir -p "$APP/Contents/MacOS"
  swiftc -O "$HERE/main.swift" -o "$APP/Contents/MacOS/transcribe" \
    -Xlinker -sectcreate -Xlinker __TEXT -Xlinker __info_plist -Xlinker "$HERE/Info.plist"
  sed 's|</dict></plist>|<key>CFBundleExecutable</key><string>transcribe</string><key>CFBundlePackageType</key><string>APPL</string><key>LSUIElement</key><true/></dict></plist>|' "$HERE/Info.plist" > "$APP/Contents/Info.plist"
  codesign -s - --force "$APP" >/dev/null 2>&1
fi
OUT="$(mktemp)"
# 24 kHz mono works best for the recogniser
WAV="$(mktemp).wav"
ffmpeg -loglevel error -y -i "$FILE" -ac 1 -ar 24000 -c:a pcm_s16le "$WAV"
open -W -n --stdout "$OUT" --stderr /dev/null "$APP" --args "$WAV"
echo -e "von\tbis\tWort"
cat "$OUT"
rm -f "$OUT" "$WAV"
