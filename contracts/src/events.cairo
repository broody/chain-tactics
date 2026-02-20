use hashfront::types::UnitType;

#[derive(Introspect, Serde, Drop)]
#[dojo::event]
pub struct GameCreated {
    #[key]
    pub game_id: u32,
    pub map_id: u8,
    pub player_count: u8,
}

#[derive(Introspect, Serde, Drop)]
#[dojo::event]
pub struct GameStarted {
    #[key]
    pub game_id: u32,
    pub player_count: u8,
}

#[derive(Introspect, Serde, Drop)]
#[dojo::event]
pub struct PlayerJoined {
    #[key]
    pub game_id: u32,
    pub player_id: u8,
}

#[derive(Introspect, Serde, Drop)]
#[dojo::event]
pub struct UnitMoved {
    #[key]
    pub game_id: u32,
    pub unit_id: u8,
    pub x: u8,
    pub y: u8,
}

#[derive(Introspect, Serde, Drop)]
#[dojo::event]
pub struct UnitAttacked {
    #[key]
    pub game_id: u32,
    pub attacker_id: u8,
    pub target_id: u8,
    pub damage_to_defender: u8,
    pub damage_to_attacker: u8,
}

#[derive(Introspect, Serde, Drop)]
#[dojo::event]
pub struct UnitDied {
    #[key]
    pub game_id: u32,
    pub unit_id: u8,
}

#[derive(Introspect, Serde, Drop)]
#[dojo::event]
pub struct BuildingCaptured {
    #[key]
    pub game_id: u32,
    pub x: u8,
    pub y: u8,
    pub player_id: u8,
}

#[derive(Introspect, Serde, Drop)]
#[dojo::event]
pub struct UnitBuilt {
    #[key]
    pub game_id: u32,
    pub unit_type: UnitType,
    pub x: u8,
    pub y: u8,
}

#[derive(Introspect, Serde, Drop)]
#[dojo::event]
pub struct TurnEnded {
    #[key]
    pub game_id: u32,
    pub next_player: u8,
    pub round: u8,
}

#[derive(Introspect, Serde, Drop)]
#[dojo::event]
pub struct GameOver {
    #[key]
    pub game_id: u32,
    pub winner: u8,
}
