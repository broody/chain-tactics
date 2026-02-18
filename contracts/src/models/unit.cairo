use chain_tactics::types::UnitType;

#[derive(Introspect, Serde, Drop, DojoStore)]
#[dojo::model]
pub struct Unit {
    #[key]
    pub game_id: u32,
    #[key]
    pub unit_id: u8,
    pub player_id: u8,
    pub unit_type: UnitType,
    pub x: u8,
    pub y: u8,
    pub hp: u8,
    pub has_moved: bool,
    pub has_acted: bool,
    pub is_alive: bool,
}
