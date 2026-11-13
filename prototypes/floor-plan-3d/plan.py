"""First Floor Plan v5 -> single source of truth for the 3D model and the web viewer.

Plan coordinates (feet, inside sizes from the drawing):
  u = distance going SOUTH from the outer face of the north wall   (left -> right on the PDF)
  v = distance going WEST  from the outer face of the east wall    (top  -> bottom on the PDF)
Heights z are feet above the first-floor finished floor level (FFL).

World (Blender, metres, Z up):  X = east (+), Y = north (+)   ->  X = -v*FT, Y = -u*FT
glTF / three.js (Y up):         x = -v*FT, y = z*FT, z = u*FT   (north = -z, east = +x)

Run `python3 plan.py` to write viewer/plan.json.
"""
import json
import os

FT = 0.3048

# ---- section heights (ft) -------------------------------------------------
CEIL = 10.0          # finished floor to ceiling (assumed; not on drawing)
SLAB = 0.5           # RCC slab
PARAPET = 3.5        # parapet / railing height on open walkways
DOOR_H = 7.0
SHUTTER_H = 8.0
WIN_SILL, WIN_HEAD = 3.0, 7.0
VENT_SILL, VENT_HEAD = 5.0, 7.0
GROUND = -10.5       # ground level below FFL (ground floor height assumed 10' + slab)

T_EXT = 0.75         # 9" brick outer walls (drawing shows ~0.8')
T_INT = 0.5          # 6" partitions (drawing shows ~0.55')
T_BATH = 0.375       # 4.5" brick for the small common bath
T_PAR = 0.5          # parapet

# ---- rooms (inside rectangles: u0, u1, v0, v1) ----------------------------
# Every size below equals the "ROOM SIZES (inside, feet)" table on the drawing.
ROOMS = [
    # id,              label,                 rect (u0,u1,v0,v1),        floor,        paint,       kind
    ("store_room",     "Store Room (NE)",     (0.75, 10.75, 0.75, 12.5),  "vitrified",  "paint_grey",  "room"),
    ("master_bath",    "Master Bath",         (11.25, 15.25, 0.75, 12.5), "bathfloor",  "tile_wall",   "room"),
    ("master_bedroom", "Master Bedroom",      (15.75, 30.75, 0.75, 12.5), "wood_floor", "paint_sage",  "room"),
    ("kitchen",        "Kitchen",             (31.25, 39.25, 0.75, 12.5), "vitrified",  "paint_cream", "room"),
    ("kitchen_out",    "Kitchen Outside Space", (40.0, 43.0, 0.75, 13.0), "kota",     "paint_ext",   "open"),
    ("storeroom_bath", "Store Room Bath",     (0.75, 5.75, 13.0, 21.0),   "bathfloor",  "tile_wall",   "room"),
    ("main_hall",      "Main Hall",           (6.25, 35.25, 13.0, 21.0),  "vitrified",  "paint_warm",  "room"),
    ("entrance",       "Entrance Space",      (36.0, 43.0, 13.0, 21.0),   "kota",       "paint_ext",   "open"),
    ("store1",         "Store 1",             (0.75, 10.75, 21.5, 37.5),  "concrete",   "paint_store", "room"),
    ("store2",         "Store 2",             (11.25, 21.25, 21.5, 37.5), "concrete",   "paint_store", "room"),
    ("store3",         "Store 3",             (21.75, 31.75, 21.5, 37.5), "concrete",   "paint_store", "room"),
    ("common_bath",    "Common Bath",         (32.25, 35.25, 21.5, 27.0), "bathfloor",  "tile_wall",   "room"),
    ("up_stair",       "Stair up to 2nd floor", (32.25, 35.25, 27.375, 37.5), "granite", "paint_ext",  "stair"),
    ("walk_path",      "Walk Path",           (35.625, 39.5, 22.75, 38.25), "kota",      "paint_ext",   "open"),
    ("down_stair",     "Stair down",          (40.0, 43.0, 22.75, 43.0),  "granite",    "paint_ext",   "stair"),
    ("open_space",     "Open Space",          (36.0, 43.0, 21.0, 22.75),  "kota",       "paint_ext",   "open"),
    ("west_path",      "West Foot Path",      (0.75, 39.5, 38.25, 43.0),  "kota",       "paint_ext",   "open"),
]

# Sizes as written on the drawing (shown in the viewer HUD).
LABEL_SIZE = {
    "store_room": "10' x 11'9\"", "master_bath": "4' x 11'9\"", "master_bedroom": "15' x 11'9\"",
    "kitchen": "8' x 11'9\"", "kitchen_out": "3' x 12'", "storeroom_bath": "5' x 8'",
    "main_hall": "29' x 8'", "entrance": "7' x 8'", "store1": "10' x 16'", "store2": "10' x 16'",
    "store3": "10' x 16'", "common_bath": "3' x 5'6\"", "up_stair": "3' wide",
    "down_stair": "3' wide", "walk_path": "~4' wide", "open_space": "", "west_path": "4'9\" x 35'",
}

