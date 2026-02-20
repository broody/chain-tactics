use hashfront::types::TileType;

#[derive(Introspect, Serde, Drop, DojoStore)]
#[dojo::model]
pub struct Tile {
    #[key]
    pub game_id: u32,
    #[key]
    pub x: u8,
    #[key]
    pub y: u8,
    pub tile_type: TileType,
}
