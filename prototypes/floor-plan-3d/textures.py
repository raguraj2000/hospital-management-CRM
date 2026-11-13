"""Procedural, tileable PBR-ish textures (base colour + normal map) made with numpy.

No downloads: every texture is generated here so the model builds offline.
Usage:  python textures.py <out_dir>
Each entry in TEXTURES -> <name>.jpg (+ <name>_n.jpg normal map when it has relief).
"""
import os
import sys

import numpy as np
from PIL import Image

RNG = np.random.default_rng(7)


# ---------------------------------------------------------------- helpers ---
def noise(n, scale, seed=None, aniso=(1.0, 1.0)):
    """Tileable smooth noise in [0,1]; `scale` ~ feature size in pixels."""
    r = np.random.default_rng(seed) if seed is not None else RNG
    w = r.standard_normal((n, n))
    fy = np.fft.fftfreq(n)[:, None] * aniso[0]
    fx = np.fft.fftfreq(n)[None, :] * aniso[1]
    k2 = fx * fx + fy * fy
    f = np.fft.ifft2(np.fft.fft2(w) * np.exp(-k2 * (scale * np.pi) ** 2 / 2)).real
    f -= f.min()
    return f / (f.max() + 1e-9)


def fbm(n, base, octaves=4, seed=0, aniso=(1.0, 1.0)):
    out = np.zeros((n, n))
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        out += amp * noise(n, base / (2 ** o), seed + o, aniso)
        tot += amp
        amp *= 0.5
    return out / tot


def rgb(c):
    return np.array(c, dtype=float)[None, None, :]


def lerp(a, b, t):
    return a + (b - a) * t[..., None]


def normal_from_height(h, strength):
    gy, gx = np.gradient(np.pad(h, 1, mode="wrap"))
    gx, gy = gx[1:-1, 1:-1], gy[1:-1, 1:-1]
    nx, ny, nz = -gx * strength, gy * strength, np.ones_like(h)
    l = np.sqrt(nx * nx + ny * ny + nz * nz)
    n = np.stack([nx / l, ny / l, nz / l], -1)
    return ((n * 0.5 + 0.5) * 255).astype(np.uint8)


