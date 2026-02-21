import { create } from "zustand";

// --- Teams ---
export type TeamId = "blue" | "red" | "green" | "yellow";

export const TEAMS: Record<number, TeamId> = {
  1: "blue",
  2: "red",
  3: "green",
  4: "yellow",
};

export const UNIT_TYPES: Record<string, string> = {
  Infantry: "rifle",
  Tank: "tank",
  Ranger: "artillery",
};

// --- Units ---
export interface Unit {
  id: number;
  onchainId: number;
  type: string;
  team: TeamId;
  x: number;
  y: number;
  facing: "left" | "right" | "up" | "down";
  animation:
    | "idle"
    | "walk_side"
    | "walk_down"
    | "walk_up"
    | "attack"
    | "hit"
    | "death";
}

// --- Game info ---
export interface GameInfo {
  currentPlayer: number;
  round: number;
  winner: number;
  state: string;
  name: string;
  mapId: number;
  width: number;
  height: number;
  isTestMode: boolean;
}

// --- Player state ---
export interface GamePlayerState {
  playerId: number;
  address: string;
  gold: number;
  unitCount: number;
  factoryCount: number;
  cityCount: number;
  isAlive: boolean;
}

// --- Store ---
interface GameStore {
  tileMap: Uint8Array;
  setTileMap: (map: Uint8Array) => void;

  units: Unit[];
  nextId: number;
  addUnit: (
    type: string,
    team: TeamId,
    x: number,
    y: number,
    onchainId: number,
  ) => Unit;
  updateUnit: (
    onchainId: number,
    updates: Partial<Pick<Unit, "x" | "y" | "type" | "team">>,
  ) => void;
  removeUnit: (onchainId: number) => void;
  setUnits: (units: Unit[]) => void;
  clearUnits: () => void;

  game: GameInfo | null;
  setGame: (game: GameInfo | null) => void;

  players: GamePlayerState[];
  setPlayers: (players: GamePlayerState[]) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  tileMap: new Uint8Array(0),
  setTileMap: (map) => set({ tileMap: new Uint8Array(map) }),

  units: [],
  nextId: 1,
  addUnit: (type, team, x, y, onchainId) => {
    const { nextId, units } = get();
    const unit: Unit = {
      id: nextId,
      onchainId,
      type,
      team,
      x,
      y,
      facing: team === "red" ? "left" : "right",
      animation: "idle",
    };
    set({ units: [...units, unit], nextId: nextId + 1 });
    return unit;
  },
  updateUnit: (onchainId, updates) => {
    set((state) => ({
      units: state.units.map((u) =>
        u.onchainId === onchainId ? { ...u, ...updates } : u,
      ),
    }));
  },
  removeUnit: (onchainId) => {
    set((state) => ({
      units: state.units.filter((u) => u.onchainId !== onchainId),
    }));
  },
  setUnits: (units) => {
    const maxId = units.reduce((max, u) => Math.max(max, u.id), 0);
    set({ units, nextId: maxId + 1 });
  },
  clearUnits: () => set({ units: [], nextId: 1 }),

  game: null,
  setGame: (game) => set({ game }),

  players: [],
  setPlayers: (players) => set({ players }),
}));
