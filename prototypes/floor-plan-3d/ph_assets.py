"""Poly Haven (CC0) assets for the floor-plan model: scanned furniture/props, PBR textures, HDRI skies.

CLI (system python3, standard library only for `fetch`):
    python3 ph_assets.py fetch [--dry-run] [--refresh]   download everything in the manifests into build/ph/
    python3 ph_assets.py textures <out_dir>              write_textures(out_dir)   (needs Pillow + numpy)
    python3 ph_assets.py list                            print the manifests
With Blender's python (bpy):
    python ph_assets.py verify                           import every model, check conventions, print a table
    python ph_assets.py contact [out.jpg]                Cycles thumbnails of every model -> contact sheet

From Blender:
    import ph_assets as ph
    sofa = ph.import_model("sofa_03")             # root Empty at the origin, see import_model()
    sofa.location = (x, y, floor_z); sofa.rotation_euler.z = ph.yaw_to_face("sofa_03", "+x")
    ph.write_textures("build/textures")           # <mat>.jpg, <mat>_n.jpg, <mat>_r.jpg + ph_textures.json
    ph.set_world_hdri("rustig_koppie_puresky", 1.0, ph.hdri_rotation_for_sun("rustig_koppie_puresky", 270))  # sun in the west

Everything downloaded is treated as untrusted data and lives only under build/ph/ (git-ignored).
Nothing downloaded is ever executed. All assets are CC0 (https://polyhaven.com/license).
"""
import hashlib
import json
import math
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "build", "ph")
API = "https://api.polyhaven.com"
ALLOWED_HOSTS = ("https://api.polyhaven.com/", "https://dl.polyhaven.org/")
USER_AGENT = "asset-fetch/1.0"

# ====================================================================== manifests ==========
# MODELS: asset id -> {"res": glTF texture variant, "use": what it is for}
_H, _P = "2k", "1k"  # hero pieces / small props
MODELS = {
    # ---- seating
    "sofa_02": {"res": _H, "use": "2-seat leather sofa (bedroom / hall corner)"},
    "sofa_03": {"res": _H, "use": "3-seat classic sofa with cushions, main hall"},
    "modern_arm_chair_01": {"res": _H, "use": "upholstered armchair, hall"},
    "mid_century_lounge_chair": {"res": _H, "use": "lounge chair, hall / bedroom reading corner"},
    "dining_chair_02": {"res": _H, "use": "dining / desk chair"},
    "Ottoman_01": {"res": _H, "use": "ottoman / pouf, foot of bed or hall"},
    "plastic_monobloc_chair_01": {"res": _P, "use": "plastic chair for the stores / entrance (very Indian)"},
    "bar_chair_round_01": {"res": _P, "use": "bar stool"},
    "wooden_stool_01": {"res": _P, "use": "low wooden stool"},
    "metal_stool_02": {"res": _P, "use": "metal stool for the stores"},
    # ---- tables / storage
    "modern_coffee_table_01": {"res": _H, "use": "rectangular coffee table"},
    "modern_coffee_table_02": {"res": _H, "use": "square modern coffee table (fretwork top)"},
    "coffee_table_round_01": {"res": _H, "use": "round coffee table"},
    "side_table_01": {"res": _P, "use": "side table / bedside"},
    "side_table_tall_01": {"res": _P, "use": "tall plant stand / side table"},
    "round_wooden_table_02": {"res": _H, "use": "small round dining table (0.8 m)"},
    "modern_wooden_cabinet": {"res": _H, "use": "low TV unit / sideboard"},
    "drawer_cabinet": {"res": _H, "use": "tall chest of drawers"},
    "painted_wooden_nightstand": {"res": _P, "use": "bedside table"},
    "ClassicNightstand_01": {"res": _P, "use": "bedside table (classic)"},
    "wooden_display_shelves_01": {"res": _H, "use": "open display shelf"},
    "metal_office_desk": {"res": _H, "use": "desk for a store / billing counter"},
    "steel_frame_shelves_01": {"res": _H, "use": "store rack 1.1 m"},
    "steel_frame_shelves_02": {"res": _H, "use": "store rack 0.6 m"},
    "steel_frame_shelves_03": {"res": _H, "use": "store rack 2.35 m with boxes"},
    "worn_metal_rack": {"res": _H, "use": "store rack (worn)"},
    # ---- beds / soft
    "GothicBed_01": {"res": _H, "use": "only complete bed with mattress on Poly Haven (ornate, not modern)"},
    "vintage_day_bed": {"res": _H, "use": "day bed / diwan"},
    "throw_pillows_01": {"res": _H, "use": "cushions for sofa / bed"},
    # ---- lighting / appliances
    "modern_ceiling_lamp_01": {"res": _P, "use": "pendant lamp"},
    "desk_lamp_arm_01": {"res": _P, "use": "desk lamp"},
    "ceiling_fan": {"res": _P, "use": "ceiling fan (every Indian room)"},
    "mounted_fluorescent_lights": {"res": _P, "use": "tube lights for the stores"},
    "exterior_aircon_unit": {"res": _P, "use": "AC outdoor unit on the exterior wall"},
    "Television_01": {"res": _P, "use": "television (old CRT - no flat TV exists on Poly Haven)"},
    "classic_laptop": {"res": _P, "use": "laptop on a desk (old model)"},
    # ---- plants / vases / decor
    "potted_plant_01": {"res": _H, "use": "tall floor plant"},
    "potted_plant_02": {"res": _H, "use": "medium floor plant"},
    "potted_plant_04": {"res": _P, "use": "small table plant"},
    "planter_box_01": {"res": _P, "use": "planter box for the entrance / walkway"},
    "planter_pot_clay": {"res": _P, "use": "terracotta pot"},
    "ceramic_vase_01": {"res": _P, "use": "vase"},
    "ceramic_vase_02": {"res": _P, "use": "vase"},
    "ceramic_vase_03": {"res": _P, "use": "vase"},
    "ceramic_vase_04": {"res": _P, "use": "vase"},
    "brass_vase_01": {"res": _P, "use": "tall brass floor vase"},
    "brass_vase_02": {"res": _P, "use": "brass vase"},
    "brass_diya_lantern": {"res": _P, "use": "brass diya lamp (Indian decor)"},
    "carved_wooden_elephant": {"res": _P, "use": "small carved elephant (Indian decor)"},
    "wall_clock": {"res": _P, "use": "wall clock"},
    "alarm_clock_01": {"res": _P, "use": "bedside clock"},
    "ornate_mirror_01": {"res": _P, "use": "wall mirror"},
    "fancy_picture_frame_01": {"res": _P, "use": "wall art, landscape"},
    "fancy_picture_frame_02": {"res": _P, "use": "wall art, ornate"},
    "hanging_picture_frame_01": {"res": _P, "use": "wall art, portrait"},
    "hanging_picture_frame_02": {"res": _P, "use": "wall art, landscape"},
    "hanging_picture_frame_03": {"res": _P, "use": "wall art, small"},
    "standing_picture_frame_01": {"res": _P, "use": "table photo frame"},
    "standing_picture_frame_02": {"res": _P, "use": "table photo frame"},
    "book_encyclopedia_set_01": {"res": _P, "use": "row of books"},
    "wicker_basket_01": {"res": _P, "use": "basket"},
    "wicker_basket_02": {"res": _P, "use": "basket"},
    # ---- kitchen
    "brass_pot_01": {"res": _P, "use": "brass pot (lota / handi)"},
    "brass_pot_02": {"res": _P, "use": "brass bowl"},
    "brass_pan_01": {"res": _P, "use": "brass pan"},
    "pot_enamel_01": {"res": _P, "use": "cooking pot with lid"},
    "vintage_electric_kettle": {"res": _P, "use": "kettle"},
    "jug_01": {"res": _P, "use": "jug"},
    "metal_jug": {"res": _P, "use": "metal water jug"},
    "tea_set_01": {"res": _P, "use": "tea set"},
    "plastic_thermos": {"res": _P, "use": "thermos flask"},
    "wooden_bowl_01": {"res": _P, "use": "fruit bowl"},
    "wooden_bowl_02": {"res": _P, "use": "small bowl"},
    "wooden_spoon": {"res": _P, "use": "wooden spoon"},
    "wooden_cutting_board": {"res": _P, "use": "chopping board"},
    "food_apple_01": {"res": _P, "use": "apple"},
    "bananas": {"res": _P, "use": "bananas"},
    "food_pomegranate_01": {"res": _P, "use": "pomegranate"},
    "lemon": {"res": _P, "use": "lemon"},
    "food_lime_01": {"res": _P, "use": "lime"},
    "yellow_onion": {"res": _P, "use": "onion"},
    "small_lpg_tank": {"res": _P, "use": "LPG cylinder (kitchen outside space)"},
    # ---- bathroom / cleaning
    "all_purpose_cleaner": {"res": _P, "use": "spray bottle"},
    "bleach_bottle": {"res": _P, "use": "cleaner bottle"},
    "multi_cleaner_bottle": {"res": _P, "use": "cleaner bottle"},
    "plunger": {"res": _P, "use": "plunger"},
    "plastic_broom": {"res": _P, "use": "broom"},
    # ---- stores
    "cardboard_box_01": {"res": _P, "use": "carton"},
    "plastic_crate_01": {"res": _P, "use": "plastic crate"},
    "plastic_crate_02": {"res": _P, "use": "plastic crate"},
    "plastic_crate_03": {"res": _P, "use": "plastic crate"},
    "wooden_crate_01": {"res": _P, "use": "wooden crate"},
    "wooden_crate_02": {"res": _P, "use": "wooden crate"},
    "industrial_pastic_container": {"res": _P, "use": "plastic tote"},
    "plastic_container": {"res": _P, "use": "large plastic container"},
    "hand_truck": {"res": _P, "use": "hand truck / trolley"},
    "cement_bag": {"res": _P, "use": "sack"},
    "compost_bag_02": {"res": _P, "use": "sack"},
    "barrel_03": {"res": _P, "use": "drum"},
    "plastic_jerrycan": {"res": _P, "use": "jerrycan"},
    "wooden_ladder": {"res": _P, "use": "step ladder"},
    "korean_fire_extinguisher_01": {"res": _P, "use": "fire extinguisher"},
    "trashbag": {"res": _P, "use": "rubbish bag"},
    "rollershutter_door": {"res": _P, "use": "rolling shutter (3.08 x 2.4 m) reference for the store fronts"},
}

