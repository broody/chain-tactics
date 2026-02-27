import { TileType } from "./types";

/**
 * ASCII map format:
 *   .  = Grass
 *   M  = Mountain
 *   C  = City
 *   F  = Factory
 *   H  = HQ
 *   R  = Road
 *
 * Each row is one line, characters map 1:1 to grid columns.
 * Dimensions are inferred from the input.
 */

const CHAR_TO_TILE: Record<string, TileType> = {
  ".": TileType.Grass,
  M: TileType.Mountain,
  C: TileType.City,
  F: TileType.Factory,
  H: TileType.HQ,
  R: TileType.Road,
  T: TileType.Tree,
  D: TileType.DirtRoad,
  B: TileType.Barracks,
  O: TileType.Ocean,
};

export function parseMap(ascii: string): {
  map: Uint8Array;
  width: number;
  height: number;
} {
  const rows = ascii
    .trim()
    .split("\n")
    .map((r) => r.trim());

  const height = rows.length;
  if (height === 0) {
    throw new Error("Map has no rows");
  }

  const width = rows[0].length;

  const map = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    if (rows[y].length !== width) {
      throw new Error(
        `Row ${y} must have ${width} chars, got ${rows[y].length}`,
      );
    }
    for (let x = 0; x < width; x++) {
      const ch = rows[y][x];
      const tile = CHAR_TO_TILE[ch];
      if (tile === undefined) {
        throw new Error(`Unknown tile char '${ch}' at (${x},${y})`);
      }
      map[y * width + x] = tile;
    }
  }

  return { map, width, height };
}

/** Get tile at (x,y) */
export function getTile(
  map: Uint8Array,
  x: number,
  y: number,
  gridWidth: number,
): TileType {
  return map[y * gridWidth + x] as TileType;
}
