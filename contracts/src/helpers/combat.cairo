use hashfront::helpers::unit_stats;
use hashfront::types::{TileType, UnitType};

/// Returns (damage_to_defender, damage_to_attacker).
/// Counterattack only happens if defender survives and attacker is within defender's range.
pub fn resolve_combat(
    attacker_type: UnitType,
    attacker_hp: u8,
    defender_type: UnitType,
    defender_hp: u8,
    defender_tile: TileType,
    distance: u8,
) -> (u8, u8) {
    // Calculate damage to defender
    let atk = unit_stats::attack_power(attacker_type);
    let def_bonus = unit_stats::defense_bonus(defender_tile);
    let damage_to_defender = if atk > def_bonus {
        atk - def_bonus
    } else {
        1_u8
    };

    // Check if defender survives
    let defender_survives = defender_hp > damage_to_defender;

    // Counterattack: defender must survive and attacker must be in defender's attack range
    let damage_to_attacker = if defender_survives {
        let def_min_range = unit_stats::min_attack_range(defender_type);
        let def_max_range = unit_stats::max_attack_range(defender_type);
        if distance >= def_min_range && distance <= def_max_range {
            let counter_atk = unit_stats::attack_power(defender_type);
            if counter_atk > 0 {
                // Counterattack does not get terrain defense (attacker is on their own tile)
                counter_atk
            } else {
                0_u8
            }
        } else {
            0_u8
        }
    } else {
        0_u8
    };

    (damage_to_defender, damage_to_attacker)
}
