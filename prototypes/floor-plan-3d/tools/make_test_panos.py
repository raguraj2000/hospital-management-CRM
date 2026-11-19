"""Placeholder 360-degree panoramas for testing the viewer's Photo mode (no Blender needed).

    python3 tools/make_test_panos.py                 # the default six ids, skipping files that already exist
    python3 tools/make_test_panos.py store1 kitchen  # chosen ids
    python3 tools/make_test_panos.py --all --force   # every pano in plan.py, overwriting the placeholders

Writes build/test_pano/<id>.jpg (equirectangular, 2:1), NOT viewer/pano: the real renders live there, and a
placeholder in viewer/pano would also make `build_blender.py --skip_existing 1` skip that spot's real render.
tools/test_photo_mode.mjs serves this folder as /pano/ (PANO_DIR, see serve.mjs). The images follow the contract
in plan.py / viewer/src/pano.js:
the image centre looks NORTH, moving right turns toward EAST, the left/right edges are SOUTH, the top is up.
Each image has a 15-degree lat/long grid, compass letters at their longitudes, the pano id, its own colour, and a
cross + id at the spot where every other pano's floor point should appear (the viewer's floor rings must land on them).
"""
import math
import os
import sys

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import plan  # noqa: E402

OUT = os.path.join(os.path.dirname(HERE), "build", "test_pano")
DEFAULT = ["entrance", "hall_south", "hall_mid", "hall_living", "bedroom", "store2"]
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
COLOURS = [(196, 86, 72), (70, 130, 180), (86, 160, 96), (214, 160, 60), (140, 100, 180), (60, 160, 160),
           (200, 110, 150), (120, 140, 70), (180, 120, 80), (90, 110, 200), (160, 160, 90), (100, 170, 130),
           (170, 90, 110), (110, 120, 140)]


def font(size):
    try:
        return ImageFont.truetype(FONT, size)
    except OSError:
        return ImageFont.load_default()


def make(index, pid, u, v, w=4096):
    h = w // 2
    base = COLOURS[index % len(COLOURS)]
    img = Image.new("RGB", (w, h))
    d = ImageDraw.Draw(img)
    # sky-ish upper half, floor-ish lower half, both tinted with the pano's colour
    for y in range(h):
        lat = 90 - 180 * y / h
        k = 0.95 - 0.35 * abs(lat) / 90 if lat >= 0 else 0.55 - 0.25 * abs(lat) / 90
        d.line([(0, y), (w, y)], fill=tuple(int(c * k + (255 if lat >= 0 else 40) * (1 - k) * 0.5) for c in base))

    def px(bearing_deg, lat_deg):       # bearing clockwise from north -> image x (centre = north)
        return ((bearing_deg / 360.0 + 0.5) % 1.0) * w, (0.5 - lat_deg / 180.0) * h

    def text(xy, s, size, fill=(255, 255, 255)):
        f = font(size)
        for dx in (-w, 0, w):           # wrap across the south seam
            d.text((xy[0] + dx, xy[1]), s, font=f, fill=fill, anchor="mm", stroke_width=max(2, size // 16),
                   stroke_fill=(0, 0, 0))

    for b in range(-180, 180, 15):
        x, _ = px(b, 0)
        d.line([(x, 0), (x, h)], fill=(255, 255, 255) if b % 90 == 0 else (0, 0, 0), width=5 if b % 90 == 0 else 1)
        if b % 45:
            text(px(b, 4), f"{b % 360}", w // 110)
    for lat in range(-75, 90, 15):
        _, y = px(0, lat)
        d.line([(0, y), (w, y)], fill=(255, 255, 255) if lat == 0 else (0, 0, 0), width=5 if lat == 0 else 1)
        text((w * 0.03, y - h * 0.012), f"{lat:+d}", w // 130)
    for name, b in (("N", 0), ("E", 90), ("S", 180), ("W", 270)):
        text(px(b, 17), name, w // 16)
    for name, b in (("NE", 45), ("SE", 135), ("SW", 225), ("NW", 315)):
        text(px(b, 18), name, w // 28)
        text(px(b, 40), pid, w // 34, fill=(255, 240, 150))
    text(px(0, 48), pid, w // 22, fill=(255, 240, 150))
    for b in (0, 90, 180, 270):
        text(px(b, 72), "UP", w // 40)
        text(px(b, -72), "DOWN", w // 40)

    # where the other panos' floor points appear from here: bearing from plan (north = -u, east = -v)
    for oid, ou, ov, _label, _room in plan.PANOS:
        if oid == pid:
            continue
        north, east = u - ou, v - ov
        dist = math.hypot(north, east)
        if dist > 30:
            continue
        x, y = px(math.degrees(math.atan2(east, north)), -math.degrees(math.atan2(plan.PANO_EYE, dist)))
        r = w // 200
        for dx in (-w, 0, w):
            d.line([(x + dx - r, y), (x + dx + r, y)], fill=(255, 255, 0), width=5)
            d.line([(x + dx, y - r), (x + dx, y + r)], fill=(255, 255, 0), width=5)
        text((x, y + r * 2.2), oid, w // 150, fill=(255, 255, 0))
    return img


def main(argv):
    force = "--force" in argv
    ids = [a for a in argv if not a.startswith("--")] or DEFAULT
    if "--all" in argv:
        ids = [p[0] for p in plan.PANOS]
    width = next((int(a.split("=")[1]) for a in argv if a.startswith("--width=")), 4096)
    known = {p[0]: (i, p) for i, p in enumerate(plan.PANOS)}
    os.makedirs(OUT, exist_ok=True)
    for pid in ids:
        if pid not in known:
            sys.exit(f"unknown pano id {pid!r}; known: {', '.join(known)}")
        path = os.path.join(OUT, f"{pid}.jpg")
        if os.path.exists(path) and not force:
            print("skip (exists, use --force to overwrite)", path)
            continue
        i, (_, u, v, _label, _room) = known[pid]
        make(i, pid, u, v, width).save(path, quality=88)
        print("wrote", path)


if __name__ == "__main__":
    main(sys.argv[1:])
