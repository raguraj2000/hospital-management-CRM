"""Assemble the texture folder used by build_blender.py.

  build/tex_final/  2048 px: procedural textures (textures.py) overridden by the Poly Haven
                    scans (ph_assets.write_textures), plus per-room tinted plaster for the paints.
  build/tex_web/    the same at 1024 px, swapped in before the GLB export to keep the web model small.

    python3 tools/prep_textures.py
"""
import json
import os
import shutil
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, HERE)
BUILD = os.path.join(HERE, "build")
PROC, PH, FINAL, WEB = (os.path.join(BUILD, d) for d in ("tex_proc", "ph/textures_out", "tex_final", "tex_web"))

# interior paint colours (linear-ish sRGB multipliers on the neutral plaster scan, mean ~0.90)
PAINTS = {
    "paint_warm": (0.93, 0.89, 0.82), "paint_sage": (0.80, 0.83, 0.75), "paint_cream": (0.95, 0.91, 0.82),
    "paint_grey": (0.87, 0.87, 0.85), "paint_store": (0.91, 0.91, 0.89), "paint_ceiling": (0.97, 0.97, 0.96),
}


def main():
    if not os.path.isdir(PROC) or not os.listdir(PROC):
        import textures
        textures.build(PROC)
    os.makedirs(FINAL, exist_ok=True)
    for f in os.listdir(PROC):
        shutil.copy(os.path.join(PROC, f), os.path.join(FINAL, f))
    tiles = {}
    if os.path.isdir(PH):
        meta = json.load(open(os.path.join(PH, "ph_textures.json")))
        for f in os.listdir(PH):
            if f.endswith(".jpg"):
                shutil.copy(os.path.join(PH, f), os.path.join(FINAL, f))
        tiles = {k: v["tile_m"] for k, v in meta.items()}
        if "plaster" in meta:
            base = np.asarray(Image.open(os.path.join(PH, "plaster.jpg")).convert("RGB")).astype(np.float32)
            base = base / max(base.mean(), 1.0)                          # mean -> 1.0
            for name, tint in PAINTS.items():
                img = np.clip(base * np.array(tint) * 255.0, 0, 255).astype(np.uint8)
                Image.fromarray(img).save(os.path.join(FINAL, name + ".jpg"), quality=90)
                for sfx in ("_n", "_r"):
                    src = os.path.join(PH, "plaster" + sfx + ".jpg")
                    if os.path.exists(src):
                        shutil.copy(src, os.path.join(FINAL, name + sfx + ".jpg"))
                tiles[name] = meta["plaster"]["tile_m"]
    # Indian floor tiles are 60-80 cm: the scans' tiles are ~45 cm, so stretch the repeat
    for k, f in (("vitrified", 1.4), ("kota", 1.5)):
        if k in tiles:
            tiles[k] = round(tiles[k] * f, 3)
    json.dump(tiles, open(os.path.join(FINAL, "tiles.json"), "w"), indent=1)
    os.makedirs(WEB, exist_ok=True)
    for f in os.listdir(FINAL):
        src, dst = os.path.join(FINAL, f), os.path.join(WEB, f)
        if f.endswith(".jpg"):
            im = Image.open(src)
            if im.size[0] > 1024:
                im = im.resize((1024, 1024 * im.size[1] // im.size[0]), Image.LANCZOS)
            im.save(dst, quality=85)
        else:
            shutil.copy(src, dst)
    print("textures:", len(os.listdir(FINAL)), "files;", "ph tiles:", tiles)


if __name__ == "__main__":
    main()
