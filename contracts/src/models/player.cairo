use starknet::ContractAddress;

#[derive(Introspect, Serde, Drop, DojoStore)]
#[dojo::model]
pub struct PlayerState {
    #[key]
    pub game_id: u32,
    #[key]
    pub player_id: u8,
    pub address: ContractAddress,
    pub gold: u8,
    pub unit_count: u8,
    pub factory_count: u8,
    pub city_count: u8,
    pub is_alive: bool,
}
