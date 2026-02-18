use chain_tactics::types::{UnitType, Vec2};

#[starknet::interface]
trait IActions<T> {
    fn register_map(ref self: T, player_count: u8, tiles: Array<u8>) -> u8;
    fn create_game(ref self: T, map_id: u8) -> u32;
    fn join_game(ref self: T, game_id: u32);
    fn move_unit(ref self: T, game_id: u32, unit_id: u8, path: Array<Vec2>);
    fn attack(ref self: T, game_id: u32, unit_id: u8, target_id: u8);
    fn capture(ref self: T, game_id: u32, unit_id: u8);
    fn wait_unit(ref self: T, game_id: u32, unit_id: u8);
    fn build_unit(ref self: T, game_id: u32, factory_x: u8, factory_y: u8, unit_type: UnitType);
    fn end_turn(ref self: T, game_id: u32);
}

#[dojo::contract]
pub mod actions {
    use chain_tactics::consts::{
        CAPTURE_THRESHOLD, GRID_SIZE, INCOME_PER_CITY, MAX_ROUNDS, STARTING_GOLD,
    };
    use chain_tactics::events::{
        BuildingCaptured, GameCreated, GameOver, GameStarted, PlayerJoined, TurnEnded, UnitAttacked,
        UnitBuilt, UnitDied, UnitMoved,
    };
    use chain_tactics::helpers::{combat, map as map_helpers, unit_stats};
    use chain_tactics::models::building::Building;
    use chain_tactics::models::game::{Game, GameCounter};
    use chain_tactics::models::map::{MapInfo, MapTile};
    use chain_tactics::models::player::PlayerState;
    use chain_tactics::models::tile::Tile;
    use chain_tactics::models::unit::Unit;
    use chain_tactics::types::{BuildingType, GameState, TileType, UnitType, Vec2};
    use dojo::event::EventStorage;
    use dojo::model::ModelStorage;
    use starknet::{ContractAddress, get_caller_address};
    use super::IActions;

    #[abi(embed_v0)]
    impl ActionsImpl of IActions<ContractState> {
        fn register_map(ref self: ContractState, player_count: u8, tiles: Array<u8>) -> u8 {
            assert(player_count >= 2 && player_count <= 4, 'Invalid player count');

            let width: u8 = GRID_SIZE;
            let height: u8 = GRID_SIZE;
            let expected: u32 = width.into() * height.into();
            assert(tiles.len() == expected, 'Tiles length mismatch');

            let mut world = self.world_default();

            let mut counter: GameCounter = world.read_model(1_u32);
            let map_id: u8 = (counter.count + 1).try_into().unwrap();
            counter.count += 1;
            world.write_model(@counter);

            world
                .write_model(
                    @MapInfo {
                        map_id,
                        player_count,
                        width,
                        height,
                        tile_count: expected.try_into().unwrap(),
                    },
                );

            let mut i: u32 = 0;
            let tile_span = tiles.span();
            while i < expected {
                let tile_type = u8_to_tile_type(*tile_span.at(i));
                world.write_model(@MapTile { map_id, index: i.try_into().unwrap(), tile_type });
                i += 1;
            }

            map_id
        }

        fn create_game(ref self: ContractState, map_id: u8) -> u32 {
            let mut world = self.world_default();
            let caller = get_caller_address();

            let map_info: MapInfo = world.read_model(map_id);
            assert(map_info.tile_count > 0, 'Map not registered');

            let mut counter: GameCounter = world.read_model(0_u32);
            counter.count += 1;
            let game_id = counter.count;
            world.write_model(@counter);

            world
                .write_model(
                    @Game {
                        game_id,
                        map_id,
                        state: GameState::Lobby,
                        player_count: map_info.player_count,
                        num_players: 1,
                        current_player: 1,
                        round: 1,
                        next_unit_id: 0,
                        winner: 0,
                    },
                );

            let width = map_info.width;
            let mut i: u16 = 0;
            while i < map_info.tile_count {
                let map_tile: MapTile = world.read_model((map_id, i));
                let (x, y) = map_helpers::index_to_xy(i, width);

                world.write_model(@Tile { game_id, x, y, tile_type: map_tile.tile_type });

                let building_type = tile_to_building(map_tile.tile_type);
                if building_type != BuildingType::None {
                    world
                        .write_model(
                            @Building {
                                game_id,
                                x,
                                y,
                                building_type,
                                owner: 0,
                                capture_player: 0,
                                capture_progress: 0,
                                queued_unit: 0,
                            },
                        );
                }

                i += 1;
            }

            world
                .write_model(
                    @PlayerState {
                        game_id,
                        player_id: 1,
                        address: caller,
                        gold: STARTING_GOLD,
                        unit_count: 0,
                        factory_count: 0,
                        city_count: 0,
                        is_alive: true,
                    },
                );

            world.emit_event(@GameCreated { game_id, map_id, player_count: map_info.player_count });

            game_id
        }

