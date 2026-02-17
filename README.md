# Chain Tactics

Simultaneous-turn tactics game on StarkNet. Two players command armies on a grid, submitting orders blind via commit-reveal. Orders resolve simultaneously each round — the core gameplay is predicting your opponent's moves, not reacting to them.

## How It Works

```
PLAN (5s)  →  COMMIT (5s)  →  REVEAL + RESOLVE (5s)
   ↑                                      |
   └──────────────────────────────────────┘
```

Both players plan moves, commit hashed orders on-chain, then reveal. No one sees the other's orders until both are locked in.

## Game

- **20x20 grid** with Grass, Mountains, Cities, Factories, Roads, and HQs
- **3 unit types** — Infantry, Tank, Ranger (rock-paper-scissors dynamics)
- **Economy** — Capture cities for income, build units at factories
- **Win** by capturing the enemy HQ or eliminating all their units

## Custom Maps

Maps are defined as ASCII grids in `src/game/maps/`. Each character is a tile:

```
.  Grass       M  Mountain     C  City
F  Factory     H  HQ           R  Road
```

Create a new map by adding a file to `src/game/maps/` and registering it in `index.ts`. See [default.ts](src/game/maps/default.ts) for an example.

## Stack

- **Chain**: StarkNet
- **Framework**: Dojo
- **Client**: React + PixiJS + Vite
- **Indexer**: Torii

## Development

```bash
pnpm install
pnpm dev
```

## License

MIT