# TEXTURES: MY material name -> Poly Haven texture.
#   tile_m  real-world size in metres that one repeat of the written texture covers
#   crop    (x0, y0, size, blend) in fractions of the source: cut a grout-free square and make it seamless
#   grade   optional colour grade of the base colour only (detail, normal and roughness stay real):
#           sat = saturation multiplier, mean = target mean sRGB colour (0..1), gain = plain multiplier
#   rough   optional target MEAN roughness: the scanned roughness map is rescaled to it (scans of stone and
#           tile are matte; polished vitrified / granite need a low value). Variation in the map is kept.
TEXTURES = {
    "wood_floor": {"id": "laminate_floor_02", "res": "2k", "tile_m": 1.7, "use": "oak plank laminate floor"},
    "wood_herringbone": {"id": "herringbone_parquet", "res": "2k", "rough": 0.25, "tile_m": 3.4, "use": "extra: herringbone parquet alternative"},
    "vitrified": {"id": "marble_01", "res": "2k", "rough": 0.2, "tile_m": 1.5, "grade": {"sat": 0.55, "mean": (0.84, 0.81, 0.75)},
                  "use": "large cream marble / vitrified floor tiles (graded lighter)"},
    "bathfloor": {"id": "concrete_pavement_02", "res": "2k", "tile_m": 1.8, "grade": {"sat": 0.35, "mean": (0.55, 0.55, 0.54)},
                  "use": "matte 30 cm grey tiles (graded to neutral grey)"},
    "tile_wall": {"id": "marble_01", "res": "2k", "rough": 0.15, "tile_m": 1.5, "grade": {"sat": 0.25, "mean": (0.90, 0.89, 0.86)},
                  "use": "light marble-look wall tile (same scan as vitrified, graded near-white)"},
    "kitchen_dado": {"id": "long_white_tiles", "res": "2k", "tile_m": 1.27, "grade": {"sat": 0.6, "mean": (0.90, 0.89, 0.86)},
                     "use": "white stacked finger ('kit-kat') tiles"},
    "kota": {"id": "granite_tile_04", "res": "2k", "tile_m": 2.0, "grade": {"sat": 0.0, "mean": (0.43, 0.48, 0.45)},
             "use": "square stone slabs graded to kota grey-green"},
    "concrete": {"id": "brushed_concrete", "res": "2k", "tile_m": 2.5, "grade": {"sat": 0.3, "mean": (0.52, 0.52, 0.50)},
                 "use": "trowelled cement (IPS) floor"},
    "granite_black": {"id": "granite_tile_03", "res": "8k", "rough": 0.14, "tile_m": 0.504, "crop": (0.345, 0.05, 0.28, 0.03),
                      "grade": {"sat": 0.15, "gain": 0.16}, "use": "polished black granite (grout-free crop, darkened)"},
    "granite": {"id": "granite_tile_03", "res": "8k", "rough": 0.25, "tile_m": 0.504, "crop": (0.345, 0.05, 0.28, 0.03),
                "grade": {"sat": 0.25}, "use": "grey speckled granite (grout-free crop)"},
    "teak": {"id": "teak_veneer", "res": "2k", "tile_m": 1.0, "use": "teak veneer for doors"},
    "walnut": {"id": "walnut_veneer_02", "res": "2k", "tile_m": 1.0, "grade": {"gain": 0.62}, "use": "dark walnut veneer (darkened)"},
    "oak_light": {"id": "oak_veneer_02", "res": "2k", "tile_m": 1.0, "use": "light oak veneer"},
    "fabric_sofa": {"id": "poly_wool_herringbone", "res": "2k", "tile_m": 0.27, "use": "grey woven upholstery"},
    "fabric_bed": {"id": "rough_linen", "res": "2k", "tile_m": 0.27, "grade": {"sat": 0.0, "mean": (0.90, 0.89, 0.86)},
                   "use": "white linen (blue scan graded white)"},
    "fabric_throw": {"id": "waffle_pique_cotton", "res": "2k", "tile_m": 0.28, "grade": {"sat": 0.8, "mean": (0.74, 0.50, 0.16)},
                     "use": "mustard waffle-cotton throw"},
    "fabric_curtain": {"id": "terlenka", "res": "2k", "tile_m": 0.27, "grade": {"mean": (0.82, 0.77, 0.68)}, "use": "fine beige curtain cloth"},
    "asphalt": {"id": "asphalt_02", "res": "2k", "tile_m": 3.0, "use": "road"},
    "ground": {"id": "grass_ground", "res": "2k", "tile_m": 2.51, "use": "dry patchy grass"},
    "paint_ext": {"id": "white_stucco", "res": "2k", "tile_m": 2.0, "use": "exterior stucco"},
    "plaster": {"id": "beige_wall_001", "res": "2k", "tile_m": 3.0, "grade": {"sat": 0.0, "mean": (0.90, 0.90, 0.90)},
                "use": "smooth painted plaster, neutral light grey so it can be tinted per room by multiplying"},
}
# also written under these names (build_blender.MATS["granite"] reads the file "granite_grey")
TEXTURE_ALIASES = {"granite_grey": "granite"}
TEXTURES_MISSING = {"cardboard": "no tileable cardboard texture on Poly Haven; use the cardboard_box_01 model instead"}