# ---- walls ----------------------------------------------------------------
# rect (u0,u1,v0,v1), z-range, kind.  The long side is the wall's run direction.
# openings: (type, a0, a1, sill, head, extra)
#   a0/a1 measured along the run axis (u for walls running N-S, v for walls running E-W)
#   door extra = {"hinge": "a0"|"a1", "swing": +1|-1 (toward +/- of the thin axis), "open": deg}
W = []


def wall(id, rect, kind="ext", z0=0.0, z1=CEIL, openings=()):
    W.append({"id": id, "rect": rect, "kind": kind, "z0": z0, "z1": z1, "openings": list(openings)})


D = lambda a0, a1, hinge, swing, open=80, h=DOOR_H, leaf="wood": (
    "door", a0, a1, 0.0, h, {"hinge": hinge, "swing": swing, "open": open, "leaf": leaf})
WIN = lambda a0, a1, sill=WIN_SILL, head=WIN_HEAD: ("window", a0, a1, sill, head, {})
VENT = lambda a0, a1: ("vent", a0, a1, VENT_SILL, VENT_HEAD, {})
SHUT = lambda a0, a1: ("shutter", a0, a1, 0.0, SHUTTER_H, {})

# Outer walls -------------------------------------------------------------
wall("N_ext", (0.0, 0.75, 0.0, 38.25), "ext", openings=[
    WIN(3.5, 8.5),            # store room, north
    VENT(15.5, 17.5),         # store room bath, north
    WIN(26.0, 32.0),          # store 1, north
])
wall("E_ext", (0.75, 40.0, 0.0, 0.75), "ext", openings=[
    WIN(3.0, 7.0),            # store room, east
    VENT(11.75, 13.75),       # master bath, east (high)
    WIN(19.75, 25.75),        # master bedroom, east
    WIN(33.0, 37.0, sill=3.5),  # kitchen, east (above counter)
])
wall("Kit_S_ext", (39.25, 40.0, 0.75, 12.5), "ext", openings=[
    WIN(4.5, 7.5, sill=3.5),  # kitchen, south -> kitchen outside space
])
# Front wall of the main hall: MAIN DOOR faces south (3'6", opens into the hall)
wall("Hall_S_front", (35.25, 36.0, 13.0, 21.0), "ext", openings=[
    D(17.0, 20.5, hinge="a1", swing=-1, open=70, leaf="main"),
])
# West (road-side) wall of the stores: two 7' rolling shutters + Store 3 normal 3' door
wall("Stores_W_ext", (0.75, 32.25, 37.5, 38.25), "ext", openings=[
    SHUT(2.25, 9.25),               # Store 1: 7' shutter, centred
    SHUT(12.75, 19.75),             # Store 2: 7' shutter
    D(27.75, 30.75, hinge="a0", swing=-1, open=75),   # Store 3 right (south) half; left half walled
])

# Parapets around open walkways (3'6")
wall("N_par_path", (0.0, 0.75, 38.25, 43.5), "parapet", z1=PARAPET)
wall("W_par_path", (0.75, 39.5, 43.0, 43.5), "parapet", z1=PARAPET)
wall("E_par_kos", (40.0, 43.5, 0.0, 0.75), "parapet", z1=PARAPET)
wall("S_par", (43.0, 43.5, 0.75, 22.75), "parapet", z1=PARAPET)
# The south wall beside the down stair runs from ground level up to the parapet top
wall("S_stairwell", (43.0, 43.5, 22.75, 43.5), "parapet", z0=GROUND, z1=PARAPET)

# Interior walls -----------------------------------------------------------
wall("EastRow_W", (0.75, 40.0, 12.5, 13.0), "int", openings=[
    D(1.25, 3.75, hinge="a0", swing=+1, open=80),     # store-room bath door (from store room)
    D(7.25, 10.25, hinge="a1", swing=-1, open=85),    # store room door (from hall)
    D(27.5, 30.5, hinge="a1", swing=-1, open=80),     # master bedroom door
    D(31.75, 34.75, hinge="a0", swing=-1, open=85),   # kitchen door
])
wall("StoreRm_MBath", (10.75, 11.25, 0.75, 12.5), "int")
wall("MBath_Bed", (15.25, 15.75, 0.75, 12.5), "int", openings=[
    # "Master bath door is 2 in. from the east wall": 2'6" door, opens into the bath
    D(0.75 + 2 / 12, 0.75 + 2 / 12 + 2.5, hinge="a0", swing=-1, open=80),
])
wall("Bed_Kitchen", (30.75, 31.25, 0.75, 12.5), "int")
wall("SRBath_Hall", (5.75, 6.25, 13.0, 21.0), "int")
wall("Mid_Stores", (0.75, 36.0, 21.0, 21.5), "int")
wall("S1_S2", (10.75, 11.25, 21.5, 37.5), "int")
wall("S2_S3", (21.25, 21.75, 21.5, 37.5), "int")
wall("S3_S", (31.75, 32.25, 21.5, 37.5), "int")
# Common bath 3' x 5'6" against the Store 3 wall and the main-hall wall
wall("CBath_S", (35.25, 35.625, 21.5, 27.375), "bath", openings=[
    D(21.75, 23.75, hinge="a1", swing=+1, open=80),   # 2' door, opens out to the open space
])
wall("CBath_W", (32.25, 35.25, 27.0, 27.375), "bath")
# Wall between walk path and the down stair (drawn solid), from ground up to the ceiling
wall("Walk_DownStair", (39.5, 40.0, 30.5, 37.5), "int", z0=GROUND)

