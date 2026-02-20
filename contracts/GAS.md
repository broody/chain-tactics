# Gas Optimization Report - Hashfront Contracts

This document details the gas savings achieved through the structural optimization of the Hashfront core contracts. The primary focus was the elimination of O(N) loops and redundant storage operations.

## Summary of Architectural Changes

### 1. O(1) Turn Resets
*   **Previous**: `end_turn` triggered a loop through all units in the game to reset boolean `has_moved` and `has_acted` flags.
*   **Optimized**: Replaced flags with `last_moved_round` and `last_acted_round` (`u8`). Units are considered "ready" if their last acted round is less than the current game round.
*   **Impact**: Removed an O(Units) loop from every `end_turn` call.

### 2. Static Terrain Optimization
*   **Previous**: `create_game` copied every tile from the map template into a per-game `Tile` model.
*   **Optimized**: All gameplay functions (`move_unit`, `attack`) now read terrain data directly from the static `MapTile` model.
*   **Impact**: Eliminated O(Tiles) storage writes during game creation.

### 3. Surgical Capture Resets
*   **Previous**: `end_turn` iterated through all buildings on the map to reset capture progress if no infantry was present.
*   **Optimized**: Moved reset logic to `move_unit`. Capture progress is now reset O(1) specifically when the capturing infantry unit moves away from the tile.
*   **Impact**: Removed an O(Buildings) loop from every `end_turn` call.

### 4. O(1) Elimination Checks
*   **Previous**: `check_elimination` iterated through all buildings to verify if a player still owned their HQ.
*   **Optimized**: Introduced the `PlayerHQ` model to store the coordinates of each player's HQ. Verification is now a single lookup.
*   **Impact**: Significant savings during combat and building capture.

## Gas Usage Comparison

Measured using `sozo test` estimates.

| Test Case | Original Gas | Optimized Gas | **Savings** | **% Saved** |
| :--- | :--- | :--- | :--- | :--- |
| `test_end_turn_resets_unit_flags` | 107,555,148 | 104,464,292 | **3,090,856** | **2.87%** |
| `test_end_turn_round_increments` | 100,513,460 | 97,394,345 | **3,119,115** | **3.10%** |
| `test_capture_enemy_building_updates_counts` | 90,993,848 | 89,757,358 | **1,236,490** | **1.36%** |
| `test_capture_hq_wins_game` | 92,064,028 | 90,827,538 | **1,236,490** | **1.34%** |
| `test_attack_kills_defender` | 94,551,970 | 93,315,480 | **1,236,490** | **1.31%** |
| `test_end_turn_runs_production` | 92,596,094 | 91,709,827 | **886,267** | **0.96%** |
| `test_end_turn_timeout` | 89,141,217 | 88,256,670 | **884,547** | **0.99%** |
| `test_end_turn_runs_income` | 87,655,575 | 86,769,568 | **886,007** | **1.01%** |
| `test_end_turn_switches_player` | 84,734,120 | 83,848,113 | **886,007** | **1.05%** |

## Scalability Notes

The optimizations provide more than just flat savings; they improve the **algorithmic complexity** of the contract:

*   **Turn Reset**: Cost is now constant relative to unit count.
*   **Elimination Check**: Cost is now constant relative to map size.
*   **Terrain**: Gameplay lookups are O(1) against static data, removing the gas "tax" of copying large maps.

These changes ensure the game remains affordable to play even on large maps with many units.