# HDRIS: sun_azimuth_deg is the compass direction the sun is IN, measured in the image with
# rotation_deg=0: 0 = +Y (north), 90 = +X (east), 180 = -Y, 270 = -X (west).  With rotation_deg=r the
# sun is at sun_azimuth_deg + r.  Measured on the 2k file (brightest region, Blender's equirect mapping) and
# confirmed with a Cycles shadow test: rotation 325 puts the sun in the west (shadow of a pole points +X).
# overcast: no sun; its brightest (diffuse) region is at azimuth ~81, elevation ~61 with rotation 0.
HDRIS = {
    "rustig_koppie_puresky": {"res": "2k", "use": "main lighting: clear sky with a few clouds, sun about 28 deg high (late afternoon)",
                              "sun_azimuth_deg": 125.0, "sun_elevation_deg": 28.3},
    "overcast_soil_puresky": {"res": "2k", "use": "soft overcast alternative (no visible sun)",
                              "sun_azimuth_deg": None, "sun_elevation_deg": None},
}

# Source files with wrong units (checked against the catalogue's dimensions): uniform scale applied on import.
MODEL_SCALE_FIX = {"steel_frame_shelves_01": 0.1}  # glTF is in decimetres (10.97 m wide); catalogue says 1.10 m

# MODEL_INFO: size = bounding box in metres after normalisation (from `verify`); front = the side that is
# used / seen (seat side of seating, doors/drawers of cabinets, screen of TV/laptop, picture side of frames
# and mirrors, spines of books, foot end of beds, the side the arm/shade reaches for the desk lamp).
# Fronts were checked by eye on 4-side renders. symmetric=True: front is arbitrary (round, open both sides,
# or a prop where it does not matter); tris = triangle count of the imported variant.
MODEL_INFO = {
    "sofa_02": {"size": (1.8072, 0.8178, 0.7095), "front": "-y", "tris": 2728},
    "sofa_03": {"size": (2.7312, 0.9251, 1.1183), "front": "-y", "tris": 8003},
    "modern_arm_chair_01": {"size": (0.8203, 0.9866, 1.0229), "front": "-y", "tris": 8916},
    "mid_century_lounge_chair": {"size": (1.0086, 1.1903, 1.1691), "front": "-y", "tris": 6148},
    "dining_chair_02": {"size": (0.4336, 0.5764, 0.9734), "front": "-y", "tris": 22013},
    "Ottoman_01": {"size": (0.8846, 0.6211, 0.6243), "front": "-y", "tris": 4240, "symmetric": True},
    "plastic_monobloc_chair_01": {"size": (0.6419, 0.6276, 0.8798), "front": "-y", "tris": 3356},
    "bar_chair_round_01": {"size": (0.4832, 0.4860, 0.7505), "front": "-y", "tris": 14373},
    "wooden_stool_01": {"size": (0.4254, 0.4424, 0.4374), "front": "-y", "tris": 10946, "symmetric": True},
    "metal_stool_02": {"size": (0.4481, 0.4731, 0.4581), "front": "-y", "tris": 6532, "symmetric": True},
    "modern_coffee_table_01": {"size": (0.6000, 1.2018, 0.3900), "front": "-x", "tris": 4504},
    "modern_coffee_table_02": {"size": (1.1991, 1.1997, 0.3692), "front": "-y", "tris": 13645, "symmetric": True},
    "coffee_table_round_01": {"size": (1.3013, 1.3013, 0.4910), "front": "-y", "tris": 4044, "symmetric": True},
    "side_table_01": {"size": (0.5500, 0.4500, 0.5507), "front": "-y", "tris": 2756},
    "side_table_tall_01": {"size": (0.3840, 0.3840, 0.7612), "front": "-y", "tris": 6408, "symmetric": True},
    "round_wooden_table_02": {"size": (0.7962, 0.7962, 0.7460), "front": "-y", "tris": 4254, "symmetric": True},
    "modern_wooden_cabinet": {"size": (2.4400, 0.5200, 0.6801), "front": "-y", "tris": 24976},
    "drawer_cabinet": {"size": (1.1411, 0.4881, 1.8813), "front": "-y", "tris": 26406},
    "painted_wooden_nightstand": {"size": (0.5046, 0.5087, 0.6155), "front": "-y", "tris": 470},
    "ClassicNightstand_01": {"size": (0.5678, 0.4242, 0.7000), "front": "-y", "tris": 2002},
    "wooden_display_shelves_01": {"size": (0.3715, 1.0778, 1.5562), "front": "+x", "tris": 3174},
    "metal_office_desk": {"size": (2.0000, 0.9472, 0.7875), "front": "-y", "tris": 6898},
    "steel_frame_shelves_01": {"size": (1.0974, 0.5021, 2.1405), "front": "-y", "tris": 4348, "symmetric": True},
    "steel_frame_shelves_02": {"size": (0.5933, 0.5024, 2.1416), "front": "-y", "tris": 4348, "symmetric": True},
    "steel_frame_shelves_03": {"size": (2.3511, 0.7212, 2.3118), "front": "-y", "tris": 8396},
    "worn_metal_rack": {"size": (0.9154, 0.6000, 1.9000), "front": "-y", "tris": 6372, "symmetric": True},
    "GothicBed_01": {"size": (1.4938, 2.0400, 1.5338), "front": "-y", "tris": 18745},
    "vintage_day_bed": {"size": (1.9726, 0.8548, 1.1273), "front": "-y", "tris": 2715},
    "throw_pillows_01": {"size": (0.9401, 0.4519, 0.4502), "front": "-y", "tris": 6362, "symmetric": True},
    "modern_ceiling_lamp_01": {"size": (0.4316, 0.4317, 0.9516), "front": "-y", "tris": 5602, "symmetric": True},
    "desk_lamp_arm_01": {"size": (0.2017, 0.6139, 0.8926), "front": "+y", "tris": 24102},
    "ceiling_fan": {"size": (1.4629, 1.4629, 0.5163), "front": "-y", "tris": 16356, "symmetric": True},
    "mounted_fluorescent_lights": {"size": (0.9122, 0.6454, 0.0354), "front": "-y", "tris": 17820, "symmetric": True},
    "exterior_aircon_unit": {"size": (1.8000, 0.3742, 0.9279), "front": "-y", "tris": 18986},
    "Television_01": {"size": (0.6000, 0.4708, 0.4568), "front": "-y", "tris": 1918},
    "classic_laptop": {"size": (0.6519, 0.4859, 0.5428), "front": "-y", "tris": 14450},
    "potted_plant_01": {"size": (0.5874, 0.6336, 1.3502), "front": "-y", "tris": 176226, "symmetric": True},
    "potted_plant_02": {"size": (0.7012, 0.6574, 0.8412), "front": "-y", "tris": 69806, "symmetric": True},
    "potted_plant_04": {"size": (0.1679, 0.1848, 0.2675), "front": "-y", "tris": 8929, "symmetric": True},
    "planter_box_01": {"size": (0.9126, 0.4137, 0.4250), "front": "-y", "tris": 8094, "symmetric": True},
    "planter_pot_clay": {"size": (0.2660, 0.2635, 0.2219), "front": "-y", "tris": 3080, "symmetric": True},
    "ceramic_vase_01": {"size": (0.2036, 0.2036, 0.4003), "front": "-y", "tris": 10296, "symmetric": True},
    "ceramic_vase_02": {"size": (0.2184, 0.2184, 0.3092), "front": "-y", "tris": 11128, "symmetric": True},
    "ceramic_vase_03": {"size": (0.1122, 0.1122, 0.4144), "front": "-y", "tris": 11136, "symmetric": True},
    "ceramic_vase_04": {"size": (0.1811, 0.1811, 0.3419), "front": "-y", "tris": 9000, "symmetric": True},
    "brass_vase_01": {"size": (0.2273, 0.2273, 0.6925), "front": "-y", "tris": 21440, "symmetric": True},
    "brass_vase_02": {"size": (0.2102, 0.2102, 0.5286), "front": "-y", "tris": 6890, "symmetric": True},
    "brass_diya_lantern": {"size": (0.1230, 0.1230, 0.3808), "front": "-y", "tris": 12742, "symmetric": True},
    "carved_wooden_elephant": {"size": (0.1092, 0.0576, 0.0962), "front": "-y", "tris": 2752, "symmetric": True},
    "wall_clock": {"size": (0.3205, 0.0472, 0.3205), "front": "-y", "tris": 3658},
    "alarm_clock_01": {"size": (0.1317, 0.0667, 0.1742), "front": "-y", "tris": 8985},
    "ornate_mirror_01": {"size": (0.4865, 0.0260, 0.7442), "front": "-y", "tris": 14246},
    "fancy_picture_frame_01": {"size": (0.6030, 0.0200, 0.4641), "front": "-y", "tris": 938},
    "fancy_picture_frame_02": {"size": (0.6606, 0.0890, 0.7710), "front": "-y", "tris": 35102},
    "hanging_picture_frame_01": {"size": (0.5940, 0.0157, 0.8410), "front": "-y", "tris": 2586},
    "hanging_picture_frame_02": {"size": (0.7518, 0.0331, 0.5000), "front": "-y", "tris": 3678},
    "hanging_picture_frame_03": {"size": (0.3850, 0.0318, 0.5024), "front": "-y", "tris": 24348},
    "standing_picture_frame_01": {"size": (0.1003, 0.2008, 0.2497), "front": "+x", "tris": 1634},
    "standing_picture_frame_02": {"size": (0.1023, 0.2169, 0.2664), "front": "+x", "tris": 2986},
    "book_encyclopedia_set_01": {"size": (0.5513, 0.1631, 0.2374), "front": "-y", "tris": 67306},
    "wicker_basket_01": {"size": (0.3832, 0.2950, 0.1174), "front": "-y", "tris": 22276, "symmetric": True},
    "wicker_basket_02": {"size": (0.3469, 0.2545, 0.2005), "front": "-y", "tris": 17850, "symmetric": True},
    "brass_pot_01": {"size": (0.3019, 0.3017, 0.2909), "front": "-y", "tris": 3760, "symmetric": True},
    "brass_pot_02": {"size": (0.3667, 0.3023, 0.1085), "front": "-y", "tris": 3344, "symmetric": True},
    "brass_pan_01": {"size": (0.1913, 0.4497, 0.0525), "front": "-y", "tris": 4340, "symmetric": True},
    "pot_enamel_01": {"size": (0.2629, 0.1805, 0.1783), "front": "-y", "tris": 11416, "symmetric": True},
    "vintage_electric_kettle": {"size": (0.3209, 0.2486, 0.3047), "front": "-y", "tris": 14838, "symmetric": True},
    "jug_01": {"size": (0.2753, 0.1675, 0.2113), "front": "-y", "tris": 5770, "symmetric": True},
    "metal_jug": {"size": (0.1968, 0.1955, 0.2875), "front": "-y", "tris": 6040, "symmetric": True},
    "tea_set_01": {"size": (0.9185, 0.4839, 0.1650), "front": "-y", "tris": 40296, "symmetric": True},
    "plastic_thermos": {"size": (0.1406, 0.1093, 0.3204), "front": "-y", "tris": 5514, "symmetric": True},
    "wooden_bowl_01": {"size": (0.3131, 0.3091, 0.0937), "front": "-y", "tris": 14122, "symmetric": True},
    "wooden_bowl_02": {"size": (0.1307, 0.1245, 0.0731), "front": "-y", "tris": 4666, "symmetric": True},
    "wooden_spoon": {"size": (0.0867, 0.2776, 0.0251), "front": "-y", "tris": 6576, "symmetric": True},
    "wooden_cutting_board": {"size": (0.4499, 0.2467, 0.0413), "front": "-y", "tris": 3520, "symmetric": True},
    "food_apple_01": {"size": (0.0976, 0.0959, 0.0854), "front": "-y", "tris": 7012, "symmetric": True},
    "bananas": {"size": (0.6000, 0.2441, 0.1788), "front": "-y", "tris": 46868, "symmetric": True},
    "food_pomegranate_01": {"size": (0.1143, 0.1154, 0.1150), "front": "-y", "tris": 8142, "symmetric": True},
    "lemon": {"size": (0.0687, 0.0683, 0.0954), "front": "-y", "tris": 4012, "symmetric": True},
    "food_lime_01": {"size": (0.0601, 0.0613, 0.0754), "front": "-y", "tris": 8100, "symmetric": True},
    "yellow_onion": {"size": (0.0725, 0.0686, 0.0864), "front": "-y", "tris": 5444, "symmetric": True},
    "small_lpg_tank": {"size": (0.4100, 0.4092, 0.6420), "front": "-y", "tris": 15042, "symmetric": True},
    "all_purpose_cleaner": {"size": (0.1568, 0.1174, 0.3197), "front": "-y", "tris": 4624, "symmetric": True},
    "bleach_bottle": {"size": (0.0884, 0.0612, 0.2937), "front": "-y", "tris": 4052, "symmetric": True},
    "multi_cleaner_bottle": {"size": (0.0885, 0.0898, 0.2286), "front": "-y", "tris": 6792, "symmetric": True},
    "plunger": {"size": (0.1721, 0.1721, 0.4211), "front": "-y", "tris": 3278, "symmetric": True},
    "plastic_broom": {"size": (0.4164, 0.5666, 1.1975), "front": "-y", "tris": 18736, "symmetric": True},
    "cardboard_box_01": {"size": (0.3870, 0.5159, 0.3418), "front": "-y", "tris": 16952, "symmetric": True},
    "plastic_crate_01": {"size": (0.2980, 0.4080, 0.2642), "front": "-y", "tris": 18320, "symmetric": True},
    "plastic_crate_02": {"size": (0.5055, 0.4055, 0.2541), "front": "-y", "tris": 5840, "symmetric": True},
    "plastic_crate_03": {"size": (0.4811, 0.2650, 0.2659), "front": "-y", "tris": 21740, "symmetric": True},
    "wooden_crate_01": {"size": (0.8253, 0.4090, 0.3496), "front": "-y", "tris": 6576, "symmetric": True},
    "wooden_crate_02": {"size": (0.5291, 1.1663, 0.4640), "front": "-y", "tris": 5176, "symmetric": True},
    "industrial_pastic_container": {"size": (0.4572, 0.6315, 0.4188), "front": "-y", "tris": 7118, "symmetric": True},
    "plastic_container": {"size": (0.8951, 0.6264, 0.4297), "front": "-y", "tris": 4070, "symmetric": True},
    "hand_truck": {"size": (0.5933, 0.6925, 1.4025), "front": "-y", "tris": 13220},
    "cement_bag": {"size": (0.4625, 0.6996, 0.1799), "front": "-y", "tris": 844, "symmetric": True},
    "compost_bag_02": {"size": (0.5393, 0.4705, 0.4337), "front": "-y", "tris": 12096, "symmetric": True},
    "barrel_03": {"size": (0.6339, 0.6386, 0.9305), "front": "-y", "tris": 1473, "symmetric": True},
    "plastic_jerrycan": {"size": (0.2680, 0.3409, 0.3184), "front": "-y", "tris": 7348, "symmetric": True},
    "wooden_ladder": {"size": (0.9592, 0.5000, 1.3349), "front": "-y", "tris": 8492, "symmetric": True},
    "korean_fire_extinguisher_01": {"size": (0.2800, 0.3674, 0.6593), "front": "-y", "tris": 9913},
    "trashbag": {"size": (0.5281, 0.4629, 0.5750), "front": "-y", "tris": 4482, "symmetric": True},
    "rollershutter_door": {"size": (3.0800, 0.3001, 2.4000), "front": "-y", "tris": 1104},
}


