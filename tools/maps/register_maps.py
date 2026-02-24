#!/usr/bin/env python3
"""
Register 5 new asymmetric maps for Hashfront.

Tile encoding: grid_index * 256 + tile_type
  grid_index = y * 20 + x
  tile_type: 0=Grass, 1=Mountain, 2=City, 3=Factory, 4=HQ, 5=Road, 6=Tree, 7=DirtRoad

Building encoding: player_id * 16777216 + building_type * 65536 + x * 256 + y
  building_type: 3=HQ

Unit encoding: player_id * 16777216 + unit_type * 65536 + x * 256 + y
  unit_type: 1=Infantry, 2=Ranger, 3=Tank

All maps are 20x20. Each has 14 units (4 infantry, 2 rangers, 1 tank per side).
"""

import subprocess
import json
import sys

CONTRACT = "0x05050094858a637c2c315b408377f7ce7d0481c4e60fd5bc732aad0ac7ab2862"
RPC = "https://api.cartridge.gg/x/starknet/sepolia"

# Terrain constants
G, M, C, F, H, R, T, D = 0, 1, 2, 3, 4, 5, 6, 7

# Unit types
INFANTRY, RANGER, TANK = 1, 2, 3


def encode_tiles(grid):
    """Encode non-grass tiles from a 20x20 grid."""
    tiles = []
    for y in range(20):
        for x in range(20):
            t = grid[y][x]
            if t != G:
                idx = y * 20 + x
                tiles.append(idx * 256 + t)
    return tiles


def encode_buildings(p1_hq, p2_hq):
    """Encode HQ buildings."""
    HQ_TYPE = 3
    return [
        1 * 16777216 + HQ_TYPE * 65536 + p1_hq[0] * 256 + p1_hq[1],
        2 * 16777216 + HQ_TYPE * 65536 + p2_hq[0] * 256 + p2_hq[1],
    ]


def encode_units(unit_list):
    """Encode units. Each: (player_id, unit_type, x, y)."""
    return [p * 16777216 + u * 65536 + x * 256 + y for p, u, x, y in unit_list]


def print_map(name, grid, units, p1_hq, p2_hq):
    """Pretty-print a map for review."""
    sym = {G: '.', M: 'M', C: 'C', F: 'F', H: 'H', R: 'R', T: 'T', D: 'D'}
    print(f"\n{'='*50}")
    print(f"  {name}")
    print(f"{'='*50}")
    print("   0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9")
    
    # Build unit position map
    umap = {}
    for p, ut, ux, uy in units:
        ch = {INFANTRY: 'i', RANGER: 'r', TANK: 't'}[ut]
        if p == 1:
            ch = ch.upper()
        umap[(ux, uy)] = ch
    
    for y in range(20):
        row = []
        for x in range(20):
            if (x, y) in umap:
                row.append(umap[(x, y)])
            elif (x, y) == tuple(p1_hq):
                row.append('1')
            elif (x, y) == tuple(p2_hq):
                row.append('2')
            else:
                row.append(sym[grid[y][x]])
        print(f"{y:2} {' '.join(row)}")
    
    n_tiles = sum(1 for y in range(20) for x in range(20) if grid[y][x] != G)
    print(f"  Non-grass tiles: {n_tiles}, Units: {len(units)}")


