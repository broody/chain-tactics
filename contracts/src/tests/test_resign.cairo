use dojo::model::ModelStorage;
use hashfront::models::game::Game;
use hashfront::models::player::PlayerState;
use hashfront::systems::actions::{IActionsDispatcher, IActionsDispatcherTrait};
use hashfront::types::GameState;
use starknet::ContractAddress;
use starknet::testing::{set_account_contract_address, set_contract_address};
use super::common::{
    PLAYER1, PLAYER2, build_test_buildings, build_test_tiles, build_test_units, setup,
};

fn PLAYER3() -> ContractAddress {
    'PLAYER3'.try_into().unwrap()
}

fn build_three_player_tiles() -> Array<u32> {
    let hq: u32 = 4; // TileType::HQ ordinal
    array![0 * 256 + hq, // (0,0)
    399 * 256 + hq, // (19,19)
    210 * 256 + hq // (10,10)
    ]
}

fn build_three_player_buildings() -> Array<u32> {
    let hq: u32 = 3; // BuildingType::HQ ordinal
    array![
        1 * 16777216 + hq * 65536 + 0 * 256 + 0, // P1 HQ @ (0,0)
        2 * 16777216 + hq * 65536 + 19 * 256 + 19, // P2 HQ @ (19,19)
        3 * 16777216 + hq * 65536 + 10 * 256 + 10 // P3 HQ @ (10,10)
    ]
}

fn build_three_player_units() -> Array<u32> {
    // One infantry per player.
    array![
        1 * 16777216 + 1 * 65536 + 1 * 256 + 0, // P1 Infantry
        2 * 16777216 + 1 * 65536 + 18 * 256 + 19, // P2 Infantry
        3 * 16777216 + 1 * 65536 + 10 * 256 + 11 // P3 Infantry
    ]
}

fn setup_two_player_game() -> (IActionsDispatcher, dojo::world::WorldStorage, u32) {
    let p1 = PLAYER1();
    set_contract_address(p1);
    set_account_contract_address(p1);

    let (actions_dispatcher, world) = setup();
    let map_id = actions_dispatcher
        .register_map(
            "test", 20, 20, build_test_tiles(), build_test_buildings(), build_test_units(),
        );
    let game_id = actions_dispatcher.create_game("test", map_id, 1, false);

    let p2 = PLAYER2();
    set_contract_address(p2);
    set_account_contract_address(p2);
    actions_dispatcher.join_game(game_id, 2);

    set_contract_address(p1);
    set_account_contract_address(p1);

    (actions_dispatcher, world, game_id)
}

fn setup_three_player_game() -> (IActionsDispatcher, dojo::world::WorldStorage, u32) {
    let p1 = PLAYER1();
    set_contract_address(p1);
    set_account_contract_address(p1);

    let (actions_dispatcher, world) = setup();
    let map_id = actions_dispatcher
        .register_map(
            "three",
            20,
            20,
            build_three_player_tiles(),
            build_three_player_buildings(),
            build_three_player_units(),
        );
    let game_id = actions_dispatcher.create_game("three", map_id, 1, false);

    let p2 = PLAYER2();
    set_contract_address(p2);
    set_account_contract_address(p2);
    actions_dispatcher.join_game(game_id, 2);

    let p3 = PLAYER3();
    set_contract_address(p3);
    set_account_contract_address(p3);
    actions_dispatcher.join_game(game_id, 3);

    set_contract_address(p1);
    set_account_contract_address(p1);

    (actions_dispatcher, world, game_id)
}

#[test]
#[available_gas(200000000)]
fn test_resign_finishes_two_player_game() {
    let (actions_dispatcher, mut world, game_id) = setup_two_player_game();

    actions_dispatcher.resign(game_id);

    let game: Game = world.read_model(game_id);
    assert(game.state == GameState::Finished, 'game should be finished');
    assert(game.winner == 2, 'P2 should win');

    let ps1: PlayerState = world.read_model((game_id, 1_u8));
    assert(!ps1.is_alive, 'P1 should be eliminated');
}

#[test]
#[available_gas(200000000)]
fn test_resign_non_current_player_keeps_turn() {
    let (actions_dispatcher, mut world, game_id) = setup_three_player_game();

    // P2 resigns while it is still P1's turn.
    let p2 = PLAYER2();
    set_contract_address(p2);
    set_account_contract_address(p2);
    actions_dispatcher.resign(game_id);

    let game: Game = world.read_model(game_id);
    assert(game.state == GameState::Playing, 'game should still be playing');
    assert(game.current_player == 1, 'turn should stay on P1');
    assert(game.round == 1, 'round should stay 1');

    let ps2: PlayerState = world.read_model((game_id, 2_u8));
    assert(!ps2.is_alive, 'P2 should be eliminated');
}

#[test]
#[available_gas(200000000)]
fn test_resign_current_player_advances_turn() {
    let (actions_dispatcher, mut world, game_id) = setup_three_player_game();

    // P1 resigns on their own turn.
    actions_dispatcher.resign(game_id);

    let game: Game = world.read_model(game_id);
    assert(game.state == GameState::Playing, 'game should still be playing');
    assert(game.current_player == 2, 'turn should advance to P2');
    assert(game.round == 1, 'round should stay 1');

    let ps1: PlayerState = world.read_model((game_id, 1_u8));
    assert(!ps1.is_alive, 'P1 should be eliminated');
}

#[test]
#[should_panic]
#[available_gas(200000000)]
fn test_resign_not_in_game() {
    let (actions_dispatcher, _, game_id) = setup_two_player_game();

    let outsider: ContractAddress = 'OUTSIDER'.try_into().unwrap();
    set_contract_address(outsider);
    set_account_contract_address(outsider);
    actions_dispatcher.resign(game_id);
}
