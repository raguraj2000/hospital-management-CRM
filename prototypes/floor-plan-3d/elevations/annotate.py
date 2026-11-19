"""Turns the elevation passes from render_elevations.py into finished sheets (plain Python 3 + Pillow + numpy):

    python3 elevations/annotate.py

  out/<face>_drawing.png         architectural elevation: line work, light colour wash, shutter and glass hatches,
                                 ground line, levels, floor brackets, opening tags, dimension chains, key plan,
                                 scale bar and the list of assumed heights
  out/<face>_render.jpg          the path-traced elevation on a soft sky, with the same title
  out/first_floor_elevations.pdf the four drawings, one A3-landscape page each

Everything measured comes from plan.py (openings, sills, heads, parapets, ceiling, slab, ground level), placed through
the camera mapping in out/frames.json, so the sheets agree with the 3D model and the viewer.
"""
import json
import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
sys.path.insert(0, os.path.dirname(HERE))
import plan as P  # noqa: E402

FONT_DIR = "/usr/share/fonts/truetype/dejavu"
INK = (28, 31, 36)
MUTED = (110, 116, 124)
ACCENT = (196, 98, 45)          # terracotta: tags, key-plan face
GLASS = (196, 222, 236)
FACE_ORDER = ["south", "west", "north", "east"]
SIDES = {"south": ("west", "east"), "north": ("east", "west"), "west": ("north", "south"), "east": ("south", "north")}


def font(size, bold=False):
    return ImageFont.truetype(os.path.join(FONT_DIR, "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"), int(size))


def fi(ft, sign=False):
    """Feet to feet-inches, to the nearest half inch: 10'-6", 2'-4½"."""
    neg = ft < -1e-6
    half = round(abs(ft) * 24)
    f, rest = divmod(half, 24)
    i, h = divmod(rest, 2)
    s = f"{f}'-{i}{'½' if h else ''}\""
    if sign:
        s = ("−" if neg else "±" if half == 0 else "+") + s
    elif neg:
        s = "−" + s
    return s


def face_openings(face):
    """Openings in the outer walls seen from this face: (kind, a0, a1, sill, head, wall id), a along the face axis."""
    out = []
    for w in P.W:
        if w["kind"] != "ext":
            continue
        u0, u1, v0, v1 = w["rect"]
        run_u = (u1 - u0) >= (v1 - v0)
        side = (("east" if (v0 + v1) / 2 < 21.75 else "west") if run_u
                else ("north" if (u0 + u1) / 2 < 21.75 else "south"))
        if side != face:
            continue
        for typ, a0, a1, sill, head, ex in w["openings"]:
            out.append((typ, a0, a1, sill, head, w["id"], ex))
    return out


class Sheet:
    def __init__(self, frame):
        self.f = frame
        W, H = frame["width"], frame["height"]
        self.s = s = W / 3840
        self.L, self.R, self.T, self.B = int(150 * s), int(820 * s), int(360 * s), int(620 * s)
        self.ppf = abs(frame["x_per_ft"])

    def x(self, a):
        return self.L + self.f["x_at_0"] + self.f["x_per_ft"] * a

    def y(self, z):
        return self.T + self.f["y_at_0"] + self.f["y_per_ft"] * z

    def size(self):
        return self.f["width"] + self.L + self.R, self.f["height"] + self.T + self.B


def text(d, xy, s, f, fill=INK, anchor="la", box=None):
    if box:
        l, t, r, b = d.textbbox(xy, s, font=f, anchor=anchor)
        p = box
        d.rounded_rectangle((l - p, t - p, r + p, b + p), radius=p, fill=(255, 255, 255))
    d.text(xy, s, font=f, fill=fill, anchor=anchor)


def dashed(d, x0, y, x1, fill, w, dash, gap):
    x = x0
    while x < x1:
        d.line((x, y, min(x + dash, x1), y), fill=fill, width=w)
        x += dash + gap