        fn join_game(ref self: ContractState, game_id: u32) {
            let mut world = self.world_default();
            let caller = get_caller_address();

            let mut game: Game = world.read_model(game_id);
            assert(game.state == GameState::Lobby, 'Game not in lobby');
            assert(game.num_players < game.player_count, 'Game is full');

            let mut i: u8 = 1;
            while i <= game.num_players {
                let ps: PlayerState = world.read_model((game_id, i));
                assert(ps.address != caller, 'Already joined');
                i += 1;
            }

            game.num_players += 1;
            let player_id = game.num_players;

            world
                .write_model(
                    @PlayerState {
                        game_id,
                        player_id,
                        address: caller,
                        gold: STARTING_GOLD,
                        unit_count: 0,
                        factory_count: 0,
                        city_count: 0,
                        is_alive: true,
                    },
                );

            world.emit_event(@PlayerJoined { game_id, player_id });

            if game.num_players == game.player_count {
                game.state = GameState::Playing;
                self.spawn_starting_units(game_id, game.player_count, ref game);
                self.count_player_buildings(game_id, game.player_count);
                self.run_income(game_id, 1);
                self.run_production(game_id, 1, ref game);
                world = self.world_default();
                world.emit_event(@GameStarted { game_id, player_count: game.player_count });
            }

            world.write_model(@game);
        }

        fn move_unit(ref self: ContractState, game_id: u32, unit_id: u8, path: Array<Vec2>) {
            let mut world = self.world_default();
            let caller = get_caller_address();

            let game: Game = world.read_model(game_id);
            assert(game.state == GameState::Playing, 'Game not playing');

            let caller_player = self.get_player_id(game_id, caller, game.player_count);
            assert(caller_player == game.current_player, 'Not your turn');

            let mut unit: Unit = world.read_model((game_id, unit_id));
            assert(unit.is_alive, 'Unit is dead');
            assert(unit.player_id == caller_player, 'Not your unit');
            assert(!unit.has_moved, 'Already moved');

            let path_span = path.span();
            assert(path_span.len() > 0, 'Empty path');

            let first = *path_span.at(0);
            assert(is_adjacent(unit.x, unit.y, first.x, first.y), 'Path not adjacent to unit');

            let max_move: u8 = unit_stats::move_range(unit.unit_type);
            let mut total_cost: u8 = 0;
            let mut prev_x = unit.x;
            let mut prev_y = unit.y;
            let mut i: u32 = 0;

            while i < path_span.len() {
                let step = *path_span.at(i);
                assert(step.x < GRID_SIZE && step.y < GRID_SIZE, 'Out of bounds');
                assert(is_adjacent(prev_x, prev_y, step.x, step.y), 'Steps not adjacent');

                let tile: Tile = world.read_model((game_id, step.x, step.y));
                assert(unit_stats::can_traverse(unit.unit_type, tile.tile_type), 'Cannot traverse');

                total_cost += unit_stats::move_cost(tile.tile_type);
                assert(total_cost <= max_move, 'Exceeds movement range');

                if i + 1 < path_span.len() {
                    assert(
                        !self.has_unit_at(game_id, step.x, step.y, game.next_unit_id),
                        'Path blocked',
                    );
                }

                prev_x = step.x;
                prev_y = step.y;
                i += 1;
            }

            let dest = *path_span.at(path_span.len() - 1);
            assert(
                !self.has_unit_at(game_id, dest.x, dest.y, game.next_unit_id),
                'Destination occupied',
            );

            unit.x = dest.x;
            unit.y = dest.y;
            unit.has_moved = true;
            world.write_model(@unit);

            world.emit_event(@UnitMoved { game_id, unit_id, x: dest.x, y: dest.y });
        }

