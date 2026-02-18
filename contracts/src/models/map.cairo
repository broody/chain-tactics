use chain_tactics::types::TileType;

#[derive(Introspect, Serde, Drop, DojoStore)]
#[dojo::model]
pub struct MapInfo {
    #[key]
    pub map_id: u8,
    pub player_count: u8,
    pub width: u8,
    pub height: u8,
    pub tile_count: u16,
}

#[derive(Introspect, Serde, Drop, DojoStore)]
#[dojo::model]
pub struct MapTile {
    #[key]
    pub map_id: u8,
    #[key]
    pub index: u16,
    pub tile_type: TileType,
}