# ====================================================================== fetch (stdlib only) =
def _safe_rel(rel):
    rel = rel.replace("\\", "/")
    parts = [p for p in rel.split("/") if p not in ("", ".")]
    if not parts or any(p == ".." or ":" in p for p in parts) or rel.startswith("/"):
        raise ValueError("unsafe path in download list: %r" % rel)
    return os.path.join(*parts)


def _http(url, dest=None, tries=5):
    """GET with retries + exponential backoff. Returns bytes, or writes to dest (atomic) and returns md5."""
    import urllib.error
    import urllib.request

    if not url.startswith(ALLOWED_HOSTS):
        raise ValueError("refusing to fetch from %s" % url)
    last = None
    for attempt in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=60) as r:
                if dest is None:
                    return r.read()
                os.makedirs(os.path.dirname(dest), exist_ok=True)
                tmp = dest + ".part"
                h = hashlib.md5()
                with open(tmp, "wb") as f:
                    while True:
                        chunk = r.read(1 << 16)
                        if not chunk:
                            break
                        h.update(chunk)
                        f.write(chunk)
                os.replace(tmp, dest)
                return h.hexdigest()
        except urllib.error.HTTPError as e:
            last = e
            if e.code in (400, 401, 403, 404):
                break
        except Exception as e:  # network errors, timeouts, truncated reads
            last = e
        time.sleep(min(30, 1.5 * 2 ** attempt))
    raise RuntimeError("download failed: %s (%s)" % (url, last))