        fn attack(ref self: ContractState, game_id: u32, unit_id: u8, target_id: u8) {
            let mut world = self.world_default();
            let caller = get_caller_address();

            let mut game: Game = world.read_model(game_id);
            assert(game.state == GameState::Playing, 'Game not playing');

            let caller_player = self.get_player_id(game_id, caller, game.player_count);
            assert(caller_player == game.current_player, 'Not your turn');

            let mut attacker: Unit = world.read_model((game_id, unit_id));
            assert(attacker.is_alive, 'Attacker is dead');
            assert(attacker.player_id == caller_player, 'Not your unit');
            assert(!attacker.has_acted, 'Already acted');

            let mut defender: Unit = world.read_model((game_id, target_id));
            assert(defender.is_alive, 'Target is dead');
            assert(defender.player_id != caller_player, 'Cannot attack own unit');

            let distance = manhattan_distance(attacker.x, attacker.y, defender.x, defender.y);
            let min_range = unit_stats::min_attack_range(attacker.unit_type);
            let max_range = unit_stats::max_attack_range(attacker.unit_type);
            assert(distance >= min_range && distance <= max_range, 'Out of attack range');

            let defender_tile: Tile = world.read_model((game_id, defender.x, defender.y));
            let (dmg_to_def, dmg_to_atk) = combat::resolve_combat(
                attacker.unit_type,
                attacker.hp,
                defender.unit_type,
                defender.hp,
                defender_tile.tile_type,
                distance,
            );

            if dmg_to_def >= defender.hp {
                defender.hp = 0;
                defender.is_alive = false;
                world.write_model(@defender);
                world.emit_event(@UnitDied { game_id, unit_id: target_id });

                let mut def_player: PlayerState = world.read_model((game_id, defender.player_id));
                def_player.unit_count -= 1;
                world.write_model(@def_player);

                self.check_elimination(game_id, defender.player_id, ref game);
                world = self.world_default();
            } else {
                defender.hp -= dmg_to_def;
                world.write_model(@defender);
            }

            if dmg_to_atk > 0 {
                if dmg_to_atk >= attacker.hp {
                    attacker.hp = 0;
                    attacker.is_alive = false;
                    world.write_model(@attacker);
                    world.emit_event(@UnitDied { game_id, unit_id });

                    let mut atk_player: PlayerState = world.read_model((game_id, caller_player));
                    atk_player.unit_count -= 1;
                    world.write_model(@atk_player);
                } else {
                    attacker.hp -= dmg_to_atk;
                    attacker.has_acted = true;
                    world.write_model(@attacker);
                }
            } else {
                attacker.has_acted = true;
                world.write_model(@attacker);
            }

            world
                .emit_event(
                    @UnitAttacked {
                        game_id,
                        attacker_id: unit_id,
                        target_id,
                        damage_to_defender: dmg_to_def,
                        damage_to_attacker: dmg_to_atk,
                    },
                );
            world.write_model(@game);
        }

