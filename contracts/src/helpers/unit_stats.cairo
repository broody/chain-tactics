use chain_tactics::types::{TileType, UnitType};

pub fn max_hp(unit_type: UnitType) -> u8 {
    match unit_type {
        UnitType::None => 0,
        UnitType::Infantry => 3,
        UnitType::Tank => 5,
        UnitType::Ranger => 2,
    }
}

pub fn attack_power(unit_type: UnitType) -> u8 {
    match unit_type {
        UnitType::None => 0,
        UnitType::Infantry => 2,
        UnitType::Tank => 4,
        UnitType::Ranger => 3,
    }
}

pub fn move_range(unit_type: UnitType) -> u8 {
    match unit_type {
        UnitType::None => 0,
        UnitType::Infantry => 3,
        UnitType::Tank => 2,
        UnitType::Ranger => 2,
    }
}

pub fn min_attack_range(unit_type: UnitType) -> u8 {
    match unit_type {
        UnitType::None => 0,
        UnitType::Infantry => 1,
        UnitType::Tank => 1,
        UnitType::Ranger => 2,
    }
}

pub fn max_attack_range(unit_type: UnitType) -> u8 {
    match unit_type {
        UnitType::None => 0,
        UnitType::Infantry => 1,
        UnitType::Tank => 1,
        UnitType::Ranger => 3,
    }
}

pub fn cost(unit_type: UnitType) -> u8 {
    match unit_type {
        UnitType::None => 0,
        UnitType::Infantry => 1,
        UnitType::Tank => 3,
        UnitType::Ranger => 2,
    }
}

pub fn move_cost(tile_type: TileType) -> u8 {
    match tile_type {
        TileType::Grass => 1,
        TileType::Mountain => 2,
        TileType::City => 1,
        TileType::Factory => 1,
        TileType::HQ => 1,
        TileType::Road => 1,
        TileType::Tree => 1,
        TileType::DirtRoad => 1,
    }
}

pub fn defense_bonus(tile_type: TileType) -> u8 {
    match tile_type {
        TileType::Grass => 0,
        TileType::Mountain => 2,
        TileType::City => 1,
        TileType::Factory => 1,
        TileType::HQ => 2,
        TileType::Road => 0,
        TileType::Tree => 1,
        TileType::DirtRoad => 0,
    }
}

pub fn can_traverse(unit_type: UnitType, tile_type: TileType) -> bool {
    match tile_type {
        TileType::Mountain => unit_type == UnitType::Infantry,
        _ => true,
    }
}
