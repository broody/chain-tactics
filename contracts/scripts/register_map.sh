#!/usr/bin/env bash
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $0 <map.txt>" >&2
  exit 1
fi

MAP_FILE="$1"

if [ ! -f "$MAP_FILE" ]; then
  echo "Error: file not found: $MAP_FILE" >&2
  exit 1
fi

# Read non-empty lines into array
mapfile -t ROWS < <(sed '/^[[:space:]]*$/d' "$MAP_FILE")

HEIGHT=${#ROWS[@]}
if [ "$HEIGHT" -eq 0 ]; then
  echo "Error: map file is empty" >&2
  exit 1
fi

WIDTH=${#ROWS[0]}

# Build tile values as comma-separated list
TILES=""
for (( y=0; y<HEIGHT; y++ )); do
  ROW="${ROWS[$y]}"
  if [ ${#ROW} -ne "$WIDTH" ]; then
    echo "Error: row $y has ${#ROW} chars, expected $WIDTH" >&2
    exit 1
  fi
  for (( x=0; x<WIDTH; x++ )); do
    CH="${ROW:$x:1}"
    case "$CH" in
      '.') V=0 ;;
      'M') V=1 ;;
      'C') V=2 ;;
      'F') V=3 ;;
      'H') V=4 ;;
      'R') V=5 ;;
      'T') V=6 ;;
      'D') V=7 ;;
      *) echo "Error: unknown tile char '$CH' at ($x,$y)" >&2; exit 1 ;;
    esac
    if [ -z "$TILES" ]; then
      TILES="$V"
    else
      TILES="$TILES $V"
    fi
  done
done

TILE_COUNT=$(( WIDTH * HEIGHT ))
sozo execute chain_tactics-actions register_map $WIDTH $HEIGHT $TILE_COUNT $TILES