        fn capture(ref self: ContractState, game_id: u32, unit_id: u8) {
            let mut world = self.world_default();
            let caller = get_caller_address();

            let mut game: Game = world.read_model(game_id);
            assert(game.state == GameState::Playing, 'Game not playing');

            let caller_player = self.get_player_id(game_id, caller, game.player_count);
            assert(caller_player == game.current_player, 'Not your turn');

            let mut unit: Unit = world.read_model((game_id, unit_id));
            assert(unit.is_alive, 'Unit is dead');
            assert(unit.player_id == caller_player, 'Not your unit');
            assert(unit.unit_type == UnitType::Infantry, 'Only infantry captures');
            assert(!unit.has_acted, 'Already acted');

            let mut building: Building = world.read_model((game_id, unit.x, unit.y));
            assert(building.building_type != BuildingType::None, 'No building here');
            assert(building.owner != caller_player, 'Already own building');

            if building.capture_player != caller_player {
                building.capture_player = caller_player;
                building.capture_progress = 1;
            } else {
                building.capture_progress += 1;
            }

            if building.capture_progress >= CAPTURE_THRESHOLD {
                let old_owner = building.owner;

                if old_owner != 0 {
                    let mut old_ps: PlayerState = world.read_model((game_id, old_owner));
                    if building.building_type == BuildingType::Factory {
                        old_ps.factory_count -= 1;
                    } else if building.building_type == BuildingType::City {
                        old_ps.city_count -= 1;
                    }
                    world.write_model(@old_ps);
                }

                building.owner = caller_player;
                building.capture_player = 0;
                building.capture_progress = 0;

                let mut new_ps: PlayerState = world.read_model((game_id, caller_player));
                if building.building_type == BuildingType::Factory {
                    new_ps.factory_count += 1;
                } else if building.building_type == BuildingType::City {
                    new_ps.city_count += 1;
                }
                world.write_model(@new_ps);

                world
                    .emit_event(
                        @BuildingCaptured {
                            game_id, x: unit.x, y: unit.y, player_id: caller_player,
                        },
                    );

                if building.building_type == BuildingType::HQ {
                    game.state = GameState::Finished;
                    game.winner = caller_player;
                    world.write_model(@game);
                    world.emit_event(@GameOver { game_id, winner: caller_player });
                }

                if old_owner != 0 {
                    self.check_elimination(game_id, old_owner, ref game);
                    world = self.world_default();
                }
            }

            world.write_model(@building);
            unit.has_acted = true;
            world.write_model(@unit);
            world.write_model(@game);
        }

        fn wait_unit(ref self: ContractState, game_id: u32, unit_id: u8) {
            let mut world = self.world_default();
            let caller = get_caller_address();

            let game: Game = world.read_model(game_id);
            assert(game.state == GameState::Playing, 'Game not playing');

            let caller_player = self.get_player_id(game_id, caller, game.player_count);
            assert(caller_player == game.current_player, 'Not your turn');

            let mut unit: Unit = world.read_model((game_id, unit_id));
            assert(unit.is_alive, 'Unit is dead');
            assert(unit.player_id == caller_player, 'Not your unit');

            unit.has_moved = true;
            unit.has_acted = true;
            world.write_model(@unit);
        }

        fn build_unit(
            ref self: ContractState,
            game_id: u32,
            factory_x: u8,
            factory_y: u8,
            unit_type: UnitType,
        ) {
            let mut world = self.world_default();
            let caller = get_caller_address();

            let game: Game = world.read_model(game_id);
            assert(game.state == GameState::Playing, 'Game not playing');

            let caller_player = self.get_player_id(game_id, caller, game.player_count);
            assert(caller_player == game.current_player, 'Not your turn');

            assert(unit_type != UnitType::None, 'Invalid unit type');

            let mut building: Building = world.read_model((game_id, factory_x, factory_y));
            assert(building.building_type == BuildingType::Factory, 'Not a factory');
            assert(building.owner == caller_player, 'Not your factory');
            assert(building.queued_unit == 0, 'Factory already queued');

            let unit_cost = unit_stats::cost(unit_type);
            let mut player: PlayerState = world.read_model((game_id, caller_player));
            assert(player.gold >= unit_cost, 'Not enough gold');

            player.gold -= unit_cost;
            world.write_model(@player);

            let queued: u8 = match unit_type {
                UnitType::None => 0,
                UnitType::Infantry => 1,
                UnitType::Tank => 2,
                UnitType::Ranger => 3,
            };
            building.queued_unit = queued;
            world.write_model(@building);

            world.emit_event(@UnitBuilt { game_id, unit_type, x: factory_x, y: factory_y });
        }