def _md5(path):
    h = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def _files_json(asset_id, refresh=False):
    p = os.path.join(ROOT, "api", asset_id + ".json")
    if os.path.exists(p) and not refresh:
        with open(p) as f:
            return json.load(f)
    data = _http("%s/files/%s" % (API, asset_id))
    js = json.loads(data)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p + ".part", "wb") as f:
        f.write(data)
    os.replace(p + ".part", p)
    return js


TEX_MAPS = (("Diffuse", "diff"), ("nor_gl", "nor_gl"), ("Rough", "rough"))


def model_dir(asset_id):
    return os.path.join(ROOT, "models", asset_id)


def model_gltf_path(asset_id):
    return os.path.join(model_dir(asset_id), "%s_%s.gltf" % (asset_id, MODELS[asset_id]["res"]))


def texture_map_path(tex_id, res, short):
    return os.path.join(ROOT, "textures", tex_id, "%s_%s_%s.jpg" % (tex_id, short, res))


def hdri_path(hdri_id):
    return os.path.join(ROOT, "hdris", "%s_%s.hdr" % (hdri_id, HDRIS[hdri_id]["res"]))


def _wanted(refresh=False):
    """[(dest path, url, size, md5)] for everything in the manifests."""
    out = []
    for aid, m in MODELS.items():
        g = _files_json(aid, refresh)["gltf"][m["res"]]["gltf"]
        out.append((model_gltf_path(aid), g["url"], g["size"], g["md5"]))
        for rel, inc in g.get("include", {}).items():
            out.append((os.path.join(model_dir(aid), _safe_rel(rel)), inc["url"], inc["size"], inc["md5"]))
    seen = set()
    for mat, t in TEXTURES.items():
        if (t["id"], t["res"]) in seen:
            continue
        seen.add((t["id"], t["res"]))
        js = _files_json(t["id"], refresh)
        for key, short in TEX_MAPS:
            f = js[key][t["res"]]["jpg"]
            out.append((texture_map_path(t["id"], t["res"], short), f["url"], f["size"], f["md5"]))
    for hid, h in HDRIS.items():
        f = _files_json(hid, refresh)["hdri"][h["res"]]["hdr"]
        out.append((hdri_path(hid), f["url"], f["size"], f["md5"]))
    return out


def fetch(dry_run=False, refresh=False, workers=6, log=print):
    """Idempotent download of every manifest entry into build/ph/. Returns (n_downloaded, n_skipped, total_bytes)."""
    from concurrent.futures import ThreadPoolExecutor

    ids = list(MODELS) + sorted({t["id"] for t in TEXTURES.values()}) + list(HDRIS)
    with ThreadPoolExecutor(workers) as ex:  # warm the per-asset API cache in parallel
        list(ex.map(lambda a: _files_json(a, refresh), ids))
    want = _wanted()
    total = sum(w[2] for w in want)

    def one(w):
        dest, url, size, md5 = w
        if os.path.exists(dest) and os.path.getsize(dest) == size and _md5(dest) == md5:
            return 0
        if dry_run:
            return 1
        got = _http(url, dest)
        if got != md5 or os.path.getsize(dest) != size:
            os.remove(dest)
            raise RuntimeError("checksum mismatch for %s" % url)
        return 1

    done = skipped = 0
    with ThreadPoolExecutor(workers) as ex:
        for i, r in enumerate(ex.map(one, want)):
            done += r
            skipped += 1 - r
            if r and not dry_run and done % 25 == 0:
                log("  ... %d files downloaded" % done)
    log("%s %d file(s), %d already present; manifest total %.1f MB in %d files -> %s"
        % ("would download" if dry_run else "downloaded", done, skipped, total / 1e6, len(want), ROOT))
    return done, skipped, total


