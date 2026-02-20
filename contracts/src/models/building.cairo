use hashfront::types::BuildingType;

#[derive(Introspect, Serde, Drop, DojoStore)]
#[dojo::model]
pub struct Building {
    #[key]
    pub game_id: u32,
    #[key]
    pub x: u8,
    #[key]
    pub y: u8,
    pub building_type: BuildingType,
    pub player_id: u8,
    pub capture_player: u8,
    pub capture_progress: u8,
    pub queued_unit: u8,
}