# Railings (added for safety: drawing shows the stair edges open)
RAILS = [
    # id, (u0,u1,v0,v1), z0, z1
    ("rail_down_N1", (39.6, 39.9, 22.75, 30.5)),
    ("rail_down_N2", (39.6, 39.9, 37.5, 43.0)),
    ("rail_down_top", (40.0, 43.0, 22.6, 22.75)),
    ("rail_up_S", (35.3, 35.55, 27.375, 37.5)),
]

STAIRS = [
    # id, rect, direction of travel when going UP (+v = west, -v = east), z_from, z_to
    {"id": "up_stair", "rect": (32.25, 35.25, 27.375, 37.5), "up_dir": -1, "z_low": 0.0, "z_high": CEIL + SLAB,
     "note": "UP to 2nd floor (rises toward east)"},
    {"id": "down_stair", "rect": (40.0, 43.0, 22.75, 43.0), "up_dir": -1, "z_low": GROUND, "z_high": 0.0,
     "note": "DOWN 3' (descends toward west, to ground)"},
]

FOOTPRINT = (0.0, 43.5, 0.0, 43.5)
# Parts of the floor slab that are holes (stair wells)
FLOOR_HOLES = [(40.0, 43.0, 22.75, 43.0)]
CEIL_HOLES = [(32.25, 35.25, 27.375, 37.5)]

# Named viewpoints (eye u,v,z / look-at u,v,z in feet; lens in mm for the Blender stills).
VIEWS = {
    "entrance":    {"label": "Entrance (main door)", "eye": (42.5, 13.6, 5.2), "look": (36.0, 19.0, 4.5), "lens": 18},
    "hall":        {"label": "Main Hall", "eye": (33.8, 14.2, 5.2), "look": (8.0, 18.5, 3.8), "lens": 18},
    "living":      {"label": "Living / TV", "eye": (24.5, 20.3, 5.0), "look": (7.5, 15.5, 3.2), "lens": 18},
    "bedroom":     {"label": "Master Bedroom", "eye": (28.0, 11.5, 5.3), "look": (16.5, 4.0, 2.5), "lens": 16},
    "master_bath": {"label": "Master Bath", "eye": (13.6, 2.0, 5.2), "look": (12.8, 12.5, 3.2), "lens": 14},
    "kitchen":     {"label": "Kitchen", "eye": (34.2, 11.8, 5.2), "look": (37.5, 1.0, 3.0), "lens": 16},
    "store_room":  {"label": "Store Room (NE)", "eye": (7.8, 11.8, 5.2), "look": (1.5, 1.5, 3.5), "lens": 16},
    "store1":      {"label": "Store 1", "eye": (5.75, 37.0, 5.2), "look": (5.75, 21.5, 4.0), "lens": 16},
    "store3":      {"label": "Store 3", "eye": (29.5, 37.0, 5.2), "look": (24.0, 22.0, 4.0), "lens": 16},
    "foot_path":   {"label": "West Foot Path", "eye": (38.8, 41.5, 5.2), "look": (0.0, 39.0, 4.0), "lens": 22},
    "street":      {"label": "Road side (outside)", "eye": (70.0, 75.0, GROUND + 5.5), "look": (22.0, 30.0, 6.0), "lens": 22},
    "aerial":      {"label": "Aerial cutaway", "eye": (75.0, 75.0, 55.0), "look": (22.0, 22.0, 0.0), "lens": 30,
                    "hide": ["CEIL", "UPPER"]},
}
SPAWN = "entrance"


def to_json():
    return {
        "units": "feet",
        "ft": FT,
        "axes": "u = feet south of north outer face; v = feet west of east outer face; three.js x=-v*ft, z=u*ft",
        "heights": {"ceiling": CEIL, "slab": SLAB, "parapet": PARAPET, "door": DOOR_H, "ground": GROUND},
        "footprint": FOOTPRINT,
        "rooms": [{"id": r[0], "label": r[1], "rect": r[2], "size": LABEL_SIZE.get(r[0], ""), "kind": r[5]}
                  for r in ROOMS],
        "walls": W,
        "rails": [{"id": r[0], "rect": r[1]} for r in RAILS],
        "stairs": STAIRS,
        "views": VIEWS,
        "spawn": SPAWN,
    }


if __name__ == "__main__":
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "viewer", "plan.json")
    with open(out, "w") as f:
        json.dump(to_json(), f, indent=1)
    print("wrote", out)