def register_map(name, grid, p1_hq, p2_hq, units):
    """Register a map via controller CLI."""
    tiles = encode_tiles(grid)
    buildings = encode_buildings(p1_hq, p2_hq)
    unit_data = encode_units(units)
    
    # Build calldata: name (ByteArray), width, height, tiles (Array), buildings (Array), units (Array)
    # ByteArray: [num_full_words, ...full_words, pending_word, pending_word_len]
    name_bytes = name.encode('ascii')
    # For names ≤ 31 bytes: 0 full words, pending = hex, len = byte count
    assert len(name_bytes) <= 31, f"Name too long: {name}"
    pending_hex = '0x' + name_bytes.hex()
    
    calldata = [
        '0', pending_hex, str(len(name_bytes)),  # ByteArray
        '20', '20',                                # width, height
        str(len(tiles)),                           # tiles array length
    ]
    calldata.extend(str(t) for t in tiles)
    calldata.append(str(len(buildings)))            # buildings array length
    calldata.extend(str(b) for b in buildings)
    calldata.append(str(len(unit_data)))            # units array length
    calldata.extend(str(u) for u in unit_data)
    
    calldata_str = ','.join(calldata)
    
    cmd = [
        'controller', 'execute',
        '--rpc-url', RPC,
        CONTRACT, 'register_map', calldata_str,
    ]
    
    print(f"\nRegistering '{name}'...")
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    if result.returncode != 0:
        print(f"  ERROR: {result.stderr.strip()}")
        return False
    print(f"  OK: {result.stdout.strip()}")
    return True


# ════════════════════════════════════════════════════════════════════
# MAP 1: "ridgeline" — Diagonal mountain ridge splits the map.
#   P1 starts NW, P2 starts SE. Ridge forces detours.
#   Trees along the ridge provide cover for defenders.
#   A narrow dirt road pass through the center.
# ════════════════════════════════════════════════════════════════════

def make_ridgeline():
    g = [[G]*20 for _ in range(20)]
    
    # Diagonal mountain ridge from ~(3,2) to ~(16,17)
    # Thick 2-3 tiles wide in the middle
    ridge = [
        (2,1),(3,1),(3,2),(4,2),(4,3),(5,3),(5,4),(6,4),(6,5),(7,5),
        (7,6),(8,6),(8,7),(9,7),(9,8),(10,8),
        (10,9),(11,9),(11,10),(12,10),(12,11),(13,11),(13,12),(14,12),
        (14,13),(15,13),(15,14),(16,14),(16,15),(17,15),(17,16),
        # Thicken the middle
        (7,7),(8,8),(9,9),(10,10),(11,11),(12,12),
        (6,6),(13,13),(14,14),
    ]
    for x, y in ridge:
        if 0 <= x < 20 and 0 <= y < 20:
            g[y][x] = M
    
    # Dirt road pass through center (gaps in ridge)
    for x, y in [(9,8),(10,9),(9,9)]:
        g[y][x] = D
    
    # Trees along both sides of ridge for cover
    trees = [
        (1,0),(2,0),(4,1),(5,2),(6,3),(7,4),(8,5),(11,8),(12,9),
        (13,10),(14,11),(15,12),(16,13),(17,14),(18,15),(18,16),
        # P1 side forests
        (0,3),(1,4),(2,5),(0,6),(1,7),
        # P2 side forests
        (19,13),(18,12),(17,11),(19,16),(18,17),
        # Scattered cover
        (3,8),(4,9),(15,10),(16,11),
    ]
    for x, y in trees:
        if 0 <= x < 20 and 0 <= y < 20:
            g[y][x] = T
    
    # HQs
    p1_hq = (0, 0)
    p2_hq = (19, 19)
    g[0][0] = H
    g[19][19] = H
    
    units = [
        # P1 — NW corner
        (1, INFANTRY, 1, 1), (1, INFANTRY, 2, 2), (1, INFANTRY, 0, 2), (1, INFANTRY, 1, 3),
        (1, RANGER, 3, 0), (1, RANGER, 0, 4),
        (1, TANK, 2, 1),
        # P2 — SE corner
        (2, INFANTRY, 18, 18), (2, INFANTRY, 17, 17), (2, INFANTRY, 19, 17), (2, INFANTRY, 18, 16),
        (2, RANGER, 16, 19), (2, RANGER, 19, 15),
        (2, TANK, 17, 18),
    ]
    return "ridgeline", g, p1_hq, p2_hq, units


# ════════════════════════════════════════════════════════════════════
# MAP 2: "archipelago" — Islands of trees in a sea of grass.
#   Mountain clusters create multiple paths. No single chokepoint.
#   Favors mobile warfare and flanking.
# ════════════════════════════════════════════════════════════════════

