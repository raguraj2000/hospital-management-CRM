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
    ph.set_world_hdri("rustig_koppie_puresky", 1.0, ph.hdri_rotation_for_sun("rustig_koppie_puresky", 270))

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
    "sofa_03": {"res": _H, "use": "3-seat fabric sofa, main hall hero piece"},
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
    "modern_coffee_table_02": {"res": _H, "use": "round modern coffee table"},
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
# sun is at sun_azimuth_deg + r.  Values are filled from the downloaded 2k files (see `verify`).
HDRIS = {
    "rustig_koppie_puresky": {"res": "2k", "use": "main lighting: clear sky with a few clouds, sun about 28 deg high (late afternoon)",
                              "sun_azimuth_deg": 305.0, "sun_elevation_deg": 28.3},
    "overcast_soil_puresky": {"res": "2k", "use": "soft overcast alternative (no visible sun)",
                              "sun_azimuth_deg": None, "sun_elevation_deg": None},
}

# MODEL_INFO: filled in below (generated by `verify`, fronts checked by eye on renders).
MODEL_INFO = {}


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
    lo, hi = _mesh_bounds(meshes)
    shift = Matrix.Translation((-(lo[0] + hi[0]) / 2, -(lo[1] + hi[1]) / 2, -lo[2]))
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


def _material_report(root):
    """(n_materials, [names without a base colour image])"""
    mats, bad = set(), []
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
                bad.append(m.name)
    return len(mats), bad


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
        nm, bad = _material_report(root)
        if bad:
            notes.append("no base-colour image: " + ",".join(bad))
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
        log("%-30s %-22s %7d %5d %s" % (aid, "%.3f %.3f %.3f" % size, tris, nm, "; ".join(notes) or "ok"))
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
