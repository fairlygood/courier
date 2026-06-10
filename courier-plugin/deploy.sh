#!/bin/bash
# Build plugin, push over ADB, and prompt to install.
# Works over USB or TCP/IP (wi-fi) ADB connections.
set -euo pipefail

PLUGIN_DIR="$(cd "$(dirname "$0")" && pwd)"
SNPLG="$PLUGIN_DIR/build/outputs/CourierPlugin.snplg"
TARGET="/storage/emulated/0/MyStyle/"

echo "=== Building plugin ==="
cd "$PLUGIN_DIR"
bash buildPlugin.sh

if [ ! -f "$SNPLG" ]; then
  echo "ERROR: .snplg not found at $SNPLG"
  exit 1
fi

echo ""
echo "=== Deploying to device ==="
adb push "$SNPLG" "$TARGET"
echo "Pushed successfully."

echo ""
echo "Now on the Supernote: Settings → Apps → Plugins → Add Plugin"
echo "Select 'CourierPlugin' from the list."
