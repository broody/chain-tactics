#!/usr/bin/env bash
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $0 <map_id>" >&2
  exit 1
fi

MAP_ID="$1"

# Call the view function — output is hex values like 0x0x00...0a wrapped in [ ]
RAW=$(sozo call chain_tactics-actions get_map "$MAP_ID" 2>&1)

# Strip brackets, parse hex to decimal
VALUES=()
for token in $RAW; do
  # Skip brackets
  [[ "$token" == "[" || "$token" == "]" ]] && continue
  # Strip 0x0x prefix -> 0x, then convert hex to decimal
  HEX="${token/#0x0x/0x}"
  VALUES+=("$(( HEX ))")
done

if [ ${#VALUES[@]} -lt 3 ]; then
  echo "Error: unexpected response from contract" >&2
  echo "$RAW" >&2
  exit 1
fi

WIDTH=${VALUES[0]}
HEIGHT=${VALUES[1]}
TILE_COUNT=${VALUES[2]}
TILES=("${VALUES[@]:3}")

if [ ${#TILES[@]} -ne "$TILE_COUNT" ]; then
  echo "Error: expected $TILE_COUNT tiles, got ${#TILES[@]}" >&2
  exit 1
fi

LOOKUP=('.' 'M' 'C' 'F' 'H' 'R' 'T' 'D')

i=0
for (( y=0; y<HEIGHT; y++ )); do
  ROW=""
  for (( x=0; x<WIDTH; x++ )); do
    V=${TILES[$i]}
    ROW+="${LOOKUP[$V]}"
    (( i++ )) || true
  done
  echo "$ROW"
done
