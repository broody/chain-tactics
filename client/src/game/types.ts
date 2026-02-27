export const TILE_PX = 32;

export const TileType = {
  Grass: 0,
  Mountain: 1,
  City: 2,
  Factory: 3,
  HQ: 4,
  Road: 5,
  Tree: 6,
  DirtRoad: 7,
  Ocean: 8,
  Barracks: 9,
} as const;

export type TileType = (typeof TileType)[keyof typeof TileType];

export const BorderType = {
  None: 0,
  Bluff: 1,
  Cliff: 2,
  Beach: 3,
} as const;

export type BorderType = (typeof BorderType)[keyof typeof BorderType];

export const TILE_COLORS: Record<TileType, number> = {
  [TileType.Grass]: 0x4a7c59,
  [TileType.Mountain]: 0x8b7355,
  [TileType.City]: 0x708090,
  [TileType.Factory]: 0x696969,
  [TileType.HQ]: 0xdaa520,
  [TileType.Road]: 0x9e9e9e,
  [TileType.Tree]: 0x2d5a1e,
  [TileType.DirtRoad]: 0x8b7355,
  [TileType.Barracks]: 0x556b2f,
  [TileType.Ocean]: 0x2389da,
};
