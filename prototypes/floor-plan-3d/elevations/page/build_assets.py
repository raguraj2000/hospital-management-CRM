"""Copies the sheets and renders from ../out into page/elev/ with 2400 px previews, for the elevations page:

    python3 elevations/page/build_assets.py      (then serve elevations/page/ or publish index.html with elev/)
"""
import os
import shutil

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(os.path.dirname(HERE), "out")
DST = os.path.join(HERE, "elev")                  # ignored by git: rebuilt from out/
os.makedirs(DST, exist_ok=True)
for f in ["south", "west", "north", "east"]:
    shutil.copy2(os.path.join(SRC, f"{f}_drawing.png"), os.path.join(DST, f"{f}_drawing.png"))
    shutil.copy2(os.path.join(SRC, f"{f}_render.jpg"), os.path.join(DST, f"{f}_render.jpg"))
    for m, ext in (("drawing", "png"), ("render", "jpg")):
        im = Image.open(os.path.join(SRC, f"{f}_{m}.{ext}")).convert("RGB")
        im.resize((2400, round(2400 * im.height / im.width)), Image.LANCZOS).save(
            os.path.join(DST, f"{f}_{m}_s.jpg"), quality=88, optimize=True)
total = sum(os.path.getsize(os.path.join(DST, n)) for n in os.listdir(DST))
print(f"{len(os.listdir(DST))} files, {total / 1e6:.1f} MB in {DST}")