# ====================================================================== textures ===========
def _grade(a, g):
    """a: float32 HxWx3 sRGB 0..1."""
    import numpy as np

    if "sat" in g:
        lum = (a @ np.array([0.299, 0.587, 0.114], np.float32))[..., None]
        a = lum + (a - lum) * g["sat"]
    if "mean" in g:
        a = a * (np.array(g["mean"], np.float32) / a.reshape(-1, 3).mean(0))
    if "gain" in g:
        a = a * g["gain"]
    return np.clip(a, 0, 1)


def _seamless_crop(im, crop):
    """Cut a square (x0, y0, size, blend: fractions of the image) and cross-fade its edges so it tiles."""
    import numpy as np

    a = np.asarray(im).astype(np.float32)
    H, W = a.shape[:2]
    x0, y0, s, b = crop
    L, B = int(round(s * W)), int(round(b * W))
    X, Y = int(round(x0 * W)), int(round(y0 * H))
    a = a[Y:Y + L + B, X:X + L + B].copy()
    w = (np.arange(B, dtype=np.float32) / B)
    wx = w.reshape((1, B) + (1,) * (a.ndim - 2))
    a[:, :B] = a[:, L:L + B] * (1 - wx) + a[:, :B] * wx
    wy = w.reshape((B, 1) + (1,) * (a.ndim - 2))
    a[:B] = a[L:L + B] * (1 - wy) + a[:B] * wy
    from PIL import Image

    return Image.fromarray(np.clip(a[:L, :L], 0, 255).astype(np.uint8))


def write_textures(out_dir, size=2048, quality=90, only=None, log=print):
    """Convert the chosen Poly Haven textures into <mat>.jpg (base colour, sRGB), <mat>_n.jpg (OpenGL normal),
    <mat>_r.jpg (roughness, greyscale) at `size` px, and write out_dir/ph_textures.json. Returns that dict."""
    import numpy as np
    from PIL import Image

    Image.MAX_IMAGE_PIXELS = None
    os.makedirs(out_dir, exist_ok=True)
    info = {}
    names = [(m, m) for m in TEXTURES] + list(TEXTURE_ALIASES.items())
    for name, mat in names:
        if only and name not in only:
            continue
        t = TEXTURES[mat]
        maps = {}
        for _, short in TEX_MAPS:
            p = texture_map_path(t["id"], t["res"], short)
            if not os.path.exists(p):
                raise FileNotFoundError("%s missing - run `python3 ph_assets.py fetch` first" % p)
            im = Image.open(p)
            im = im.convert("L" if short == "rough" else "RGB")
            if "crop" in t:
                im = _seamless_crop(im, t["crop"])
            if im.size != (size, size):
                im = im.resize((size, size), Image.LANCZOS)
            maps[short] = im
        diff = maps["diff"]
        if "grade" in t:
            a = _grade(np.asarray(diff).astype(np.float32) / 255.0, t["grade"])
            diff = Image.fromarray((a * 255 + 0.5).astype(np.uint8))
        if "rough" in t:  # rescale the scanned roughness to a target mean (polished finishes), keeping its variation
            r = np.asarray(maps["rough"]).astype(np.float32)
            maps["rough"] = Image.fromarray(np.clip(r * (t["rough"] * 255.0 / r.mean()), 0, 255).astype(np.uint8))
        diff.save(os.path.join(out_dir, name + ".jpg"), quality=quality)
        maps["nor_gl"].save(os.path.join(out_dir, name + "_n.jpg"), quality=quality)
        maps["rough"].save(os.path.join(out_dir, name + "_r.jpg"), quality=quality)
        info[name] = {
            "tile_m": t["tile_m"],
            "source": t["id"],
            "graded": bool(t.get("grade") or t.get("rough")),
            "rough_mean": round(float(np.asarray(maps["rough"]).mean()) / 255.0, 3),
            "color_mean": [round(float(v) / 255.0, 3) for v in np.asarray(diff).reshape(-1, 3).mean(0)],
        }
        log("tex %-16s <- %-22s tile %.3f m" % (name, t["id"], t["tile_m"]))
    if not only:
        with open(os.path.join(out_dir, "ph_textures.json"), "w") as f:
            json.dump(info, f, indent=1, sort_keys=True)
    return info


# ====================================================================== Blender: models =====
TEMPLATE_COLLECTION = "PH_templates"  # pristine imports live here, not linked to any scene


def _mesh_bounds(objs):
    import numpy as np

    lo, hi = np.full(3, 1e30), np.full(3, -1e30)
    for o in objs:
        n = len(o.data.vertices)
        if not n:
            continue
        co = np.empty(n * 3, np.float32)
        o.data.vertices.foreach_get("co", co)
        co = co.reshape(-1, 3)
        m = np.array(o.matrix_world)
        co = co @ m[:3, :3].T + m[:3, 3]
        lo, hi = np.minimum(lo, co.min(0)), np.maximum(hi, co.max(0))
    return lo, hi


def _build_template(asset_id):
    import bpy
    from mathutils import Matrix

    path = model_gltf_path(asset_id)
    if not os.path.exists(path):
        raise FileNotFoundError("%s missing - run `python3 ph_assets.py fetch` first" % path)
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    bpy.context.view_layer.update()
    meshes = [o for o in new if o.type == "MESH" and len(o.data.vertices)]
    if not meshes:
        raise RuntimeError("no mesh in %s" % path)
    k = MODEL_SCALE_FIX.get(asset_id, 1.0)
    lo, hi = _mesh_bounds(meshes)
    lo, hi = lo * k, hi * k
    shift = Matrix.Translation((-(lo[0] + hi[0]) / 2, -(lo[1] + hi[1]) / 2, -lo[2])) @ Matrix.Scale(k, 4)
    coll = bpy.data.collections.get(TEMPLATE_COLLECTION) or bpy.data.collections.new(TEMPLATE_COLLECTION)
    root = bpy.data.objects.new("PH_TEMPLATE_" + asset_id, None)
    root.empty_display_size = 0.1
    coll.objects.link(root)
    worlds = {o: o.matrix_world.copy() for o in meshes}
    for o in meshes:
        if o.data.users > 1:  # glTF instances: each object needs its own baked copy
            o.data = o.data.copy()
        m = shift @ worlds[o]
        o.parent = None
        for mod in list(o.modifiers):  # rest pose only (rigged props)
            o.modifiers.remove(mod)
        o.data.transform(m)
        if m.determinant() < 0:
            o.data.flip_normals()
        o.data.update()
        o.matrix_world = Matrix.Identity(4)
        for c in list(o.users_collection):
            c.objects.unlink(o)
        coll.objects.link(o)
        o.parent = root
        o.matrix_parent_inverse = Matrix.Identity(4)
        o.name = "PH_TEMPLATE_%s.%s" % (asset_id, o.data.name)
    for o in new:  # empties, armatures, cameras that came with the file
        if o not in worlds:
            bpy.data.objects.remove(o, do_unlink=True)
    for a in list(bpy.data.actions):
        if a.users == 0:
            bpy.data.actions.remove(a)
    root["ph_asset"] = asset_id
    root["ph_template"] = True
    return root


