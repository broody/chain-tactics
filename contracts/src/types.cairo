#[derive(Serde, Drop, Copy, PartialEq, Introspect, DojoStore, Default)]
pub enum GameState {
    #[default]
    Lobby,
    Playing,
    Finished,
}

// Must match client TileType ordinals: Grass=0, Mountain=1, City=2, Factory=3, HQ=4, Road=5,
// Tree=6, DirtRoad=7
#[derive(Serde, Drop, Copy, PartialEq, Introspect, DojoStore, Default)]
pub enum TileType {
    #[default]
    Grass,
    Mountain,
    City,
    Factory,
    HQ,
    Road,
    Tree,
    DirtRoad,
}

#[derive(Serde, Drop, Copy, PartialEq, Introspect, DojoStore, Default)]
pub enum UnitType {
    #[default]
    None,
    Infantry,
    Tank,
    Ranger,
}

#[derive(Serde, Drop, Copy, PartialEq, Introspect, DojoStore, Default)]
pub enum BuildingType {
    #[default]
    None,
    City,
    Factory,
    HQ,
}

#[derive(Serde, Drop, Copy, Introspect)]
pub struct Vec2 {
    pub x: u8,
    pub y: u8,
}