def make_archipelago():
    g = [[G]*20 for _ in range(20)]
    
    # Island clusters of trees (5-6 clusters scattered)
    islands = [
        # NW island
        [(3,3),(4,3),(3,4),(4,4),(5,4)],
        # NE island
        [(14,2),(15,2),(16,2),(15,3),(16,3)],
        # Center-west island
        [(2,9),(3,9),(2,10),(3,10),(4,10)],
        # Center-east island
        [(15,9),(16,9),(17,9),(16,10),(17,10)],
        # SW island
        [(3,15),(4,15),(5,15),(4,16),(5,16)],
        # SE island
        [(14,16),(15,16),(14,17),(15,17),(16,17)],
        # Center island (with mountains)
        [(9,9),(10,9),(9,10),(10,10)],
    ]
    for island in islands:
        for x, y in island:
            g[y][x] = T
    
    # Mountain barriers (small, scattered — force detours but don't wall off)
    mountains = [
        (7,5),(8,5),(7,14),(8,14),  # horizontal bars
        (11,5),(12,5),(11,14),(12,14),
        (5,7),(5,8),(14,7),(14,8),  # vertical bars  
        (5,11),(5,12),(14,11),(14,12),
        # Center mountains (make center island rocky)
        (9,9),(10,10),
    ]
    for x, y in mountains:
        g[y][x] = M
    
    # Dirt roads connecting islands
    roads = [(6,6),(7,6),(12,6),(13,6),(6,13),(7,13),(12,13),(13,13)]
    for x, y in roads:
        g[y][x] = D
    
    # HQs — opposite corners but not quite at (0,0)
    p1_hq = (1, 0)
    p2_hq = (18, 19)
    g[0][1] = H
    g[19][18] = H
    
    units = [
        # P1 — NW spread
        (1, INFANTRY, 0, 0), (1, INFANTRY, 2, 0), (1, INFANTRY, 0, 1), (1, INFANTRY, 2, 1),
        (1, RANGER, 1, 2), (1, RANGER, 3, 1),
        (1, TANK, 1, 1),
        # P2 — SE spread
        (2, INFANTRY, 19, 19), (2, INFANTRY, 17, 19), (2, INFANTRY, 19, 18), (2, INFANTRY, 17, 18),
        (2, RANGER, 18, 17), (2, RANGER, 16, 18),
        (2, TANK, 18, 18),
    ]
    return "archipelago", g, p1_hq, p2_hq, units


# ════════════════════════════════════════════════════════════════════
# MAP 3: "ambush" — Dense forest with narrow clearings.
#   Most of the map is trees. Open lanes create kill zones.
#   Rangers dominate the lanes; melee must push through cover.
#   Asymmetric: P1 has more direct lane access, P2 has deeper forest.
# ════════════════════════════════════════════════════════════════════