def _template(asset_id):
    import bpy

    t = bpy.data.objects.get("PH_TEMPLATE_" + asset_id)
    if t is None or t.get("ph_asset") != asset_id:
        t = _build_template(asset_id)
    return t


def import_model(asset_id, name=None, collection=None):
    """Import a Poly Haven model and return ONE root Empty at the world origin (identity transform).

    Units metres, Z up, the model rests on z=0 and its bounding box is centred on the origin in X/Y.
    All meshes are direct children of the root with identity transforms (everything is baked into the
    mesh data). Materials are the glTF importer's Principled BSDF with base colour / normal / ARM
    (roughness = G, metallic = B) textures. Calling it again for the same asset returns an independent
    copy that shares mesh data, materials and images with the first (linked duplicate).
    Move / rotate / scale the returned root only. `collection` defaults to the active scene's collection.
    """
    import bpy

    if asset_id not in MODELS:
        raise KeyError("unknown Poly Haven model %r (add it to MODELS and run fetch)" % asset_id)
    tpl = _template(asset_id)
    coll = collection or bpy.context.scene.collection
    root = bpy.data.objects.new(name or asset_id, None)
    root.empty_display_size = 0.1
    coll.objects.link(root)
    root["ph_asset"] = asset_id
    info = MODEL_INFO.get(asset_id)
    if info:
        root["ph_front"] = info["front"]
        root["ph_size"] = list(info["size"])
    for ch in tpl.children:
        c = ch.copy()  # object copy, shares ch.data (mesh) and therefore materials + images
        c.name = "%s.%s" % (root.name, ch.data.name)
        coll.objects.link(c)
        c.parent = root
    return root


def model_meshes(root):
    return [c for c in root.children if c.type == "MESH"]


_FRONT_ANGLE = {"-y": 0.0, "+x": 90.0, "+y": 180.0, "-x": 270.0}


def yaw_to_face(asset_id, direction):
    """Z rotation (radians) for the root so that the model's usable front faces `direction`
    ('+x' | '-x' | '+y' | '-y' in world axes)."""
    return math.radians((_FRONT_ANGLE[direction] - _FRONT_ANGLE[MODEL_INFO[asset_id]["front"]]) % 360)


# ====================================================================== Blender: world ======
def set_world_hdri(hdri_id, strength=1.0, rotation_deg=0):
    """Build the world node tree: Texture Coordinate -> Mapping (Z rotation) -> Environment Texture ->
    Background(strength) -> World Output. Returns the world. With rotation_deg = r the sun stands at
    compass azimuth HDRIS[hdri_id]['sun_azimuth_deg'] + r (0 = +Y north, 90 = +X east, 270 = -X west)."""
    import bpy

    path = hdri_path(hdri_id)
    if not os.path.exists(path):
        raise FileNotFoundError("%s missing - run `python3 ph_assets.py fetch` first" % path)
    scene = bpy.context.scene
    world = scene.world or bpy.data.worlds.new("World")
    scene.world = world
    world.use_nodes = True
    nt = world.node_tree
    nt.nodes.clear()
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.vector_type = "POINT"
    mp.inputs["Rotation"].default_value = (0.0, 0.0, math.radians(rotation_deg))
    env = nt.nodes.new("ShaderNodeTexEnvironment")
    env.image = bpy.data.images.load(path, check_existing=True)
    bg = nt.nodes.new("ShaderNodeBackground")
    bg.inputs["Strength"].default_value = strength
    out = nt.nodes.new("ShaderNodeOutputWorld")
    for i, n in enumerate((tc, mp, env, bg, out)):
        n.location = (i * 220 - 440, 0)
    nt.links.new(tc.outputs["Generated"], mp.inputs["Vector"])
    nt.links.new(mp.outputs["Vector"], env.inputs["Vector"])
    nt.links.new(env.outputs["Color"], bg.inputs["Color"])
    nt.links.new(bg.outputs["Background"], out.inputs["Surface"])
    world["ph_hdri"] = hdri_id
    return world


def hdri_rotation_for_sun(hdri_id, azimuth_deg):
    """rotation_deg that puts the HDRI's sun at compass azimuth `azimuth_deg` (270 = shining from the west / -X)."""
    az = HDRIS[hdri_id]["sun_azimuth_deg"]
    if az is None:
        return 0.0
    return (azimuth_deg - az) % 360


# ====================================================================== verify / contact sheet
def _reset_scene():
    import bpy

    bpy.ops.wm.read_factory_settings(use_empty=True)
    return bpy.context.scene


def _tri_count(root):
    n = 0
    for o in model_meshes(root):
        o.data.calc_loop_triangles()
        n += len(o.data.loop_triangles)
    return n


def _gltf_flat_materials(asset_id):
    """Names of materials that have NO baseColorTexture in the source glTF (glass, screens: flat colour by design)."""
    with open(model_gltf_path(asset_id)) as f:
        g = json.load(f)
    return {m.get("name", "") for m in g.get("materials", [])
            if "baseColorTexture" not in m.get("pbrMetallicRoughness", {})}


def _material_report(root):
    """(n_materials, [names without a base colour image], [names that are flat colour in the source too])"""
    flat_src = _gltf_flat_materials(root["ph_asset"])
    mats, bad, flat = set(), [], []
    for o in model_meshes(root):
        for s in o.material_slots:
            m = s.material
            if m is None or m.name in mats:
                continue
            mats.add(m.name)
            ok = False
            if m.use_nodes:
                for n in m.node_tree.nodes:
                    if n.type == "BSDF_PRINCIPLED":
                        for l in n.inputs["Base Color"].links:
                            src = l.from_node
                            while src.type not in ("TEX_IMAGE",) and src.inputs and any(i.links for i in src.inputs):
                                src = next(i.links[0].from_node for i in src.inputs if i.links)
                            ok = src.type == "TEX_IMAGE" and src.image is not None and src.image.size[0] > 0
            if not ok:
                (flat if m.name.split(".")[0] in flat_src else bad).append(m.name)
    return len(mats), bad, flat