def hatch(canvas_rgb, mask, step, angle, colour, width):
    """Parallel lines (angle in degrees, 0 = horizontal) drawn only where mask is set."""
    H, W = mask.shape
    layer = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(layer)
    if angle == 0:
        y = 0.0
        while y < H:
            d.line((0, y, W, y), fill=255, width=width)
            y += step
    else:
        t = math.tan(math.radians(angle))
        c = -H * abs(t)
        while c < W + H * abs(t):
            d.line((c, H, c + H * t, 0), fill=255, width=width)
            c += step / math.cos(math.radians(angle))
    a = (np.asarray(layer) > 0) & mask
    canvas_rgb[a] = colour


def draw_drawing(face, frame):
    sh = Sheet(frame)
    s = sh.s
    W, H = frame["width"], frame["height"]
    CW, CH = sh.size()
    lines = np.asarray(Image.open(os.path.join(OUT, f"{face}_lines.png")).convert("L"), np.float32) / 255
    alb = np.asarray(Image.open(os.path.join(OUT, f"{face}_albedo.png")).convert("RGB"), np.float32) / 255
    fg = np.asarray(Image.open(os.path.join(OUT, f"{face}_mask.png")).convert("L"), np.float32) / 255
    mid = np.asarray(Image.open(os.path.join(OUT, f"{face}_matid.png")).convert("L"))
    if mid.shape != fg.shape:
        mid = np.asarray(Image.fromarray(mid).resize((W, H), Image.NEAREST))

    # colour wash: 40% of the surface colour over white, glass a pale blue; sky stays white
    wash = 1 - 0.4 * (1 - alb)
    wash[mid == 2] = np.array(GLASS) / 255
    img = np.ones((H, W, 3), np.float32)
    img = img * (1 - fg[..., None]) + wash * fg[..., None]
    rgb = (img * 255).astype(np.uint8)
    hatch(rgb, (mid == 1) & (fg > 0.5), 0.25 * sh.ppf, 0, (150, 156, 164), max(1, int(1.2 * s)))    # shutter slats
    hatch(rgb, (mid == 2) & (fg > 0.5), 1.1 * sh.ppf, 55, (255, 255, 255), max(1, int(2 * s)))      # glass glints
    rgb = (rgb.astype(np.float32) * lines[..., None]).astype(np.uint8)                                 # ink on top

    sheet = Image.new("RGB", (CW, CH), (255, 255, 255))
    sheet.paste(Image.fromarray(rgb), (sh.L, sh.T))
    d = ImageDraw.Draw(sheet)
    f_s, f_m, f_l, f_xl = font(26 * s), font(31 * s), font(40 * s, True), font(78 * s, True)
    f_tag = font(25 * s, True)

    # ground: heavy ground line across the drawing and an earth band below it
    gy = sh.y(P.GROUND)
    gx0, gx1 = sh.L + 20 * s, sh.L + W - 20 * s
    for k in range(0, int((gx1 - gx0) / (22 * s)) + 1):
        x = gx0 + k * 22 * s
        d.line((x, gy + 8 * s, x - 18 * s, gy + 34 * s), fill=(150, 140, 125), width=max(1, int(2 * s)))
    d.rectangle((gx0, gy + 34 * s, gx1, gy + 40 * s), fill=(255, 255, 255))
    d.line((gx0, gy, gx1, gy), fill=INK, width=max(3, int(7 * s)))

    ops = face_openings(face)
    xs = sorted([sh.x(0.0), sh.x(43.5)])
    bx0, bx1 = xs

    # levels (z relative to the first-floor finished floor), labelled in a column right of the drawing
    levels = [(P.GROUND, "Ground level (assumed)", True), (0.0, "First floor FFL", True),
              (P.PARAPET, "Parapet top", False), (P.CEIL, "Ceiling", False),
              (P.CEIL + P.SLAB, "Roof slab top / 2nd floor FFL", True),
              (P.CEIL + P.SLAB + 8.5, "Stair head room top (2nd floor not shown)", False)]
    seen = {round(z, 3) for z, _, _ in levels}
    for typ, a0, a1, sill, head, wid, ex in ops:
        name = {"window": "window", "vent": "ventilator", "door": "door", "shutter": "shutter"}[typ]
        for z, what in ((sill, f"{name} sill"), (head, f"{name} head")):
            if z <= 0.01:
                continue
            key = round(z, 3)
            if key in seen:
                for i, (lz, lab, major) in enumerate(levels):
                    if round(lz, 3) == key and what.lower() not in lab.lower():
                        levels[i] = (lz, lab + " / " + what, major)
            else:
                seen.add(key)
                levels.append((z, what[0].upper() + what[1:], False))
    levels.sort(key=lambda t: -t[0])
    col_x = sh.L + W + 40 * s
    min_gap = 46 * s
    placed = []
    for z, lab, major in levels:
        yl = sh.y(z)
        ty = yl if not placed else max(yl, placed[-1] + min_gap)
        placed.append(ty)
        if major:
            dashed(d, bx0 - 30 * s, yl, col_x, (150, 156, 164), max(1, int(2 * s)), 16 * s, 10 * s)
        else:
            d.line((bx1 + 10 * s, yl, col_x, yl), fill=(150, 156, 164), width=max(1, int(2 * s)))
        # level mark: small triangle on the line, leader to the label
        tx = col_x + 22 * s
        d.polygon([(col_x, yl), (col_x + 16 * s, yl - 18 * s), (col_x - 16 * s, yl - 18 * s)],
                  outline=INK, fill=(255, 255, 255) if not major else INK)
        if abs(ty - yl) > 1:
            d.line((col_x + 16 * s, yl, tx, ty), fill=MUTED, width=max(1, int(s)))
        text(d, (tx + 6 * s, ty), fi(z, sign=True), font(29 * s, True) if major else f_m, anchor="lm")
        text(d, (tx + 175 * s, ty), lab, f_s, fill=MUTED, anchor="lm")

    # floor brackets on the left
    def bracket(z0, z1, label, colour):
        y0, y1 = sh.y(z1), sh.y(z0)
        x = sh.L - 60 * s
        d.line((x, y0, x, y1), fill=colour, width=max(2, int(3 * s)))
        for yy in (y0, y1):
            d.line((x, yy, x + 22 * s, yy), fill=colour, width=max(2, int(3 * s)))
        lab = Image.new("RGBA", (int((y1 - y0)), int(44 * s)), (255, 255, 255, 0))
        ImageDraw.Draw(lab).text((lab.width / 2, lab.height / 2), label, font=font(27 * s, True), fill=colour,
                                 anchor="mm")
        lab = lab.rotate(90, expand=True)
        sheet.paste(lab, (int(x - 50 * s), int(y0)), lab)
    bracket(0.0, P.CEIL + P.SLAB, "FIRST FLOOR (this drawing)", INK)
    bracket(P.GROUND, 0.0, "GROUND FLOOR (context, assumed)", MUTED)

    # opening tags
    counters = {}
    tags = []
    for typ, a0, a1, sill, head, wid, ex in sorted(ops, key=lambda o: sh.x((o[1] + o[2]) / 2)):
        code = {"window": "W", "vent": "V", "door": "D", "shutter": "RS"}[typ]
        counters[code] = counters.get(code, 0) + 1
        tag = f"{code}{counters[code]}"
        size = f"{fi(a1 - a0)} × {fi(head - sill)}"
        extra = " main door" if ex.get("leaf") == "main" else ""
        zt = max((sill + head) / 2, P.PARAPET + 1.0)
        cx, cy = sh.x((a0 + a1) / 2), sh.y(zt)
        text(d, (cx, cy - 17 * s), tag + extra, f_tag, fill=ACCENT, anchor="mm", box=int(7 * s))
        text(d, (cx, cy + 19 * s), size, f_s, anchor="mm", box=int(6 * s))
        tags.append((tag, typ, a0, a1, sill, head, wid))

    # dimension chains under the ground line: opening positions, then the overall width
    def chain(yc, cuts, label_min=0.9):
        cuts = sorted(set(round(c, 4) for c in cuts))
        x0, x1 = sorted((sh.x(cuts[0]), sh.x(cuts[-1])))
        d.line((x0 - 25 * s, yc, x1 + 25 * s, yc), fill=INK, width=max(1, int(2 * s)))
        for c in cuts:
            x = sh.x(c)
            d.line((x, yc - 22 * s, x, yc + 22 * s), fill=INK, width=max(1, int(2 * s)))
            d.line((x - 11 * s, yc + 11 * s, x + 11 * s, yc - 11 * s), fill=INK, width=max(2, int(4 * s)))
        for c0, c1 in zip(cuts, cuts[1:]):
            if c1 - c0 >= label_min:
                text(d, ((sh.x(c0) + sh.x(c1)) / 2, yc - 16 * s), fi(c1 - c0), f_s, anchor="mb")
    cuts = [0.0, 43.5] + [a for t in tags for a in (t[2], t[3])]
    y1c = gy + 110 * s
    chain(y1c, cuts)
    chain(y1c + 105 * s, [0.0, 43.5])
    text(d, ((bx0 + bx1) / 2, y1c + 105 * s + 30 * s), "overall, outer faces", f_s, fill=MUTED, anchor="mt")
    lft, rgt = SIDES[face]
    text(d, (bx0, y1c + 105 * s + 30 * s), f"← {lft.upper()}", f_s, fill=MUTED, anchor="lt")
    text(d, (bx1, y1c + 105 * s + 30 * s), f"{rgt.upper()} →", f_s, fill=MUTED, anchor="rt")

    # title block
    text(d, (sh.L, 70 * s), frame["title"].upper(), f_xl)
    text(d, (sh.L, 175 * s), f"First floor · {frame['note']} · from First_Floor_2D_Plan_v5", f_l, fill=MUTED)
    text(d, (sh.L, 240 * s), "True orthographic view of the 3D model · dimensions in feet-inches · levels from the "
         "first-floor finished floor (FFL ±0'-0\")", f_m, fill=MUTED)

    # key plan position (top right); the scale bar sits to its left
    ks = 200 * s / 43.5
    kx, ky = CW - 330 * s, 95 * s
    # scale bar
    sx, sy = kx - 200 * s - 20 * sh.ppf, 120 * s
    for i, (a, b) in enumerate([(0, 5), (5, 10), (10, 20)]):
        d.rectangle((sx + a * sh.ppf, sy, sx + b * sh.ppf, sy + 16 * s),
                    fill=INK if i % 2 == 0 else (255, 255, 255), outline=INK, width=max(1, int(2 * s)))
    for v in (0, 5, 10, 20):
        text(d, (sx + v * sh.ppf, sy + 26 * s), f"{v}'", f_s, anchor="mt")
    text(d, (sx, sy - 14 * s), "SCALE (feet)", f_s, fill=MUTED, anchor="lb")

    # key plan, drawn like the PDF (east up, north left), with this face marked
    for rid, label, (u0, u1, v0, v1), *_ in P.ROOMS:
        d.rectangle((kx + u0 * ks, ky + v0 * ks, kx + u1 * ks, ky + v1 * ks), outline=(170, 175, 182),
                    width=max(1, int(s)))
    d.rectangle((kx, ky, kx + 43.5 * ks, ky + 43.5 * ks), outline=INK, width=max(2, int(3 * s)))
    edge = {"south": ((43.5, 0), (43.5, 43.5)), "north": ((0, 0), (0, 43.5)),
            "west": ((0, 43.5), (43.5, 43.5)), "east": ((0, 0), (43.5, 0))}[face]
    (pu0, pv0), (pu1, pv1) = edge
    d.line((kx + pu0 * ks, ky + pv0 * ks, kx + pu1 * ks, ky + pv1 * ks), fill=ACCENT, width=max(4, int(9 * s)))
    mu, mv = (pu0 + pu1) / 2, (pv0 + pv1) / 2
    du, dv = {"south": (1, 0), "north": (-1, 0), "west": (0, 1), "east": (0, -1)}[face]
    tipx, tipy = kx + (mu + du * 3) * ks, ky + (mv + dv * 3) * ks
    tailx, taily = kx + (mu + du * 11) * ks, ky + (mv + dv * 11) * ks
    d.line((tailx, taily, tipx, tipy), fill=ACCENT, width=max(3, int(5 * s)))
    ang = math.atan2(tipy - taily, tipx - tailx)
    for sgn in (1, -1):
        d.line((tipx, tipy, tipx - 22 * s * math.cos(ang + sgn * 0.5), tipy - 22 * s * math.sin(ang + sgn * 0.5)),
               fill=ACCENT, width=max(3, int(5 * s)))
    # north arrow under the key plan's left corner (north is to the left, as on the PDF)
    nx, ny_ = kx - 230 * s, ky + 43.5 * ks + 74 * s
    d.line((nx + 60 * s, ny_, nx, ny_), fill=INK, width=max(2, int(3 * s)))
    d.polygon([(nx - 4 * s, ny_), (nx + 14 * s, ny_ - 9 * s), (nx + 14 * s, ny_ + 9 * s)], fill=INK)
    text(d, (nx + 72 * s, ny_), "N", font(28 * s, True), anchor="lm")
    text(d, (kx - 90 * s, ky + 43.5 * ks), "Key plan", f_s, fill=MUTED, anchor="rb")
    text(d, (kx - 90 * s, ky + 43.5 * ks + 34 * s), "(as the PDF: east up)", f_s, fill=MUTED, anchor="rb")

    # notes: what is drawn from the plan and which heights are assumed
    ny = CH - sh.B + 330 * s
    notes = [
        "Plan positions and widths of every opening are from the PDF plan (plan.py). The PDF gives no heights; "
        f"these are assumed: floor to ceiling {fi(P.CEIL)}, slab {fi(P.SLAB)}, doors {fi(P.DOOR_H)},",
        f"rolling shutters {fi(P.SHUTTER_H)}, windows sill {fi(P.WIN_SILL)} / head {fi(P.WIN_HEAD)} "
        f"(kitchen sill 3'-6\"), ventilators {fi(P.VENT_SILL)} to {fi(P.VENT_HEAD)}, parapets {fi(P.PARAPET)}, "
        f"ground floor {fi(-P.GROUND - P.SLAB)} + slab.",
        "Ground floor and the stair head room are context only (closed massing, not from the drawing); the upper "
        "storey is not shown. Furniture is left out of the line work.",
    ]
    text(d, (sh.L, ny - 44 * s), "NOTES", font(28 * s, True))
    for i, n in enumerate(notes):
        text(d, (sh.L, ny + i * 42 * s), n, f_s, fill=(60, 64, 70))
    d.rectangle((20 * s, 20 * s, CW - 20 * s, CH - 20 * s), outline=INK, width=max(2, int(4 * s)))
    sheet.save(os.path.join(OUT, f"{face}_drawing.png"), optimize=True)
    print(face, "drawing", sheet.size, "tags:", ", ".join(f"{t[0]}={t[6]}" for t in tags))
    return sheet