        fn end_turn(ref self: ContractState, game_id: u32) {
            let mut world = self.world_default();
            let caller = get_caller_address();

            let mut game: Game = world.read_model(game_id);
            assert(game.state == GameState::Playing, 'Game not playing');

            let caller_player = self.get_player_id(game_id, caller, game.player_count);
            assert(caller_player == game.current_player, 'Not your turn');

            self.reset_stale_captures(game_id, caller_player);
            self.reset_unit_flags(game_id, caller_player, game.next_unit_id);

            let mut next = game.current_player;
            let mut new_round = game.round;
            let mut found = false;
            let mut attempts: u8 = 0;

            while attempts < game.player_count && !found {
                next = if next == game.player_count {
                    1
                } else {
                    next + 1
                };
                if next == 1 {
                    new_round += 1;
                }
                let ps: PlayerState = world.read_model((game_id, next));
                if ps.is_alive {
                    found = true;
                }
                attempts += 1;
            }

            assert(found, 'No alive players');

            if new_round > MAX_ROUNDS {
                game.state = GameState::Finished;
                game.winner = self.timeout_winner(game_id, game.player_count);
                world = self.world_default();
                world.write_model(@game);
                world.emit_event(@GameOver { game_id, winner: game.winner });
                return;
            }

            game.current_player = next;
            game.round = new_round;

            self.run_income(game_id, next);
            self.run_production(game_id, next, ref game);

            world = self.world_default();
            world.write_model(@game);
            world.emit_event(@TurnEnded { game_id, next_player: next, round: new_round });
        }
    }

    // ───────────────────── Pure helpers (module-level)
    // ─────────────────────

    fn u8_to_tile_type(val: u8) -> TileType {
        if val == 0 {
            TileType::Grass
        } else if val == 1 {
            TileType::Mountain
        } else if val == 2 {
            TileType::City
        } else if val == 3 {
            TileType::Factory
        } else if val == 4 {
            TileType::HQ
        } else if val == 5 {
            TileType::Road
        } else if val == 6 {
            TileType::Tree
        } else if val == 7 {
            TileType::DirtRoad
        } else {
            panic!("Invalid tile type")
        }
    }

    fn tile_to_building(tile_type: TileType) -> BuildingType {
        match tile_type {
            TileType::City => BuildingType::City,
            TileType::Factory => BuildingType::Factory,
            TileType::HQ => BuildingType::HQ,
            _ => BuildingType::None,
        }
    }

    fn u8_to_unit_type(val: u8) -> UnitType {
        if val == 0 {
            UnitType::None
        } else if val == 1 {
            UnitType::Infantry
        } else if val == 2 {
            UnitType::Tank
        } else if val == 3 {
            UnitType::Ranger
        } else {
            panic!("Invalid unit type")
        }
    }

    fn is_adjacent(x1: u8, y1: u8, x2: u8, y2: u8) -> bool {
        let dx = if x1 > x2 {
            x1 - x2
        } else {
            x2 - x1
        };
        let dy = if y1 > y2 {
            y1 - y2
        } else {
            y2 - y1
        };
        (dx + dy) == 1
    }

    fn manhattan_distance(x1: u8, y1: u8, x2: u8, y2: u8) -> u8 {
        let dx = if x1 > x2 {
            x1 - x2
        } else {
            x2 - x1
        };
        let dy = if y1 > y2 {
            y1 - y2
        } else {
            y2 - y1
        };
        dx + dy
    }

    // ───────────────────── Internal helpers (self
    // access) ─────────────────────

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn world_default(self: @ContractState) -> dojo::world::WorldStorage {
            self.world(@"chain_tactics")
        }

        fn get_player_id(
            self: @ContractState, game_id: u32, address: ContractAddress, player_count: u8,
        ) -> u8 {
            let mut world = self.world_default();
            let mut i: u8 = 1;
            let mut found: u8 = 0;
            while i <= player_count {
                let ps: PlayerState = world.read_model((game_id, i));
                if ps.address == address {
                    found = i;
                    break;
                }
                i += 1;
            }
            assert(found > 0, 'Not in this game');
            found
        }

        fn has_unit_at(self: @ContractState, game_id: u32, x: u8, y: u8, next_unit_id: u8) -> bool {
            let mut world = self.world_default();
            let mut i: u8 = 1;
            let mut found = false;
            while i <= next_unit_id && !found {
                let u: Unit = world.read_model((game_id, i));
                if u.is_alive && u.x == x && u.y == y {
                    found = true;
                }
                i += 1;
            }
            found
        }