def make_ambush():
    g = [[G]*20 for _ in range(20)]  # Start all grass
    
    # Dense forest patches (not the whole map — just strategic zones)
    # NW forest block
    for x in range(6, 10):
        for y in range(2, 6):
            g[y][x] = T
    # NE forest block
    for x in range(12, 17):
        for y in range(1, 5):
            g[y][x] = T
    # SW forest block
    for x in range(3, 8):
        for y in range(15, 19):
            g[y][x] = T
    # SE forest block
    for x in range(10, 14):
        for y in range(14, 18):
            g[y][x] = T
    # Center forest (the ambush zone)
    for x in range(7, 13):
        for y in range(8, 12):
            g[y][x] = T
    
    # Clear lanes through forests (kill zones)
    # Horizontal lane through center
    for x in range(20):
        g[10][x] = G
    # Vertical lanes
    for y in range(20):
        g[y][5] = G
        g[y][14] = G
    
    # Mountain chokepoints at lane intersections
    mountains = [(5,4),(5,5),(14,14),(14,15),(9,10),(10,10)]
    for x, y in mountains:
        g[y][x] = M
    
    # Road through center lane
    for x in range(6, 14):
        if g[10][x] == G:
            g[10][x] = R
    
    # Scattered trees along edges for flank cover
    edge_trees = [(0,7),(1,7),(0,12),(1,12),(18,7),(19,7),(18,12),(19,12)]
    for x, y in edge_trees:
        g[y][x] = T
    
    # HQs
    p1_hq = (0, 0)
    p2_hq = (19, 19)
    g[0][0] = H
    g[19][19] = H
    
    units = [
        # P1 — NW
        (1, INFANTRY, 1, 0), (1, INFANTRY, 0, 1), (1, INFANTRY, 2, 1), (1, INFANTRY, 1, 2),
        (1, RANGER, 3, 0), (1, RANGER, 0, 3),
        (1, TANK, 1, 1),
        # P2 — SE
        (2, INFANTRY, 18, 19), (2, INFANTRY, 19, 18), (2, INFANTRY, 17, 18), (2, INFANTRY, 18, 17),
        (2, RANGER, 19, 17), (2, RANGER, 17, 19),
        (2, TANK, 18, 18),
    ]
    return "ambush", g, p1_hq, p2_hq, units


# ════════════════════════════════════════════════════════════════════
# MAP 4: "cliffside" — Heavy mountains on one side, open on other.
#   Left half is mountainous (infantry-only terrain). Right half is
#   open grassland with scattered trees. P1 starts top-left (mountains),
#   P2 starts bottom-right (open). Asymmetric by design.
#   Mountain player must use infantry flanks; open player has mobility.
# ════════════════════════════════════════════════════════════════════

def make_cliffside():
    g = [[G]*20 for _ in range(20)]
    
    # Left half: heavy mountains with infantry paths
    for y in range(20):
        for x in range(10):
            # Dense mountains with some gaps
            if (x + y) % 3 == 0 and not (x < 3 and y < 3) and not (x < 3 and y > 16):
                g[y][x] = M
    
    # Clear infantry paths through mountains
    # Path 1: along x=1
    for y in range(20):
        g[y][1] = G
    # Path 2: zigzag through center-left
    for y in range(0, 20, 2):
        g[y][4] = G
        if y + 1 < 20:
            g[y+1][5] = G
    # Path 3: along the cliff edge (x=9)
    for y in range(20):
        g[y][9] = G
    
    # Dirt road along the cliff edge
    for y in range(3, 17):
        g[y][9] = D
    
    # Right half: open with scattered tree cover
    trees_right = [
        (12,3),(13,3),(12,4),
        (16,6),(17,6),(16,7),
        (11,10),(12,10),(11,11),
        (15,12),(16,12),(15,13),(16,13),
        (13,16),(14,16),(13,17),
        (18,8),(18,9),
    ]
    for x, y in trees_right:
        g[y][x] = T
    
    # Some trees in mountain area for cover
    trees_left = [(2,4),(2,8),(2,12),(2,16),(7,3),(7,9),(7,15)]
    for x, y in trees_left:
        g[y][x] = T
    
    # HQs
    p1_hq = (0, 0)
    p2_hq = (19, 19)
    g[0][0] = H
    g[19][19] = H
    
    # Clear HQ surroundings
    for x in range(3):
        for y in range(3):
            if g[y][x] == M:
                g[y][x] = G
    
    units = [
        # P1 — Mountain side (more infantry to navigate mountains)
        (1, INFANTRY, 1, 0), (1, INFANTRY, 0, 1), (1, INFANTRY, 2, 0), (1, INFANTRY, 1, 2),
        (1, RANGER, 2, 1), (1, RANGER, 0, 2),
        (1, TANK, 1, 1),
        # P2 — Open side
        (2, INFANTRY, 18, 19), (2, INFANTRY, 19, 18), (2, INFANTRY, 17, 19), (2, INFANTRY, 18, 17),
        (2, RANGER, 19, 17), (2, RANGER, 17, 18),
        (2, TANK, 18, 18),
    ]
    return "cliffside", g, p1_hq, p2_hq, units


