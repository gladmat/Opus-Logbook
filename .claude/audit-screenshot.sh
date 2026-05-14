#!/usr/bin/env bash
# Capture an iOS-sim screenshot, downscaled to a <=1568px long edge: the Anthropic
# API rejects many-image requests with any image >2000px/side, and iPhone 17 sim
# shots are 1206x2622. The >1568 guard is load-bearing -- `sips -Z` UPSCALES
# smaller inputs, so iPhone SE 3 (750x1334) must be copied through as-is.
# Usage: .claude/audit-screenshot.sh <output-path.png>
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "usage: $0 <output-path.png>" >&2
  exit 1
fi

out="$1"
tmp="${TMPDIR:-/tmp}/audit-screenshot-$$.png"
trap 'rm -f "$tmp"' EXIT

xcrun simctl io booted screenshot "$tmp"

w=$(sips -g pixelWidth "$tmp" | tail -1 | tr -dc 0-9)
h=$(sips -g pixelHeight "$tmp" | tail -1 | tr -dc 0-9)
long="$w"; [ "$h" -gt "$w" ] && long="$h"

mkdir -p "$(dirname "$out")"
if [ "$long" -gt 1568 ]; then
  sips -Z 1568 "$tmp" --out "$out" >/dev/null
else
  cp "$tmp" "$out"
fi
echo "$out"