        fn spawn_starting_units(
            self: @ContractState, game_id: u32, player_count: u8, ref game: Game,
        ) {
            let mut world = self.world_default();
            let mut hq_index: u8 = 0;
            let grid: u8 = GRID_SIZE;

            let mut y: u8 = 0;
            while y < grid {
                let mut x: u8 = 0;
                while x < grid {
                    let building: Building = world.read_model((game_id, x, y));
                    if building.building_type == BuildingType::HQ && building.owner == 0 {
                        hq_index += 1;
                        if hq_index <= player_count {
                            let mut b = building;
                            b.owner = hq_index;
                            world.write_model(@b);

                            let spawn_pos = self
                                .find_spawn_adjacent(game_id, x, y, game.next_unit_id);
                            game.next_unit_id += 1;
                            let unit_id = game.next_unit_id;

                            world
                                .write_model(
                                    @Unit {
                                        game_id,
                                        unit_id,
                                        player_id: hq_index,
                                        unit_type: UnitType::Infantry,
                                        x: spawn_pos.x,
                                        y: spawn_pos.y,
                                        hp: unit_stats::max_hp(UnitType::Infantry),
                                        has_moved: false,
                                        has_acted: false,
                                        is_alive: true,
                                    },
                                );

                            let mut ps: PlayerState = world.read_model((game_id, hq_index));
                            ps.unit_count += 1;
                            world.write_model(@ps);
                        }
                    }
                    x += 1;
                }
                y += 1;
            };
        }

        fn find_spawn_adjacent(
            self: @ContractState, game_id: u32, x: u8, y: u8, next_unit_id: u8,
        ) -> Vec2 {
            let grid: u8 = GRID_SIZE;
            if x + 1 < grid && !self.has_unit_at(game_id, x + 1, y, next_unit_id) {
                return Vec2 { x: x + 1, y };
            }
            if y + 1 < grid && !self.has_unit_at(game_id, x, y + 1, next_unit_id) {
                return Vec2 { x, y: y + 1 };
            }
            if x > 0 && !self.has_unit_at(game_id, x - 1, y, next_unit_id) {
                return Vec2 { x: x - 1, y };
            }
            if y > 0 && !self.has_unit_at(game_id, x, y - 1, next_unit_id) {
                return Vec2 { x, y: y - 1 };
            }
            panic!("No spawn position")
        }

        fn count_player_buildings(self: @ContractState, game_id: u32, player_count: u8) {
            let mut world = self.world_default();
            let grid: u8 = GRID_SIZE;
            let mut y: u8 = 0;
            while y < grid {
                let mut x: u8 = 0;
                while x < grid {
                    let building: Building = world.read_model((game_id, x, y));
                    if building.owner != 0 {
                        let mut ps: PlayerState = world.read_model((game_id, building.owner));
                        if building.building_type == BuildingType::Factory {
                            ps.factory_count += 1;
                        } else if building.building_type == BuildingType::City {
                            ps.city_count += 1;
                        }
                        world.write_model(@ps);
                    }
                    x += 1;
                }
                y += 1;
            };
        }

        fn run_income(self: @ContractState, game_id: u32, player_id: u8) {
            let mut world = self.world_default();
            let mut ps: PlayerState = world.read_model((game_id, player_id));
            let income = ps.city_count * INCOME_PER_CITY;
            ps.gold += income;
            world.write_model(@ps);
        }

        fn run_production(self: @ContractState, game_id: u32, player_id: u8, ref game: Game) {
            let mut world = self.world_default();
            let grid: u8 = GRID_SIZE;
            let mut y: u8 = 0;
            while y < grid {
                let mut x: u8 = 0;
                while x < grid {
                    let mut building: Building = world.read_model((game_id, x, y));
                    if building.building_type == BuildingType::Factory
                        && building.owner == player_id
                        && building.queued_unit != 0 {
                        if !self.has_unit_at(game_id, x, y, game.next_unit_id) {
                            let ut = u8_to_unit_type(building.queued_unit);
                            game.next_unit_id += 1;
                            let uid = game.next_unit_id;

                            world
                                .write_model(
                                    @Unit {
                                        game_id,
                                        unit_id: uid,
                                        player_id,
                                        unit_type: ut,
                                        x,
                                        y,
                                        hp: unit_stats::max_hp(ut),
                                        has_moved: true,
                                        has_acted: true,
                                        is_alive: true,
                                    },
                                );

                            let mut ps: PlayerState = world.read_model((game_id, player_id));
                            ps.unit_count += 1;
                            world.write_model(@ps);

                            building.queued_unit = 0;
                            world.write_model(@building);
                        }
                    }
                    x += 1;
                }
                y += 1;
            };
        }

