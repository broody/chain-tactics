#!/usr/bin/env bash
set -euo pipefail

# Sync addresses from contracts/manifest_sepolia.json into:
#   - client/src/dojo/config.ts         (WORLD_ADDRESS, ACTIONS_ADDRESS)
#   - contracts/torii_sepolia.toml      (world_address)

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MANIFEST="$ROOT/contracts/manifest_sepolia.json"

if [ ! -f "$MANIFEST" ]; then
  echo "ERROR: $MANIFEST not found" >&2
  exit 1
fi

# Extract addresses with node (available in any pnpm project)
WORLD_ADDRESS=$(node -e "
  const m = require('$MANIFEST');
  console.log(m.world.address);
")

ACTIONS_ADDRESS=$(node -e "
  const m = require('$MANIFEST');
  const c = m.contracts.find(c => c.tag === 'hashfront-actions');
  if (!c) { console.error('hashfront-actions contract not found'); process.exit(1); }
  console.log(c.address);
")

echo "World address:   $WORLD_ADDRESS"
echo "Actions address: $ACTIONS_ADDRESS"

# --- Update client/src/dojo/config.ts ---
CONFIG="$ROOT/client/src/dojo/config.ts"
if [ -f "$CONFIG" ]; then
  sed -i -E '/export const WORLD_ADDRESS =/{n;s/"0x[0-9a-fA-F]+"/"'"$WORLD_ADDRESS"'"/;}' "$CONFIG"
  sed -i -E '/export const ACTIONS_ADDRESS =/{n;s/"0x[0-9a-fA-F]+"/"'"$ACTIONS_ADDRESS"'"/;}' "$CONFIG"
  echo "✔ Updated $CONFIG"
else
  echo "WARN: $CONFIG not found, skipping" >&2
fi

# --- Update contracts/torii_sepolia.toml ---
TORII="$ROOT/contracts/torii_sepolia.toml"
if [ -f "$TORII" ]; then
  sed -i -E \
    's|(world_address = )"0x[0-9a-fA-F]+"|\1"'"$WORLD_ADDRESS"'"|' \
    "$TORII"
  echo "✔ Updated $TORII"
else
  echo "WARN: $TORII not found, skipping" >&2
fi

echo "Done."
