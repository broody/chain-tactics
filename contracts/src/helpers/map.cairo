/// Convert flat index to (x, y) coordinates given a width.
pub fn index_to_xy(index: u16, width: u8) -> (u8, u8) {
    let w: u16 = width.into();
    let x: u8 = (index % w).try_into().unwrap();
    let y: u8 = (index / w).try_into().unwrap();
    (x, y)
}

/// Convert (x, y) coordinates to flat index given a width.
pub fn xy_to_index(x: u8, y: u8, width: u8) -> u16 {
    let w: u16 = width.into();
    let yi: u16 = y.into();
    let xi: u16 = x.into();
    yi * w + xi
}