        fn reset_unit_flags(self: @ContractState, game_id: u32, player_id: u8, next_unit_id: u8) {
            let mut world = self.world_default();
            let mut i: u8 = 1;
            while i <= next_unit_id {
                let mut u: Unit = world.read_model((game_id, i));
                if u.is_alive && u.player_id == player_id {
                    u.has_moved = false;
                    u.has_acted = false;
                    world.write_model(@u);
                }
                i += 1;
            };
        }

        fn reset_stale_captures(self: @ContractState, game_id: u32, player_id: u8) {
            let mut world = self.world_default();
            let grid: u8 = GRID_SIZE;
            let mut y: u8 = 0;
            while y < grid {
                let mut x: u8 = 0;
                while x < grid {
                    let mut building: Building = world.read_model((game_id, x, y));
                    if building.capture_player == player_id && building.capture_progress > 0 {
                        let has_infantry = self.has_infantry_at(game_id, x, y, player_id);
                        if !has_infantry {
                            building.capture_player = 0;
                            building.capture_progress = 0;
                            world.write_model(@building);
                        }
                    }
                    x += 1;
                }
                y += 1;
            };
        }

        fn has_infantry_at(
            self: @ContractState, game_id: u32, x: u8, y: u8, player_id: u8,
        ) -> bool {
            let mut world = self.world_default();
            let mut i: u8 = 1;
            let mut found = false;
            while i < 255 && !found {
                let u: Unit = world.read_model((game_id, i));
                if u.unit_type == UnitType::None && u.hp == 0 && !u.is_alive {
                    break;
                }
                if u.is_alive
                    && u.player_id == player_id
                    && u.unit_type == UnitType::Infantry
                    && u.x == x
                    && u.y == y {
                    found = true;
                }
                i += 1;
            }
            found
        }

        fn check_elimination(self: @ContractState, game_id: u32, player_id: u8, ref game: Game) {
            let mut world = self.world_default();
            let ps: PlayerState = world.read_model((game_id, player_id));
            if !ps.is_alive {
                return;
            }

            let grid: u8 = GRID_SIZE;
            let mut y: u8 = 0;
            let mut has_hq = false;
            while y < grid {
                let mut x: u8 = 0;
                while x < grid {
                    let building: Building = world.read_model((game_id, x, y));
                    if building.building_type == BuildingType::HQ && building.owner == player_id {
                        has_hq = true;
                    }
                    x += 1;
                }
                y += 1;
            }

            let eliminated = !has_hq
                || (ps.unit_count == 0 && ps.factory_count == 0 && ps.gold == 0);

            if eliminated {
                let mut ps_mut: PlayerState = world.read_model((game_id, player_id));
                ps_mut.is_alive = false;
                world.write_model(@ps_mut);

                let mut alive_count: u8 = 0;
                let mut last_alive: u8 = 0;
                let mut p: u8 = 1;
                while p <= game.player_count {
                    let pstate: PlayerState = world.read_model((game_id, p));
                    if pstate.is_alive {
                        alive_count += 1;
                        last_alive = p;
                    }
                    p += 1;
                }

                if alive_count == 1 {
                    game.state = GameState::Finished;
                    game.winner = last_alive;
                    world.write_model(@game);
                    world.emit_event(@GameOver { game_id, winner: last_alive });
                }
            }
        }

        fn timeout_winner(self: @ContractState, game_id: u32, player_count: u8) -> u8 {
            let mut world = self.world_default();
            let mut best_player: u8 = 0;
            let mut best_score: u16 = 0;
            let mut p: u8 = 1;
            while p <= player_count {
                let ps: PlayerState = world.read_model((game_id, p));
                if ps.is_alive {
                    let mut total_hp: u16 = 0;
                    let mut i: u8 = 1;
                    while i < 255 {
                        let u: Unit = world.read_model((game_id, i));
                        if u.unit_type == UnitType::None && u.hp == 0 {
                            break;
                        }
                        if u.is_alive && u.player_id == p {
                            total_hp += u.hp.into();
                        }
                        i += 1;
                    }
                    let score: u16 = total_hp + ps.gold.into();
                    if score > best_score {
                        best_score = score;
                        best_player = p;
                    }
                }
                p += 1;
            }
            best_player
        }
    }
}