def verify(log=print):
    """Import every model in one Blender session and check the conventions. Returns {id: info}."""
    import bpy
    import numpy as np

    _reset_scene()
    out, problems = {}, []
    log("%-30s %-22s %7s %5s %s" % ("id", "size m (x, y, z)", "tris", "mats", "notes"))
    for aid in MODELS:
        root = import_model(aid)
        bpy.context.view_layer.update()
        meshes = model_meshes(root)
        lo, hi = _mesh_bounds(meshes)
        size = tuple(round(float(v), 4) for v in (hi - lo))
        notes = []
        if abs(lo[2]) > 1e-4:
            notes.append("min z %.5f" % lo[2])
        if abs(lo[0] + hi[0]) > 2e-4 or abs(lo[1] + hi[1]) > 2e-4:
            notes.append("not centred")
        if any(np.abs(np.array(o.matrix_world) - np.eye(4)).max() > 1e-6 for o in [root] + meshes):
            notes.append("non-identity transform")
        if any(o.parent is not root for o in meshes):
            notes.append("bad parent")
        nm, bad, flat = _material_report(root)
        if bad:
            notes.append("no base-colour image: " + ",".join(bad))
        flat_note = (" (flat-colour in source, by design: %s)" % ",".join(flat)) if flat else ""
        info = MODEL_INFO.get(aid)
        if info is None:
            notes.append("no MODEL_INFO")
        elif max(abs(a - b) for a, b in zip(info["size"], size)) > 1e-3:
            notes.append("MODEL_INFO size %s != %s" % (info["size"], size))
        # second import must be a linked duplicate
        r2 = import_model(aid, aid + "_copy")
        m2 = model_meshes(r2)
        if r2 is root or {o.data for o in m2} != {o.data for o in meshes} or any(a is b for a in m2 for b in meshes):
            notes.append("copy not a linked duplicate")
        for o in m2 + [r2]:
            bpy.data.objects.remove(o, do_unlink=True)
        tris = _tri_count(root)
        out[aid] = {"size": size, "tris": tris, "meshes": len(meshes), "mats": nm}
        log("%-30s %-22s %7d %5d %s%s" % (aid, "%.3f %.3f %.3f" % size, tris, nm, "; ".join(notes) or "ok", flat_note))
        if notes:
            problems.append(aid)
    for hid in HDRIS:
        set_world_hdri(hid, 1.0, 30)
    log("set_world_hdri ok for %s" % ", ".join(HDRIS))
    log("%d models, %d with notes: %s" % (len(out), len(problems), ", ".join(problems) or "-"))
    return out


def contact_sheet(out_path=None, thumb=(320, 240), samples=12, ids=None, cols=6, log=print):
    """Small Cycles thumbnails (camera looks from the model's -Y side, slightly right and above; the
    red bar on the floor marks the model's -Y edge) of every model, assembled with labels."""
    import bpy
    from mathutils import Vector
    from PIL import Image, ImageDraw

    out_path = out_path or os.path.join(ROOT, "contact_models.jpg")
    tmp = os.path.join(ROOT, "_thumbs")
    os.makedirs(tmp, exist_ok=True)
    ids = list(ids or MODELS)
    scene = _reset_scene()
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    scene.cycles.max_bounces = 3
    scene.render.threads_mode = "FIXED"
    scene.render.threads = 3
    scene.render.resolution_x, scene.render.resolution_y = thumb
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "JPEG"
    scene.render.image_settings.quality = 90
    scene.view_settings.view_transform = "Standard"
    set_world_hdri("overcast_soil_puresky", 1.0, 0)
    sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN"))
    sun.data.energy = 2.5
    sun.data.angle = math.radians(8)
    sun.rotation_euler = (math.radians(50), 0, math.radians(-35))
    scene.collection.objects.link(sun)
    fm = bpy.data.meshes.new("floor")
    fm.from_pydata([(-30, -30, 0), (30, -30, 0), (30, 30, 0), (-30, 30, 0)], [], [(0, 1, 2, 3)])
    floor = bpy.data.objects.new("floor", fm)
    mat = bpy.data.materials.new("floor")
    mat.use_nodes = True
    mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.62, 0.62, 0.62, 1)
    fm.materials.append(mat)
    scene.collection.objects.link(floor)
    red = bpy.data.materials.new("red")
    red.use_nodes = True
    red.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.9, 0.05, 0.05, 1)
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    cam.data.lens = 60
    scene.collection.objects.link(cam)
    scene.camera = cam
    files = []
    for aid in ids:
        root = import_model(aid)
        bpy.context.view_layer.update()
        lo, hi = _mesh_bounds(model_meshes(root))
        sx, sy, sz = (float(v) for v in (hi - lo))
        bm = bpy.data.meshes.new("bar")
        w = max(sx, 0.05) / 2
        t = max(sx, sy, sz) * 0.012
        y = -sy / 2 - 3 * t
        bm.from_pydata([(-w, y - t, 0.001), (w, y - t, 0.001), (w, y + t, 0.001), (-w, y + t, 0.001)], [], [(0, 1, 2, 3)])
        bm.materials.append(red)
        bar = bpy.data.objects.new("bar", bm)
        scene.collection.objects.link(bar)
        centre = Vector((0, 0, sz / 2))
        r = math.sqrt(sx * sx + sy * sy + sz * sz) / 2
        d = Vector((0.5, -1.0, 0.55)).normalized()
        fov = 2 * math.atan(min(36.0, 36.0 * thumb[1] / thumb[0]) / 2 / cam.data.lens)
        cam.location = centre + d * (r / math.sin(fov / 2) * 1.02)
        cam.rotation_euler = (centre - cam.location).to_track_quat("-Z", "Y").to_euler()
        cam.data.clip_start = 0.01
        f = os.path.join(tmp, aid + ".jpg")
        scene.render.filepath = f
        t0 = time.time()
        bpy.ops.render.render(write_still=True)
        log("thumb %-30s %.1fs" % (aid, time.time() - t0))
        files.append((aid, f))
        for o in model_meshes(root) + [root, bar]:
            bpy.data.objects.remove(o, do_unlink=True)
    rows = (len(files) + cols - 1) // cols
    W, Hh = thumb[0], thumb[1] + 16
    sheet = Image.new("RGB", (cols * W, rows * Hh), "white")
    dr = ImageDraw.Draw(sheet)
    for i, (aid, f) in enumerate(files):
        x, y = (i % cols) * W, (i // cols) * Hh
        sheet.paste(Image.open(f), (x, y + 16))
        info = MODEL_INFO.get(aid)
        label = aid if not info else "%s  %.2fx%.2fx%.2f  front %s" % ((aid,) + tuple(info["size"]) + (info["front"],))
        dr.text((x + 3, y + 2), label, fill="black")
    sheet.save(out_path, quality=88)
    log("contact sheet -> %s (%d models; view is from the -Y side, red bar = -Y edge)" % (out_path, len(files)))
    return out_path


def _main(argv):
    cmd = argv[1] if len(argv) > 1 else "help"
    if cmd == "fetch":
        fetch(dry_run="--dry-run" in argv, refresh="--refresh" in argv)
    elif cmd == "textures":
        write_textures(argv[2] if len(argv) > 2 else os.path.join(HERE, "build", "textures"))
    elif cmd == "list":
        for title, d in (("MODELS", MODELS), ("TEXTURES", TEXTURES), ("HDRIS", HDRIS)):
            print("== %s (%d)" % (title, len(d)))
            for k, v in d.items():
                print("  %-30s %s" % (k, json.dumps(v)))
    elif cmd == "verify":
        verify()
    elif cmd == "contact":
        contact_sheet(argv[2] if len(argv) > 2 else None)
    else:
        print(__doc__)


if __name__ == "__main__":
    _main(sys.argv)
