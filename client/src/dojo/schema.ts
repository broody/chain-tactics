import type { SchemaType } from "@dojoengine/sdk";

export const schema = {
  hashfront: {
    Game: {
      game_id: 0,
      name: "",
      map_id: 0,
      state: "",
      player_count: 0,
      num_players: 0,
      current_player: 0,
      round: 0,
      next_unit_id: 0,
      winner: 0,
      width: 0,
      height: 0,
      is_test_mode: false,
    },
    Unit: {
      game_id: 0,
      unit_id: 0,
      player_id: 0,
      unit_type: "",
      x: 0,
      y: 0,
      hp: 0,
      last_moved_round: 0,
      last_acted_round: 0,
      is_alive: false,
    },
    Building: {
      game_id: 0,
      x: 0,
      y: 0,
      building_type: "",
      player_id: 0,
      capture_player: 0,
      capture_progress: 0,
      queued_unit: 0,
    },
    PlayerState: {
      game_id: 0,
      player_id: 0,
      address: "",
      gold: 0,
      unit_count: 0,
      factory_count: 0,
      city_count: 0,
      is_alive: false,
    },
    MapTile: {
      map_id: 0,
      x: 0,
      y: 0,
      tile_type: "",
      border_type: "",
    },
  },
} as const satisfies SchemaType;

export type Schema = typeof schema;