# ════════════════════════════════════════════════════════════════════
# MAP 5: "no_mans_land" — Wide open center with fortified flanks.
#   Both sides have tree/mountain cover near their HQ.
#   The center 6 rows are pure grass — a killing field.
#   Whoever controls the center dominates, but crossing is dangerous.
#   Scattered city ruins in the center provide some cover.
# ════════════════════════════════════════════════════════════════════

def make_no_mans_land():
    g = [[G]*20 for _ in range(20)]
    
    # P1 fortifications (top, rows 0-5)
    p1_fort = [
        # Mountain wall with gaps
        (3,3),(4,3),(5,3),(7,3),(8,3),(11,3),(12,3),(14,3),(15,3),(16,3),
        # Trees behind wall
        (2,1),(3,1),(4,1),(6,2),(7,2),(12,2),(13,2),(17,1),(18,1),
        (1,2),(2,2),(15,1),(16,1),
        # Forward tree cover
        (5,4),(6,4),(13,4),(14,4),
        (9,5),(10,5),
    ]
    for x, y in p1_fort:
        g[y][x] = M if y == 3 else T
    
    # P2 fortifications (bottom, rows 14-19) — slightly different layout
    p2_fort = [
        # Mountain wall
        (3,16),(4,16),(5,16),(8,16),(9,16),(10,16),(14,16),(15,16),(16,16),
        # Trees behind
        (2,18),(3,18),(4,18),(7,17),(8,17),(13,17),(14,17),(17,18),(18,18),
        (1,17),(2,17),(16,17),(17,17),
        # Forward tree cover
        (5,15),(6,15),(13,15),(14,15),
        (9,14),(10,14),
    ]
    for x, y in p2_fort:
        g[y][x] = M if y == 16 else T
    
    # No man's land — mostly grass, but scattered city ruins
    cities = [(4,8),(8,7),(11,7),(15,8),(6,11),(9,12),(12,12),(16,11)]
    for x, y in cities:
        g[y][x] = C
    
    # Dirt roads leading into the center
    for y in range(5, 8):
        g[y][0] = D
        g[y][19] = D
    for y in range(12, 15):
        g[y][0] = D
        g[y][19] = D
    
    # HQs
    p1_hq = (10, 0)
    p2_hq = (10, 19)
    g[0][10] = H
    g[19][10] = H
    
    units = [
        # P1 — spread behind fortifications
        (1, INFANTRY, 9, 0), (1, INFANTRY, 11, 0), (1, INFANTRY, 8, 1), (1, INFANTRY, 12, 1),
        (1, RANGER, 6, 1), (1, RANGER, 14, 1),
        (1, TANK, 10, 1),
        # P2 — spread behind their wall
        (2, INFANTRY, 9, 19), (2, INFANTRY, 11, 19), (2, INFANTRY, 8, 18), (2, INFANTRY, 12, 18),
        (2, RANGER, 6, 18), (2, RANGER, 14, 18),
        (2, TANK, 10, 18),
    ]
    return "no_mans_land", g, p1_hq, p2_hq, units


# ════════════════════════════════════════════════════════════════════

ALL_MAPS = [make_ridgeline, make_archipelago, make_ambush, make_cliffside, make_no_mans_land]

if __name__ == "__main__":
    dry_run = "--dry-run" in sys.argv
    
    for make_fn in ALL_MAPS:
        name, grid, p1_hq, p2_hq, units = make_fn()
        print_map(name, grid, units, p1_hq, p2_hq)
        
        if not dry_run:
            ok = register_map(name, grid, p1_hq, p2_hq, units)
            if not ok:
                print(f"Failed to register {name}, stopping.")
                sys.exit(1)
    
    if dry_run:
        print("\n[dry-run] No maps registered. Remove --dry-run to submit.")
    else:
        print("\n✅ All 5 maps registered!")
