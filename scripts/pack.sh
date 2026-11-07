#!/usr/bin/env bash
# Builds dist/jumpbar-<version>.zip containing only what the Chrome Web Store needs.
set -euo pipefail
cd "$(dirname "$0")/.."

version=$(python3 -c 'import json; print(json.load(open("manifest.json"))["version"])')
out="dist/jumpbar-${version}.zip"

mkdir -p dist
rm -f "$out"
zip -r -X "$out" manifest.json background.js content.js palette.js options.html options.js icons \
  -x "icons/icon.svg" "*.DS_Store"

echo "Built $out"
unzip -l "$out"