def draw_render(face, frame):
    """The photo on a soft sky gradient, a ground band, and a slim caption."""
    path = os.path.join(OUT, f"{face}_photo.png")
    if not os.path.exists(path):
        return None
    sh = Sheet(frame)
    s = sh.s
    ph = Image.open(path).convert("RGBA")
    W, H = ph.size
    t = np.linspace(0, 1, H)[:, None]
    top, bot = np.array([150, 186, 220]), np.array([226, 236, 243])
    sky = (top * (1 - t) + bot * t)[:, None, :].repeat(W, 1).reshape(H, W, 3)
    gy = int(sh.y(P.GROUND) - sh.T)
    sky[gy:] = np.array([196, 184, 160])
    bg = Image.fromarray(sky.astype(np.uint8), "RGB").convert("RGBA")
    bg.alpha_composite(ph)
    out = bg.convert("RGB")
    d = ImageDraw.Draw(out)
    text(d, (40 * s, H - 40 * s), f"{frame['title']} · first floor · Cycles path-traced, orthographic",
         font(34 * s, True), fill=(255, 255, 255), anchor="lb")
    out.save(os.path.join(OUT, f"{face}_render.jpg"), quality=92)
    print(face, "render", out.size)
    return out


def main():
    frames = json.load(open(os.path.join(OUT, "frames.json")))
    pages = []
    for face in FACE_ORDER:
        if face not in frames or not os.path.exists(os.path.join(OUT, f"{face}_lines.png")):
            continue
        pages.append(draw_drawing(face, frames[face]))
        draw_render(face, frames[face])
    if pages:
        dpi = pages[0].size[0] / 16.54                    # A3 landscape is 16.54 x 11.69 in
        pages[0].save(os.path.join(OUT, "first_floor_elevations.pdf"), save_all=True, append_images=pages[1:],
                      resolution=dpi, quality=92)
        print("pdf", len(pages), "pages")


main()