def grid_mask(n, nx, ny, width_px, offset_rows=False):
    """1 inside tiles, 0 on grout lines. Returns mask and per-tile id."""
    y, x = np.mgrid[0:n, 0:n]
    th, tw = n / ny, n / nx
    row = (y // th).astype(int)
    xs = x + (row % 2) * (tw / 2 if offset_rows else 0)
    col = ((xs // tw) % nx).astype(int)
    fx = np.minimum(xs % tw, tw - xs % tw)
    fy = np.minimum(y % th, th - y % th)
    d = np.minimum(fx, fy)
    m = np.clip((d - width_px * 0.5) / 1.5, 0, 1)
    return m, row * 1000 + col


def per_tile(ids, lo, hi, seed):
    r = np.random.default_rng(seed)
    u = np.unique(ids)
    vals = dict(zip(u, r.uniform(lo, hi, len(u))))
    return np.vectorize(vals.get)(ids)


# --------------------------------------------------------------- recipes ----
def marble_tiles(n=1024, tiles=2, base=(0.90, 0.87, 0.82), vein=(0.72, 0.68, 0.62), grout=(0.62, 0.58, 0.52), seed=1):
    m, ids = grid_mask(n, tiles, tiles, 5)
    warp = fbm(n, 90, 4, seed)
    y, x = np.mgrid[0:n, 0:n] / n
    warp2 = fbm(n, 25, 3, seed + 4)
    v = np.abs(np.sin((x * 1.3 + y * 0.9 + warp * 2.2 + warp2 * 0.6) * np.pi * 2))
    fade = np.clip((fbm(n, 150, 3, seed + 7) - 0.35) * 2.5, 0, 1)
    v = np.exp(-v * 9) * fade * 0.6 + np.exp(-v * 40) * fade * 0.3 + (fbm(n, 60, 4, seed + 9) - 0.5) * 0.18
    shade = per_tile(ids, -0.03, 0.03, seed)
    col = lerp(rgb(base), rgb(vein), np.clip(v, 0, 1)) + shade[..., None]
    col = lerp(rgb(grout), col, m)
    h = m * 1.0
    return col, normal_from_height(h, 2.0)


def planks(n=1024, nx=1, ny=6, base=(0.62, 0.45, 0.30), dark=(0.42, 0.28, 0.17), seed=2):
    m, ids = grid_mask(n, nx, ny, 3, offset_rows=True)
    y, x = np.mgrid[0:n, 0:n]
    g = fbm(n, 30, 4, seed, aniso=(1.0, 0.08))
    grain = np.abs(np.sin((y / n * 120 + g * 18) * np.pi))
    t = np.clip(grain * 0.5 + fbm(n, 60, 3, seed + 3, aniso=(1, 0.1)) * 0.6, 0, 1)
    shade = per_tile(ids, -0.07, 0.07, seed)
    col = lerp(rgb(base), rgb(dark), t) + shade[..., None]
    col = col * (0.75 + 0.25 * m[..., None])
    return col, normal_from_height(m * 0.6 + t * 0.15, 2.0)


def wood_grain(n=1024, base=(0.55, 0.33, 0.18), dark=(0.33, 0.18, 0.09), seed=3, rings=60):
    g = fbm(n, 120, 4, seed, aniso=(1.0, 0.15))
    y, x = np.mgrid[0:n, 0:n] / n
    r = np.abs(np.sin((x * rings * 0.3 + g * 6 + y * 0.6) * np.pi))
    pores = fbm(n, 4, 2, seed + 1, aniso=(1, 0.04))
    t = np.clip(r ** 2.5 * 0.65 + pores * 0.35 + (fbm(n, 200, 2, seed + 2) - 0.5) * 0.3, 0, 1)
    col = lerp(rgb(base), rgb(dark), t)
    return col, normal_from_height(t * 0.3, 1.0)


def stone_tiles(n=1024, tiles=2, base=(0.48, 0.55, 0.56), alt=(0.38, 0.44, 0.45), seed=4, grout_w=3):
    m, ids = grid_mask(n, tiles, tiles, grout_w)
    t = fbm(n, 70, 5, seed)
    shade = per_tile(ids, -0.06, 0.06, seed)
    spots = (fbm(n, 6, 2, seed + 5) > 0.68) * 0.06
    col = lerp(rgb(base), rgb(alt), t) + (shade - spots)[..., None]
    col = lerp(rgb((0.30, 0.32, 0.31)), col, m)
    return col, normal_from_height(m * 0.8 + t * 0.2, 2.0)


def speckle(n=1024, base=(0.08, 0.08, 0.08), dots=((0.55, 0.50, 0.45), (0.25, 0.22, 0.2)), density=(0.80, 0.70), seed=5, mottle=0.05):
    col = np.ones((n, n, 3)) * rgb(base) + (fbm(n, 60, 3, seed) - 0.5)[..., None] * mottle
    for i, (d, dens) in enumerate(zip(dots, density)):
        f = noise(n, 2.2, seed + 10 + i)
        col = lerp(col, np.ones_like(col) * rgb(d), np.clip((f - dens) * 12, 0, 1))
    return col, None


def concrete(n=1024, base=(0.60, 0.60, 0.58), seed=6):
    t = fbm(n, 120, 6, seed)
    pores = (noise(n, 1.5, seed + 3) > 0.83) * 0.06
    col = rgb(base) + (t - 0.5)[..., None] * 0.14 - pores[..., None]
    trowel = fbm(n, 25, 2, seed + 9, aniso=(0.2, 1.0))
    col += (trowel - 0.5)[..., None] * 0.05
    return col, normal_from_height(t * 0.3 + pores, 1.5)


def paint(n=512, base=(0.93, 0.91, 0.86), seed=8, amount=0.025):
    t = fbm(n, 4, 3, seed)
    col = rgb(base) + (t - 0.5)[..., None] * amount + (fbm(n, 80, 3, seed + 1) - 0.5)[..., None] * 0.02
    return col, normal_from_height(t * 0.6, 1.2)


def wall_tiles(n=1024, nx=2, ny=4, base=(0.93, 0.93, 0.91), vein=(0.80, 0.80, 0.80), seed=9):
    m, ids = grid_mask(n, nx, ny, 3)
    warp = fbm(n, 120, 4, seed)
    y, x = np.mgrid[0:n, 0:n] / n
    v = np.clip(1 - np.abs(np.sin((x * 2 - y * 1.2 + warp * 3) * np.pi * 2)) * 7, 0, 1) * 0.5
    col = lerp(rgb(base), rgb(vein), v) + per_tile(ids, -0.015, 0.015, seed)[..., None]
    col = lerp(rgb((0.72, 0.72, 0.70)), col, m)
    return col, normal_from_height(m, 2.0)


def fabric(n=512, base=(0.42, 0.45, 0.50), seed=10, weave=128):
    y, x = np.mgrid[0:n, 0:n]
    w = (np.sin(x / n * weave * np.pi * 2) * np.sin(y / n * weave * np.pi * 2))
    t = fbm(n, 30, 3, seed)
    col = rgb(base) * (0.9 + 0.08 * w[..., None] + (t[..., None] - 0.5) * 0.15)
    return col, normal_from_height(w * 0.4, 1.0)


def rug(n=1024, seed=11):
    y, x = np.mgrid[0:n, 0:n] / n
    base = np.ones((n, n, 3)) * rgb((0.62, 0.30, 0.22))
    border = (np.minimum(np.minimum(x, 1 - x), np.minimum(y, 1 - y)) < 0.08)
    inner = (np.minimum(np.minimum(x, 1 - x), np.minimum(y, 1 - y)) < 0.10)
    d = np.abs(x - 0.5) + np.abs(y - 0.5)
    med = (np.abs(np.sin(d * 28)) > 0.85) & (d < 0.32)
    col = base
    col[inner] = rgb((0.85, 0.75, 0.55))[0, 0]
    col[border] = rgb((0.15, 0.20, 0.32))[0, 0]
    col[med] = rgb((0.88, 0.80, 0.60))[0, 0]
    t = fbm(n, 2, 2, seed)
    col = col * (0.88 + 0.2 * t[..., None])
    return col, None


def cardboard(n=512, seed=12):
    t = fbm(n, 40, 4, seed)
    y, x = np.mgrid[0:n, 0:n] / n
    col = rgb((0.66, 0.50, 0.32)) + (t - 0.5)[..., None] * 0.08
    tape = (np.abs(x - 0.5) < 0.06)
    col[tape] = col[tape] * 0.85 + rgb((0.72, 0.58, 0.40))[0, 0] * 0.15 + 0.05
    label = (x > 0.12) & (x < 0.36) & (y > 0.62) & (y < 0.80)
    col[label] = rgb((0.93, 0.92, 0.88))[0, 0]
    lines = label & (np.sin(y * 300) > 0.6) & (x < 0.33) & (x > 0.14)
    col[lines] = rgb((0.2, 0.2, 0.2))[0, 0]
    return col, normal_from_height(tape * 0.3, 1.0)


def shutter(n=512, seed=13):
    y, x = np.mgrid[0:n, 0:n] / n
    prof = np.sin(y * 16 * np.pi * 2)
    t = fbm(n, 30, 3, seed, aniso=(0.1, 1.0))
    col = rgb((0.58, 0.60, 0.62)) * (0.85 + 0.15 * prof[..., None]) + (t - 0.5)[..., None] * 0.06
    return col, normal_from_height(prof * 2.0, 3.0)


def asphalt(n=1024, seed=14):
    t = fbm(n, 50, 5, seed)
    col = rgb((0.22, 0.22, 0.23)) + (t - 0.5)[..., None] * 0.08
    stones = noise(n, 1.2, seed + 1)
    col = lerp(col, np.ones_like(col) * rgb((0.45, 0.44, 0.42)), np.clip((stones - 0.78) * 8, 0, 1))
    return col, normal_from_height(stones * 0.5, 2.0)


def ground(n=1024, seed=15):
    t = fbm(n, 80, 5, seed)
    g = fbm(n, 10, 3, seed + 1)
    soil = rgb((0.45, 0.36, 0.26))
    grass = rgb((0.30, 0.38, 0.18))
    col = lerp(np.ones((n, n, 3)) * soil, np.ones((n, n, 3)) * grass, np.clip((t - 0.45) * 4 + (g - 0.5), 0, 1))
    return col, normal_from_height(g, 1.5)


def ext_plaster(n=512, seed=16):
    return paint(n, (0.90, 0.84, 0.72), seed, amount=0.06)


TEXTURES = {
    "vitrified": lambda: marble_tiles(),
    "wood_floor": lambda: planks(),
    "bathfloor": lambda: stone_tiles(1024, 4, (0.62, 0.60, 0.56), (0.55, 0.53, 0.50), 21, 4),
    "kota": lambda: stone_tiles(1024, 2, (0.47, 0.54, 0.53), (0.38, 0.43, 0.42), 22, 3),
    "concrete": lambda: concrete(),
    "tile_wall": lambda: wall_tiles(),
    "kitchen_dado": lambda: wall_tiles(1024, 4, 8, (0.95, 0.93, 0.88), (0.86, 0.82, 0.75), 23),
    "paint_warm": lambda: paint(512, (0.93, 0.90, 0.84), 31),
    "paint_sage": lambda: paint(512, (0.80, 0.83, 0.76), 32),
    "paint_cream": lambda: paint(512, (0.95, 0.92, 0.84), 33),
    "paint_grey": lambda: paint(512, (0.86, 0.86, 0.84), 34),
    "paint_store": lambda: paint(512, (0.90, 0.90, 0.88), 35, 0.04),
    "paint_ext": lambda: ext_plaster(),
    "paint_ceiling": lambda: paint(512, (0.96, 0.96, 0.95), 36, 0.012),
    "teak": lambda: wood_grain(),
    "walnut": lambda: wood_grain(1024, (0.36, 0.24, 0.16), (0.22, 0.14, 0.09), 41, 90),
    "oak_light": lambda: wood_grain(1024, (0.76, 0.62, 0.45), (0.60, 0.46, 0.31), 42, 70),
    "granite_black": lambda: speckle(),
    "granite_grey": lambda: speckle(1024, (0.50, 0.48, 0.47), ((0.20, 0.19, 0.19), (0.75, 0.72, 0.70)), (0.70, 0.72), 51, 0.08),
    "fabric_sofa": lambda: fabric(512, (0.36, 0.40, 0.46), 61),
    "fabric_bed": lambda: fabric(512, (0.88, 0.86, 0.82), 62, 160),
    "fabric_throw": lambda: fabric(512, (0.55, 0.32, 0.24), 63, 90),
    "fabric_curtain": lambda: fabric(512, (0.78, 0.72, 0.60), 64, 200),
    "rug": lambda: rug(),
    "cardboard": lambda: cardboard(),
    "shutter": lambda: shutter(),
    "asphalt": lambda: asphalt(),
    "ground": lambda: ground(),
}


def build(out_dir, only=None):
    os.makedirs(out_dir, exist_ok=True)
    for name, fn in TEXTURES.items():
        if only and name not in only:
            continue
        col, nrm = fn()
        img = (np.clip(col, 0, 1) ** (1 / 1.0) * 255).astype(np.uint8)
        Image.fromarray(img).save(os.path.join(out_dir, name + ".jpg"), quality=88)
        if nrm is not None:
            Image.fromarray(nrm).save(os.path.join(out_dir, name + "_n.jpg"), quality=92)
        print("tex", name)


if __name__ == "__main__":
    build(sys.argv[1] if len(sys.argv) > 1 else "build/textures", sys.argv[2:] or None)
