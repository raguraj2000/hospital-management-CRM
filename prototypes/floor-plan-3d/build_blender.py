"""Build the First Floor v5 model in Blender (geometry, materials, lighting, cameras),
export a GLB for the web viewer and render reference stills with Cycles.

Run with Blender's Python (bpy module or `blender -b -P`):
    python build_blender.py --tex build/textures --glb viewer/model.glb --renders all
    blender -b -P build_blender.py -- --tex build/textures --renders plan_top,hall

Options:
    --tex DIR        textures folder (made by textures.py; generated if missing)
    --glb PATH       export GLB here (omit to skip)
    --blend PATH     save the .blend here (omit to skip)
    --renders LIST   comma list of camera names, or "all", or "none"
    --out DIR        render output folder (default renders/)
    --samples N      Cycles samples (default 96)
    --res WxH        render size (default 1600x900)
"""
import math
import os
import sys

import bpy  # noqa: I001  (bpy must be imported before bmesh when used as a module)
import bmesh
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import plan as P  # noqa: E402

FT = P.FT
CEIL, SLAB = P.CEIL, P.SLAB


# ============================================================ arguments =====
def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    a = {"tex": os.path.join(HERE, "build", "textures"), "glb": None, "blend": None, "renders": "none",
         "out": os.path.join(HERE, "renders"), "samples": 96, "res": "1600x900"}
    i = 0
    while i < len(argv):
        k = argv[i].lstrip("-")
        if k in a:
            a[k] = argv[i + 1]
            i += 2
        else:
            i += 1
    a["samples"] = int(a["samples"])
    a["res"] = tuple(int(x) for x in a["res"].split("x"))
    return a


ARGS = parse_args()


# ============================================================ geometry ======
def W(u, v, z=0.0):
    """plan feet -> Blender metres"""
    return Vector((-v * FT, -u * FT, z * FT))


class Geo:
    """Accumulates faces per (category, material) so the GLB has few draw calls."""

    def __init__(self):
        self.parts = {}

    def _part(self, cat, mat):
        return self.parts.setdefault((cat, mat), {"v": [], "f": [], "s": []})

    def add_faces(self, cat, mat, verts, faces, smooth=False, center=None):
        p = self._part(cat, mat)
        base = len(p["v"])
        p["v"].extend(tuple(v) for v in verts)
        for f in faces:
            if center is not None:  # make winding point away from the solid's centre
                pts = [Vector(verts[i]) for i in f]
                n = Vector((0, 0, 0))
                for i in range(len(pts)):
                    a, b = pts[i], pts[(i + 1) % len(pts)]
                    n += Vector(((a.y - b.y) * (a.z + b.z), (a.z - b.z) * (a.x + b.x), (a.x - b.x) * (a.y + b.y)))
                c = sum(pts, Vector()) / len(pts)
                if n.dot(c - center) < 0:
                    f = tuple(reversed(f))
            p["f"].append(tuple(base + i for i in f))
            p["s"].append(smooth)

    def obox(self, cat, mat, o, e1, e2, e3, skip=()):
        """Oriented box o + [0,1]e1 + [0,1]e2 + [0,1]e3."""
        o, e1, e2, e3 = Vector(o), Vector(e1), Vector(e2), Vector(e3)
        vs = [o + e1 * (i & 1) + e2 * ((i >> 1) & 1) + e3 * ((i >> 2) & 1) for i in range(8)]
        faces = {"-z": (0, 2, 3, 1), "+z": (4, 5, 7, 6), "-y": (0, 1, 5, 4),
                 "+y": (2, 6, 7, 3), "-x": (0, 4, 6, 2), "+x": (1, 3, 7, 5)}
        fs = [f for k, f in faces.items() if k not in skip]
        self.add_faces(cat, mat, vs, fs, center=o + (e1 + e2 + e3) / 2)

    def box(self, cat, mat, a, b, skip=()):
        x0, x1 = sorted((a[0], b[0]))
        y0, y1 = sorted((a[1], b[1]))
        z0, z1 = sorted((a[2], b[2]))
        if x1 - x0 < 1e-6 or y1 - y0 < 1e-6 or z1 - z0 < 1e-6:
            return
        self.obox(cat, mat, (x0, y0, z0), (x1 - x0, 0, 0), (0, y1 - y0, 0), (0, 0, z1 - z0), skip)

    def bm(self, cat, mat, bmo, smooth=False):
        verts = [v.co.copy() for v in bmo.verts]
        bmo.verts.index_update()
        faces = [tuple(v.index for v in f.verts) for f in bmo.faces]
        self.add_faces(cat, mat, verts, faces, smooth)

    def cyl(self, cat, mat, base, axis, r, seg=20, r2=None, smooth=True, caps=True):
        """Cylinder / cone from `base` along vector `axis` (metres)."""
        base, axis = Vector(base), Vector(axis)
        r2 = r if r2 is None else r2
        z = axis.normalized()
        x = z.orthogonal().normalized()
        y = z.cross(x)
        vs = []
        for k, rr in ((0, r), (1, r2)):
            for i in range(seg):
                t = 2 * math.pi * i / seg
                vs.append(base + axis * k + (x * math.cos(t) + y * math.sin(t)) * rr)
        fs = [(i, (i + 1) % seg, seg + (i + 1) % seg, seg + i) for i in range(seg)]
        self.add_faces(cat, mat, vs, fs, smooth, center=base + axis / 2)
        if caps:
            self.add_faces(cat, mat, vs, [tuple(range(seg))[::-1], tuple(range(seg, 2 * seg))], False,
                           center=base + axis / 2)

    def sphere(self, cat, mat, c, r, scale=(1, 1, 1), seg=16, rings=10):
        b = bmesh.new()
        bmesh.ops.create_uvsphere(b, u_segments=seg, v_segments=rings, radius=1.0)
        for v in b.verts:
            v.co = Vector(c) + Vector((v.co.x * r * scale[0], v.co.y * r * scale[1], v.co.z * r * scale[2]))
        self.bm(cat, mat, b, smooth=True)
        b.free()

    def rbox(self, cat, mat, a, b, bevel=0.02, segments=2):
        """Box with rounded (bevelled) edges — metres."""
        lo = Vector([min(a[i], b[i]) for i in range(3)])
        hi = Vector([max(a[i], b[i]) for i in range(3)])
        size = hi - lo
        bo = bmesh.new()
        bmesh.ops.create_cube(bo, size=1.0)
        for v in bo.verts:
            v.co = lo + Vector(((v.co.x + 0.5) * size.x, (v.co.y + 0.5) * size.y, (v.co.z + 0.5) * size.z))
        bev = min(bevel, min(size) * 0.45)
        bmesh.ops.bevel(bo, geom=list(bo.edges), offset=bev, segments=segments, profile=0.5, affect="EDGES")
        self.bm(cat, mat, bo, smooth=False)
        bo.free()


G = Geo()


# Plan-space helpers (feet) -------------------------------------------------------
def pbox(cat, mat, u0, u1, v0, v1, z0, z1, skip=()):
    G.box(cat, mat, W(u0, v0, z0), W(u1, v1, z1), skip)


def prbox(cat, mat, u0, u1, v0, v1, z0, z1, bevel=0.06):
    G.rbox(cat, mat, W(u0, v0, z0), W(u1, v1, z1), bevel * FT)


def pcyl(cat, mat, u, v, z0, h, r, seg=20, r2=None, caps=True):
    G.cyl(cat, mat, W(u, v, z0), (0, 0, h * FT), r * FT, seg, None if r2 is None else r2 * FT, caps=caps)


# ============================================================ materials =====
# name: (texture or None, tile size m, roughness, metallic, colour, extra)
MATS = {
    # finishes
    "vitrified": ("vitrified", 1.2, 0.18, 0, None, {}),
    "wood_floor": ("wood_floor", 1.2, 0.45, 0, None, {}),
    "bathfloor": ("bathfloor", 1.2, 0.55, 0, None, {}),
    "kota": ("kota", 1.2, 0.5, 0, None, {}),
    "concrete": ("concrete", 2.0, 0.75, 0, None, {}),
    "granite": ("granite_grey", 1.0, 0.25, 0, None, {}),
    "granite_black": ("granite_black", 1.0, 0.12, 0, None, {}),
    "tile_wall": ("tile_wall", 1.2, 0.12, 0, None, {}),
    "kitchen_dado": ("kitchen_dado", 1.2, 0.12, 0, None, {}),
    "paint_warm": ("paint_warm", 2.0, 0.85, 0, None, {}),
    "paint_sage": ("paint_sage", 2.0, 0.85, 0, None, {}),
    "paint_cream": ("paint_cream", 2.0, 0.85, 0, None, {}),
    "paint_grey": ("paint_grey", 2.0, 0.85, 0, None, {}),
    "paint_store": ("paint_store", 2.0, 0.9, 0, None, {}),
    "paint_ext": ("paint_ext", 2.0, 0.9, 0, None, {}),
    "paint_ceiling": ("paint_ceiling", 2.0, 0.92, 0, None, {}),
    "skirting": (None, 1, 0.3, 0, (0.55, 0.52, 0.48), {}),
    # wood & fabrics
    "teak": ("teak", 0.6, 0.4, 0, None, {}),
    "walnut": ("walnut", 0.6, 0.35, 0, None, {}),
    "oak_light": ("oak_light", 0.6, 0.45, 0, None, {}),
    "fabric_sofa": ("fabric_sofa", 0.5, 0.95, 0, None, {}),
    "fabric_bed": ("fabric_bed", 0.5, 0.95, 0, None, {}),
    "fabric_throw": ("fabric_throw", 0.4, 0.95, 0, None, {}),
    "fabric_curtain": ("fabric_curtain", 0.6, 0.95, 0, None, {}),
    "rug": ("rug", None, 0.95, 0, None, {}),  # None tile = fit 0..1 on top faces
    "cardboard": ("cardboard", None, 0.9, 0, None, {}),
    "shutter": ("shutter", 1.0, 0.45, 0.8, None, {}),
    "asphalt": ("asphalt", 3.0, 0.9, 0, None, {}),
    "ground": ("ground", 4.0, 0.95, 0, None, {}),
    # solids
    "pvc_white": (None, 1, 0.35, 0, (0.92, 0.91, 0.88), {}),
    "ceramic": (None, 1, 0.08, 0, (0.95, 0.95, 0.94), {}),
    "chrome": (None, 1, 0.12, 1.0, (0.85, 0.86, 0.88), {}),
    "steel": (None, 1, 0.3, 1.0, (0.72, 0.72, 0.72), {}),
    "rack_blue": (None, 1, 0.4, 0.3, (0.13, 0.27, 0.55), {}),
    "rack_orange": (None, 1, 0.4, 0.3, (0.85, 0.40, 0.10), {}),
    "rack_grey": (None, 1, 0.5, 0.5, (0.55, 0.57, 0.58), {}),
    "almirah": (None, 1, 0.35, 0.4, (0.45, 0.50, 0.48), {}),
    "frame_alu": (None, 1, 0.35, 0.8, (0.22, 0.20, 0.19), {}),
    "ms_grill": (None, 1, 0.5, 0.6, (0.12, 0.12, 0.12), {}),
    "black": (None, 1, 0.5, 0, (0.03, 0.03, 0.03), {}),
    "plastic_blue": (None, 1, 0.45, 0, (0.10, 0.30, 0.65), {}),
    "plastic_green": (None, 1, 0.45, 0, (0.15, 0.45, 0.25), {}),
    "plastic_red": (None, 1, 0.45, 0, (0.70, 0.12, 0.10), {}),
    "kitchen_shutter": (None, 1, 0.2, 0, (0.55, 0.62, 0.58), {}),
    "fridge": (None, 1, 0.25, 0.6, (0.75, 0.76, 0.77), {}),
    "screen": (None, 1, 0.08, 0, (0.01, 0.01, 0.012), {}),
    "leaf": (None, 1, 0.6, 0, (0.18, 0.40, 0.14), {}),
    "pot": (None, 1, 0.7, 0, (0.55, 0.28, 0.17), {}),
    "soil": (None, 1, 0.9, 0, (0.18, 0.12, 0.08), {}),
    "art1": (None, 1, 0.6, 0, (0.20, 0.42, 0.55), {}),
    "art2": (None, 1, 0.6, 0, (0.78, 0.55, 0.30), {}),
    "lamp_shade": (None, 1, 0.8, 0, (0.95, 0.90, 0.80), {"emit": (1.0, 0.85, 0.65), "emit_strength": 2.0}),
    "led": (None, 1, 0.5, 0, (1, 1, 1), {"emit": (1.0, 0.94, 0.86), "emit_strength": 8.0}),
    "glass": (None, 1, 0.02, 0, (0.85, 0.92, 0.95), {"glass": True}),
    "glass_frosted": (None, 1, 0.35, 0, (0.92, 0.95, 0.96), {"glass": True}),
    "mirror": (None, 1, 0.02, 1.0, (0.95, 0.95, 0.95), {}),
    "sign": (None, 1, 0.4, 0, (0.10, 0.18, 0.32), {}),
}
_mat_cache = {}


def tex_path(name, normal=False):
    p = os.path.join(ARGS["tex"], name + ("_n.jpg" if normal else ".jpg"))
    return p if os.path.exists(p) else None


def get_mat(name):
    if name in _mat_cache:
        return _mat_cache[name]
    tex, tile, rough, metal, col, extra = MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    if tex and tex_path(tex):
        img = bpy.data.images.load(tex_path(tex), check_existing=True)
        tn = nt.nodes.new("ShaderNodeTexImage")
        tn.image = img
        nt.links.new(tn.outputs["Color"], bsdf.inputs["Base Color"])
        if tex_path(tex, True):
            nimg = bpy.data.images.load(tex_path(tex, True), check_existing=True)
            nimg.colorspace_settings.name = "Non-Color"
            nn = nt.nodes.new("ShaderNodeTexImage")
            nn.image = nimg
            nm = nt.nodes.new("ShaderNodeNormalMap")
            nm.inputs["Strength"].default_value = 0.6
            nt.links.new(nn.outputs["Color"], nm.inputs["Color"])
            nt.links.new(nm.outputs["Normal"], bsdf.inputs["Normal"])
    elif col:
        bsdf.inputs["Base Color"].default_value = (*col, 1)
    if "emit" in extra:
        bsdf.inputs["Emission Color"].default_value = (*extra["emit"], 1)
        bsdf.inputs["Emission Strength"].default_value = extra["emit_strength"]
    if extra.get("glass"):
        bsdf.inputs["Transmission Weight"].default_value = 1.0
        bsdf.inputs["IOR"].default_value = 1.45
        bsdf.inputs["Alpha"].default_value = 0.25  # glTF/three fallback
        m.surface_render_method = "BLENDED"
    _mat_cache[name] = m
    return m


# ============================================================ walls =========
def run_axis(rect):
    u0, u1, v0, v1 = rect
    return "u" if (u1 - u0) >= (v1 - v0) else "v"


def rect_from(axis, a0, a1, t0, t1):
    return (a0, a1, t0, t1) if axis == "u" else (t0, t1, a0, a1)


def build_walls():
    for w in P.W:
        u0, u1, v0, v1 = w["rect"]
        ax = run_axis(w["rect"])
        A0, A1 = (u0, u1) if ax == "u" else (v0, v1)
        T0, T1 = (v0, v1) if ax == "u" else (u0, u1)
        z0, z1 = w["z0"], w["z1"]
        mat = "paint_ext"
        cat = "WALL"
        ops = sorted(w["openings"], key=lambda o: o[1])
        cur = A0
        for (typ, a0, a1, sill, head, ex) in ops:
            if a0 > cur:
                pbox(cat, mat, *rect_from(ax, cur, a0, T0, T1), z0, z1)
            if sill > z0:
                pbox(cat, mat, *rect_from(ax, a0, a1, T0, T1), z0, sill)
            if head < z1:
                pbox(cat, mat, *rect_from(ax, a0, a1, T0, T1), head, z1)
            build_opening(w, ax, typ, a0, a1, T0, T1, sill, head, ex)
            cur = a1
        if cur < A1:
            pbox(cat, mat, *rect_from(ax, cur, A1, T0, T1), z0, z1)
        if w["kind"] == "parapet":  # granite coping on top of parapets
            pbox("WALL", "granite", *rect_from(ax, A0, A1, T0 - 0.08, T1 + 0.08), z1, z1 + 0.12)


def build_opening(w, ax, typ, a0, a1, T0, T1, sill, head, ex):
    tm = (T0 + T1) / 2
    if typ in ("window", "vent"):
        fr = 0.15  # 2" aluminium frame
        depth = 0.25
        t0, t1 = tm - depth / 2, tm + depth / 2
        pbox("WALL", "frame_alu", *rect_from(ax, a0, a1, t0, t1), sill, sill + fr)
        pbox("WALL", "frame_alu", *rect_from(ax, a0, a1, t0, t1), head - fr, head)
        pbox("WALL", "frame_alu", *rect_from(ax, a0, a0 + fr, t0, t1), sill + fr, head - fr)
        pbox("WALL", "frame_alu", *rect_from(ax, a1 - fr, a1, t0, t1), sill + fr, head - fr)
        if typ == "window":
            mid = (a0 + a1) / 2
            pbox("WALL", "frame_alu", *rect_from(ax, mid - 0.06, mid + 0.06, t0 + 0.02, t1 - 0.02), sill + fr, head - fr)
            pbox("GLASS", "glass", *rect_from(ax, a0 + fr, a1 - fr, tm - 0.02, tm + 0.02), sill + fr, head - fr)
            # MS safety grill on the outside face (typical Indian window)
            go = T0 + 0.08
            n = max(2, int((a1 - a0) / 0.42))
            for i in range(1, n):
                a = a0 + (a1 - a0) * i / n
                pbox("DECO", "ms_grill", *rect_from(ax, a - 0.025, a + 0.025, go - 0.03, go + 0.03), sill, head)
            for z in (sill + (head - sill) / 3, sill + 2 * (head - sill) / 3):
                pbox("DECO", "ms_grill", *rect_from(ax, a0, a1, go - 0.03, go + 0.03), z - 0.03, z + 0.03)
            # granite sill on both faces
            pbox("WALL", "granite", *rect_from(ax, a0 - 0.1, a1 + 0.1, T0 - 0.08, T1 + 0.08), sill - 0.08, sill)
        else:
            # louvred frosted vent
            k = int((head - sill - 2 * fr) / 0.25)
            for i in range(k):
                z = sill + fr + 0.12 + i * 0.25
                pbox("GLASS", "glass_frosted", *rect_from(ax, a0 + fr, a1 - fr, tm - 0.08, tm + 0.08), z, z + 0.04)
    elif typ == "door":
        build_door(w, ax, a0, a1, T0, T1, head, ex)
    elif typ == "shutter":
        build_shutter(ax, a0, a1, T0, T1, head)


def build_door(w, ax, a0, a1, T0, T1, head, ex):
    fw, fd = 0.25, min(0.45, T1 - T0)  # frame 3" x ~5"
    tm = (T0 + T1) / 2
    t0, t1 = tm - fd / 2, tm + fd / 2
    width = a1 - a0
    main = ex.get("leaf") == "main"
    small = width <= 2.55 and not main
    frame_mat = "teak"
    leaf_mat = "teak" if main else ("pvc_white" if small else "oak_light")
    pbox("WALL", frame_mat, *rect_from(ax, a0, a0 + fw, t0, t1), 0, head - fw)
    pbox("WALL", frame_mat, *rect_from(ax, a1 - fw, a1, t0, t1), 0, head - fw)
    pbox("WALL", frame_mat, *rect_from(ax, a0, a1, t0, t1), head - fw, head)
    # threshold strip in granite
    pbox("FLOOR", "granite", *rect_from(ax, a0 + fw, a1 - fw, T0, T1), 0, 0.04)
    # leaf, rotated about the hinge toward the swing side
    L = width - 2 * fw - 0.02
    th = 0.15 if main else 0.12
    hinge_a = a0 + fw if ex["hinge"] == "a0" else a1 - fw
    run_dir = 1 if ex["hinge"] == "a0" else -1
    sw = ex["swing"]
    face_t = t1 if sw > 0 else t0
    ang = math.radians(ex["open"])
    # unit vectors in plan (u,v)
    if ax == "u":
        r = (run_dir, 0.0)
        n = (0.0, sw)
        H = (hinge_a, face_t)
    else:
        r = (0.0, run_dir)
        n = (sw, 0.0)
        H = (face_t, hinge_a)
    d = (r[0] * math.cos(ang) + n[0] * math.sin(ang), r[1] * math.cos(ang) + n[1] * math.sin(ang))
    p = (-d[1], d[0])  # perpendicular (thickness)

    def wv(du, dv, dz=0.0):  # plan direction -> world vector (metres)
        return Vector((-dv * FT, -du * FT, dz * FT))

    o = W(H[0] - p[0] * th / 2, H[1] - p[1] * th / 2, 0.03)
    e1, e2, e3 = wv(d[0] * L, d[1] * L), wv(p[0] * th, p[1] * th), wv(0, 0, head - fw - 0.05)
    G.obox("DOOR", leaf_mat, o, e1, e2, e3)
    if main:  # raised panels on both faces
        for side in (-1, 1):
            for (s0, s1, h0, h1) in ((0.12, 0.88, 0.5, 2.9), (0.12, 0.88, 3.4, 6.2)):
                po = Vector(o) + e1 * s0 + e3 * (h0 / (head - fw - 0.05)) + (e2 * (1.0 if side > 0 else 0.0))
                G.obox("DOOR", "teak", po, e1 * (s1 - s0), e2.normalized() * 0.012 * side,
                       e3 * ((h1 - h0) / (head - fw - 0.05)))
    # lever handle on both faces
    hz = 3.3
    for side in (-1, 1):
        hb = W(H[0] + d[0] * (L - 0.25) + p[0] * side * (th / 2 + 0.04),
               H[1] + d[1] * (L - 0.25) + p[1] * side * (th / 2 + 0.04), hz)
        G.cyl("DECO", "chrome", hb, wv(-d[0] * 0.4, -d[1] * 0.4), 0.012, 10)
        G.cyl("DECO", "chrome", W(H[0] + d[0] * (L - 0.25), H[1] + d[1] * (L - 0.25), hz),
              wv(p[0] * side * (th / 2 + 0.05), p[1] * side * (th / 2 + 0.05)), 0.02, 12)


def build_shutter(ax, a0, a1, T0, T1, head):
    """Rolling shutter, rolled up into its box above the opening (outside face)."""
    tout = T1 if ax == "u" else T1  # west side (larger v) is outside for the store wall
    # guide channels
    for a in (a0, a1 - 0.12):
        pbox("WALL", "rack_grey", *rect_from(ax, a, a + 0.12, tout, tout + 0.15), 0, head)
    # roll box
    pbox("WALL", "shutter", *rect_from(ax, a0 - 0.1, a1 + 0.1, tout, tout + 0.9), head, head + 0.9)
    # bottom slat visible just under the box, with handle
    pbox("WALL", "shutter", *rect_from(ax, a0 + 0.12, a1 - 0.12, tout + 0.05, tout + 0.12), head - 0.35, head)
    pbox("FLOOR", "steel", *rect_from(ax, a0, a1, T0, T1 + 0.05), 0, 0.03)
    # shop sign board above
    pbox("DECO", "sign", *rect_from(ax, a0, a1, tout + 0.9, tout + 0.98), head + 0.15, head + 1.6)


# ============================================================ room finishes ==
def openings_on_side(axis_fixed, coord, lo, hi):
    """Openings of any wall whose face lies on the given room side.
    axis_fixed: 'u' -> the side is the line u=coord running along v (lo..hi along v)."""
    res = []
    for w in P.W:
        u0, u1, v0, v1 = w["rect"]
        ax = run_axis(w["rect"])
        thin = (v0, v1) if ax == "u" else (u0, u1)
        if (axis_fixed == "u") != (ax == "v"):
            continue
        if min(abs(thin[0] - coord), abs(thin[1] - coord)) > 0.02:
            continue
        for o in w["openings"]:
            a0, a1 = max(o[1], lo), min(o[2], hi)
            if a1 > a0:
                res.append((a0, a1, o[3], o[4]))
    return res


def skin_side(cat, mat, axis_fixed, coord, inward, lo, hi, z0, z1, holes, thick=0.03):
    """A thin finish panel on a room side with rectangular holes."""
    c0, c1 = sorted((coord, coord + inward * thick))
    cur = lo
    for (a0, a1, s, h) in sorted(holes):
        if a0 > cur:
            _skin(cat, mat, axis_fixed, c0, c1, cur, a0, z0, z1)
        if s > z0:
            _skin(cat, mat, axis_fixed, c0, c1, a0, a1, z0, min(s, z1))
        if h < z1:
            _skin(cat, mat, axis_fixed, c0, c1, a0, a1, max(h, z0), z1)
        cur = max(cur, a1)
    if cur < hi:
        _skin(cat, mat, axis_fixed, c0, c1, cur, hi, z0, z1)


def _skin(cat, mat, axis_fixed, c0, c1, a0, a1, z0, z1):
    if z1 - z0 < 1e-3 or a1 - a0 < 1e-3:
        return
    if axis_fixed == "u":
        pbox(cat, mat, c0, c1, a0, a1, z0, z1)
    else:
        pbox(cat, mat, a0, a1, c0, c1, z0, z1)


TILE_TO = {"master_bath": 7.0, "storeroom_bath": 7.0, "common_bath": 7.0}
WALL_PAINT = {"master_bath": "paint_cream", "storeroom_bath": "paint_cream", "common_bath": "paint_cream"}


def build_rooms():
    for (rid, label, rect, floor, paint, kind) in P.ROOMS:
        u0, u1, v0, v1 = rect
        if kind != "stair":
            pbox("FLOOR", floor, u0, u1, v0, v1, 0, 0.03)
        if kind != "room":
            continue
        sides = [("u", u0, +1, v0, v1), ("u", u1, -1, v0, v1), ("v", v0, +1, u0, u1), ("v", v1, -1, u0, u1)]
        for (af, c, inward, lo, hi) in sides:
            holes = openings_on_side(af, c, lo, hi)
            if rid in TILE_TO:
                skin_side("WALL", "tile_wall", af, c, inward, lo, hi, 0, TILE_TO[rid], holes)
                skin_side("WALL", WALL_PAINT[rid], af, c, inward, lo, hi, TILE_TO[rid], CEIL, holes)
            else:
                skin_side("WALL", paint, af, c, inward, lo, hi, 0, CEIL, holes)
                if floor in ("vitrified", "wood_floor", "concrete"):
                    door_holes = [h for h in holes if h[2] <= 0.01] + [(a0, a1, 0.0, 10) for (a0, a1, s, h) in holes if s <= 0.5]
                    skin_side("WALL", "skirting" if floor != "concrete" else "concrete", af, c + inward * 0.03,
                              inward, lo, hi, 0, 0.33, door_holes, thick=0.03)


def build_slabs():
    # floor slab (under finishes), with the down-stair well open
    for (u0, u1, v0, v1) in [(0, 40.0, 0, 43.5), (40.0, 43.0, 0, 22.75), (43.0, 43.5, 0, 22.75)]:
        pbox("WALL", "paint_ext", u0, u1, v0, v1, -SLAB, 0.0)
    # ceiling (underside finish) + roof slab, with the up-stair hole
    hu0, hu1, hv0, hv1 = P.CEIL_HOLES[0]
    ceil_rects = [(0, 43.5, 0, hv0), (0, 43.5, hv1, 43.5), (0, hu0, hv0, hv1), (hu1, 43.5, hv0, hv1)]
    for (u0, u1, v0, v1) in ceil_rects:
        pbox("CEIL", "paint_ceiling", u0, u1, v0, v1, CEIL, CEIL + SLAB)
    # stair shaft above the hole (closed off, 2nd floor not modelled)
    top = CEIL + SLAB + 8.0
    pbox("CEIL", "paint_ext", hu0 - 0.4, hu0, hv0, hv1, CEIL, top)
    pbox("CEIL", "paint_ext", hu1, hu1 + 0.4, hv0, hv1, CEIL, top)
    pbox("CEIL", "paint_ext", hu0 - 0.4, hu1 + 0.4, hv0 - 0.4, hv0, CEIL, top)
    pbox("CEIL", "paint_ext", hu0 - 0.4, hu1 + 0.4, hv1, hv1 + 0.4, CEIL, top)
    pbox("CEIL", "paint_ceiling", hu0 - 0.4, hu1 + 0.4, hv0 - 0.4, hv1 + 0.4, top, top + 0.5)
    # upper storey massing (closed) + parapet
    z0 = CEIL + SLAB
    pbox("UPPER", "paint_ext", 0, 43.5, 0, 43.5, z0, z0 + 10.0)
    pbox("UPPER", "paint_ext", 0, 43.5, 0, 43.5, z0 + 10.0, z0 + 10.5)
    for r in [(0, 0.5, 0, 43.5), (43.0, 43.5, 0, 43.5), (0.5, 43.0, 0, 0.5), (0.5, 43.0, 43.0, 43.5)]:
        pbox("UPPER", "paint_ext", *r, z0 + 10.5, z0 + 13.5)
    # band between floors (sunshade / drip line)
    for r in [(-0.3, 0.0, -0.3, 43.8), (43.5, 43.8, -0.3, 43.8), (0.0, 43.5, -0.3, 0.0), (0.0, 43.5, 43.5, 43.8)]:
        pbox("UPPER", "granite", *r, z0 - 0.1, z0 + 0.3)
    # upper floor windows (dark glass bands) so the facade reads as a building
    for (u0, u1) in [(4, 9), (18, 25), (31, 37)]:
        pbox("UPPER", "glass", u0, u1, -0.05, 0.0, z0 + 3.0, z0 + 7.0)
        pbox("UPPER", "glass", u0, u1, 43.5, 43.55, z0 + 3.0, z0 + 7.0)


def build_site():
    g = P.GROUND
    # ground floor massing (closed)
    for (u0, u1, v0, v1) in [(0, 39.5, 0, 38.25), (39.5, 43.5, 0, 22.75)]:
        pbox("SITE", "paint_ext", u0, u1, v0, v1, g, -SLAB)
    # ground floor shop fronts on the road side
    for (a0, a1) in [(2, 9), (12, 19), (22, 30)]:
        pbox("SITE", "shutter", a0, a1, 38.25, 38.3, g, g + 8.5)
        pbox("SITE", "sign", a0, a1, 38.25, 38.33, g + 8.7, g + 9.8)
    # columns under the cantilevered west foot path
    for u in (0.25, 10.75, 21.25, 31.75, 39.0):
        pbox("SITE", "paint_ext", u - 0.5, u + 0.5, 42.25, 43.25, g, -SLAB)
    # ground, setback paving and road (west = road side)
    pbox("SITE", "ground", -60, 100, -60, 44.5, g - 0.5, g)
    pbox("SITE", "kota", -20, 64, 43.5, 52.0, g - 0.5, g + 0.25)    # front paving / footpath
    pbox("SITE", "granite", -20, 64, 51.5, 52.0, g, g + 0.5)        # kerb
    pbox("SITE", "asphalt", -60, 100, 52.0, 82.0, g - 0.5, g)       # road
    for k in range(-5, 10):
        pbox("SITE", "pvc_white", k * 10.0, k * 10.0 + 5, 66.8, 67.2, g, g + 0.02)  # lane markings
    pbox("SITE", "ground", -60, 100, 82.0, 140, g - 0.5, g)


# ============================================================ stairs =========
def build_stairs():
    # UP stair: 3' wide, rises toward east (decreasing v) from v=37.5 to v=27.375
    st = P.STAIRS[0]
    u0, u1, v0, v1 = st["rect"]
    n = 15
    rise = (st["z_high"] - st["z_low"]) / n
    run = (v1 - v0) / n
    for i in range(n):
        vb = v1 - (i + 1) * run
        z = rise * (i + 1)
        pbox("FLOOR", "paint_ext", u0, u1, vb, v1 - i * run, 0, z - 0.1)          # concrete body
        pbox("FLOOR", "granite", u0, u1, vb - 0.04, v1 - i * run, z - 0.1, z)       # granite tread w/ nosing
    # DOWN stair: descends toward west from v=22.75 (z=0) to v=43 (ground)
    st = P.STAIRS[1]
    u0, u1, v0, v1 = st["rect"]
    n = 16
    rise = (st["z_high"] - st["z_low"]) / n
    run = (v1 - v0) / n
    for i in range(n):
        va = v0 + i * run
        z = -rise * (i + 1)
        pbox("FLOOR", "paint_ext", u0, u1, va, va + run, P.GROUND, z - 0.1)
        pbox("FLOOR", "granite", u0, u1, va - 0.04, va + run, z - 0.1, z)
    # railings (steel posts + top rail)
    for rid, (ru0, ru1, rv0, rv1) in P.RAILS:
        ax = run_axis((ru0, ru1, rv0, rv1))
        A0, A1 = (ru0, ru1) if ax == "u" else (rv0, rv1)
        tm = ((rv0 + rv1) / 2) if ax == "u" else ((ru0 + ru1) / 2)

        def zf(a):  # rail follows the stair slope where it runs along a stair
            if rid.startswith("rail_up"):
                return (37.5 - a) / (37.5 - 27.375) * (CEIL + SLAB) * 0.92
            if rid == "rail_down_N2":
                return 0.0
            return 0.0

        k = max(2, int((A1 - A0) / 3.0) + 1)
        for i in range(k + 1):
            a = A0 + (A1 - A0) * i / k
            z0 = zf(a)
            pts = (a, tm) if ax == "u" else (tm, a)
            pcyl("WALL", "chrome", pts[0], pts[1], z0, 3.4, 0.07, 12)
        # top rail as a sloped/straight tube
        pa = (A0, tm) if ax == "u" else (tm, A0)
        pb = (A1, tm) if ax == "u" else (tm, A1)
        a_ = W(pa[0], pa[1], zf(A0) + 3.4)
        b_ = W(pb[0], pb[1], zf(A1) + 3.4)
        G.cyl("WALL", "chrome", a_, b_ - a_, 0.025, 12)
        mid_a = W(pa[0], pa[1], zf(A0) + 1.8)
        mid_b = W(pb[0], pb[1], zf(A1) + 1.8)
        G.cyl("WALL", "chrome", mid_a, mid_b - mid_a, 0.015, 10)
    # stairwell side walls below the first floor (between walk path and the down stair)
    pbox("WALL", "paint_ext", 39.5, 40.0, 22.75, 43.0, P.GROUND, -SLAB)


# ============================================================ furniture ======
def plant(u, v, h=3.0, r=0.7):
    pcyl("FURN", "pot", u, v, 0, 1.2, r * 0.75, 18, r)
    pcyl("DECO", "soil", u, v, 1.15, 0.06, r * 0.95, 18)
    for i in range(7):
        a = i * 2.4
        G.sphere("DECO", "leaf", W(u + math.cos(a) * r * 0.45, v + math.sin(a) * r * 0.45, 1.2 + h * (0.35 + 0.08 * (i % 3))),
                 r * FT * 0.75, (1, 1, 1.25), 10, 7)


def fan(u, v):
    pcyl("DECO", "steel", u, v, CEIL - 1.2, 1.2, 0.05, 8)
    pcyl("DECO", "pvc_white", u, v, CEIL - 1.55, 0.4, 0.35, 20)
    for i in range(3):
        a = math.radians(30 + i * 120)
        d = Vector((math.cos(a), math.sin(a), 0))
        p = Vector((-d.y, d.x, 0))
        o = W(u, v, CEIL - 1.38) + d * 0.12 - p * 0.06
        G.obox("DECO", "pvc_white", o, d * 0.6, p * 0.12, (0, 0, 0.012))


def led(u, v, s=2.0):
    pbox("LIGHT", "led", u - s / 2, u + s / 2, v - s / 2, v + s / 2, CEIL - 0.06, CEIL)


def boxes_stack(u0, v0, nu, nv, nz, size=(1.4, 1.2, 1.0), z0=0.0, jitter=0.06, cat="FURN"):
    import random
    r = random.Random(int(u0 * 100 + v0 * 7))
    for i in range(nu):
        for j in range(nv):
            for k in range(nz):
                if k > 0 and r.random() < 0.15:
                    continue
                du, dv = r.uniform(-jitter, jitter), r.uniform(-jitter, jitter)
                a = u0 + i * size[0] + du
                b = v0 + j * size[1] + dv
                pbox(cat, "cardboard", a, a + size[0] - 0.05, b, b + size[1] - 0.05, z0 + k * size[2],
                     z0 + (k + 1) * size[2] - 0.02)


def rack(u0, u1, v0, v1, h=7.0, levels=5, mat="rack_blue", load=0.7):
    """Slotted-angle / pallet rack aligned to the plan, with cartons and bins on shelves."""
    import random
    r = random.Random(int(u0 * 31 + v0 * 17))
    for (a, b) in ((u0, v0), (u0, v1 - 0.12), (u1 - 0.12, v0), (u1 - 0.12, v1 - 0.12)):
        pbox("FURN", mat, a, a + 0.12, b, b + 0.12, 0, h)
    long_u = (u1 - u0) >= (v1 - v0)
    for k in range(levels):
        z = 0.3 + k * (h - 0.5) / (levels - 1)
        e = 0.015
        pbox("FURN", "rack_grey", u0 + e, u1 - e, v0 + e, v1 - e, z - 0.05, z)
        if long_u:
            for b in (v0 + e, v1 - 0.1 - e):
                pbox("FURN", mat, u0 + 0.12, u1 - 0.12, b, b + 0.1, z - 0.25, z - 0.05)
        else:
            for a in (u0 + e, u1 - 0.1 - e):
                pbox("FURN", mat, a, a + 0.1, v0 + 0.12, v1 - 0.12, z - 0.25, z - 0.05)
        if k == levels - 1:
            continue
        gap = (h - 0.5) / (levels - 1) - 0.3
        L = (u1 - u0) if long_u else (v1 - v0)
        D = (v1 - v0) if long_u else (u1 - u0)
        pos = 0.1
        while pos < L - 0.8:
            w = r.uniform(0.9, 1.6)
            if pos + w > L - 0.1:
                break
            if r.random() < load:
                hh = r.uniform(0.5, min(gap, 1.4))
                dd = D * r.uniform(0.7, 0.9)
                mat2 = "cardboard" if r.random() < 0.75 else r.choice(["plastic_blue", "plastic_green", "plastic_red"])
                if long_u:
                    pbox("FURN", mat2, u0 + pos, u0 + pos + w, v0 + 0.08, v0 + 0.08 + dd, z, z + hh)
                else:
                    pbox("FURN", mat2, u0 + 0.08, u0 + 0.08 + dd, v0 + pos, v0 + pos + w, z, z + hh)
            pos += w + 0.1


def chair(u, v, face_u, face_v, mat="walnut", seat="fabric_sofa"):
    """Dining chair centred at (u,v) facing direction (face_u, face_v) (unit, axis-aligned)."""
    s = 0.85
    prbox("FURN", seat, u - s, u + s, v - s, v + s, 1.45, 1.6, 0.05)
    for du in (-s + 0.1, s - 0.18):
        for dv in (-s + 0.1, s - 0.18):
            pbox("FURN", mat, u + du, u + du + 0.08, v + dv, v + dv + 0.08, 0, 1.45)
    bu, bv = u - face_u * (s - 0.05), v - face_v * (s - 0.05)
    if face_u:
        prbox("FURN", mat, bu - 0.06, bu + 0.06, v - s, v + s, 1.6, 3.2, 0.03)
    else:
        prbox("FURN", mat, u - s, u + s, bv - 0.06, bv + 0.06, 1.6, 3.2, 0.03)


def build_furniture():
    # ---------------- Main hall (u 6.25..35.25, v 13..21) -----------------
    # TV wall unit on the north wall, sofa facing it
    prbox("FURN", "walnut", 6.3, 7.6, 14.0, 20.0, 0.4, 1.7, 0.03)
    pbox("DECO", "oak_light", 6.28, 6.36, 13.6, 20.4, 1.7, 8.0)          # wood panel wall behind TV
    pbox("DECO", "screen", 6.4, 6.5, 14.9, 19.1, 3.4, 5.8)                # 55" TV
    pbox("DECO", "black", 6.36, 6.4, 14.85, 19.15, 3.35, 5.85)
    prbox("FURN", "walnut", 6.3, 7.4, 13.8, 15.3, 4.6, 4.8, 0.02)         # floating shelf
    plant(7.3, 20.2, 2.5, 0.55)
    # 3-seater sofa facing north
    prbox("FURN", "fabric_sofa", 12.0, 15.0, 14.3, 19.9, 0.35, 1.45, 0.12)    # base
    prbox("FURN", "fabric_sofa", 14.2, 15.0, 14.3, 19.9, 1.45, 3.0, 0.15)     # back
    prbox("FURN", "fabric_sofa", 12.0, 14.15, 14.3, 15.0, 1.45, 2.3, 0.15)    # arms
    prbox("FURN", "fabric_sofa", 12.0, 14.15, 19.2, 19.9, 1.45, 2.3, 0.15)
    for c in range(3):
        a = 15.0 + c * 1.4
        prbox("DECO", "fabric_sofa", 12.1, 14.2, a + 0.02, a + 1.38, 1.45, 1.9, 0.18)
    prbox("DECO", "fabric_throw", 13.6, 14.2, 15.2, 16.4, 1.9, 3.0, 0.2)       # cushions
    prbox("DECO", "fabric_throw", 13.6, 14.2, 18.0, 19.2, 1.9, 3.0, 0.2)
    for (a, b) in ((14.4, 14.6), (19.6, 19.8)):
        for (c, d) in ((12.1, 12.3), (14.7, 14.9)):
            pbox("FURN", "black", c, d, a, b, 0, 0.35)
    # coffee table + rug
    pbox("DECO", "rug", 8.4, 14.2, 14.6, 19.6, 0.03, 0.05)
    prbox("FURN", "oak_light", 9.3, 11.0, 15.6, 18.4, 1.25, 1.4, 0.03)
    for (a, b) in ((9.4, 15.7), (9.4, 18.2), (10.8, 15.7), (10.8, 18.2)):
        pbox("FURN", "black", a, a + 0.1, b, b + 0.1, 0, 1.25)
    pcyl("DECO", "ceramic", 10.1, 16.5, 1.4, 0.35, 0.25, 16)
    # dining set
    prbox("FURN", "oak_light", 22.0, 26.5, 15.6, 18.4, 2.35, 2.5, 0.03)
    for (a, b) in ((22.2, 15.8), (22.2, 18.1), (26.2, 15.8), (26.2, 18.1)):
        pbox("FURN", "walnut", a, a + 0.12, b, b + 0.12, 0, 2.35)
    for u in (23.1, 25.4):
        chair(u, 14.9, 0, 1)
        chair(u, 19.1, 0, -1)
    chair(21.1, 17.0, 1, 0)
    chair(27.4, 17.0, -1, 0)
    pcyl("DECO", "ceramic", 24.25, 17.0, 2.5, 0.25, 0.45, 20, 0.6)   # fruit bowl
    for i, (a, b) in enumerate(((24.1, 16.9), (24.4, 17.1), (24.25, 16.75))):
        G.sphere("DECO", ["plastic_red", "art2", "plastic_green"][i], W(a, b, 2.85), 0.12 * FT * 2, (1, 1, 1), 10, 6)
    for u in (23.0, 25.5):  # pendant lights over the table
        pcyl("DECO", "black", u, 17.0, 6.2, CEIL - 6.2, 0.02, 6)
        pcyl("LIGHT", "lamp_shade", u, 17.0, 5.6, 0.8, 0.7, 20, 0.25)
    # shoe cabinet + mirror near the main door, console with plant on the west wall
    prbox("FURN", "walnut", 28.6, 31.4, 19.7, 21.0, 0.3, 3.0, 0.03)
    pbox("DECO", "mirror", 28.9, 31.1, 20.92, 21.0, 4.0, 6.5)
    plant(33.9, 13.9, 3.0, 0.7)
    # art on the long west wall
    for (u0, u1, m) in ((16.0, 19.5, "art1"), (20.2, 21.6, "art2")):
        pbox("DECO", "walnut", u0, u1, 20.9, 21.0, 4.0, 6.6)
        pbox("DECO", m, u0 + 0.12, u1 - 0.12, 20.86, 20.9, 4.12, 6.48)
    fan(10.5, 17.0)
    led(17.0, 17.0, 2.0)
    led(29.5, 17.0, 2.0)

    # ---------------- Master bedroom (u 15.75..30.75, v 0.75..12.5) ---------
    bu0, bu1, bv0, bv1 = 15.75, 22.6, 4.1, 9.1
    prbox("FURN", "fabric_sofa", bu0, bu0 + 0.35, bv0 - 0.3, bv1 + 0.3, 0.0, 4.2, 0.1)       # headboard
    prbox("FURN", "walnut", bu0 + 0.35, bu1, bv0, bv1, 0.3, 1.3, 0.04)                         # bed base
    prbox("FURN", "fabric_bed", bu0 + 0.4, bu1 - 0.05, bv0 + 0.05, bv1 - 0.05, 1.3, 2.0, 0.15)  # mattress
    prbox("DECO", "fabric_bed", bu0 + 2.6, bu1 + 0.03, bv0 - 0.02, bv1 + 0.02, 1.6, 2.15, 0.2)  # duvet
    prbox("DECO", "fabric_throw", bu1 - 1.6, bu1 + 0.05, bv0 - 0.04, bv1 + 0.04, 1.65, 2.2, 0.15)
    for (a, b) in ((bv0 + 0.3, bv0 + 2.3), (bv1 - 2.3, bv1 - 0.3)):
        prbox("DECO", "fabric_bed", bu0 + 0.5, bu0 + 1.7, a, b, 2.0, 2.55, 0.25)
    for (a, b) in ((2.2, 3.8), (9.4, 11.0)):
        prbox("FURN", "walnut", 15.8, 17.3, a, b, 0.0, 1.9, 0.03)
        pcyl("DECO", "ceramic", 16.5, (a + b) / 2, 1.9, 0.9, 0.18, 14, 0.08)
        pcyl("LIGHT", "lamp_shade", 16.5, (a + b) / 2, 2.7, 0.8, 0.45, 18, 0.3)
    pbox("DECO", "rug", 21.5, 26.0, 3.2, 10.0, 0.03, 0.05)
    # wardrobe on the south wall (u 28.75..30.75), 3 shutters
    prbox("FURN", "walnut", 28.75, 30.7, 1.2, 8.7, 0.0, 7.6, 0.02)
    for k in range(1, 3):
        v = 1.2 + k * 2.5
        pbox("DECO", "black", 28.72, 28.75, v - 0.02, v + 0.02, 0.2, 7.4)
    for v in (3.5, 3.9, 6.0, 6.4):
        pbox("DECO", "chrome", 28.68, 28.72, v - 0.03, v + 0.03, 3.0, 4.6)
    # study desk under the window + chair
    prbox("FURN", "oak_light", 23.0, 27.0, 0.8, 2.8, 2.35, 2.5, 0.02)
    prbox("FURN", "oak_light", 26.4, 27.0, 0.8, 2.8, 0.0, 2.35, 0.02)
    prbox("FURN", "oak_light", 23.0, 23.6, 0.8, 2.8, 0.0, 2.35, 0.02)
    chair(25.0, 3.6, 0, -1, "black", "fabric_throw")
    pbox("DECO", "black", 24.2, 25.8, 1.0, 1.1, 2.5, 3.6)         # monitor
    # curtains either side of the window
    for (a, b) in ((19.2, 20.4), (25.1, 26.3)):
        prbox("DECO", "fabric_curtain", a, b, 0.85, 1.15, 0.2, 8.2, 0.12)
    pcyl("DECO", "chrome", 19.0, 1.0, 8.3, 0.05, 0.04, 6)
    pbox("DECO", "chrome", 19.0, 26.5, 0.97, 1.03, 8.3, 8.36)
    # art above the bed
    pbox("DECO", "walnut", 15.75, 15.85, 4.8, 8.4, 4.8, 6.6)
    pbox("DECO", "art2", 15.85, 15.88, 4.95, 8.25, 4.95, 6.45)
    fan(23.25, 6.6)
    led(19.5, 6.6, 2.0)

    # ---------------- Master bath (u 11.25..15.25, v 0.75..12.5) ----------
    # door at the east end; WC at the west end, basin mid, shower in the middle
    # door at the east end -> vanity, then WC, shower at the far (west) end
    prbox("FURN", "granite_black", 11.3, 13.0, 3.7, 5.9, 2.6, 2.75, 0.02)       # vanity top
    prbox("FURN", "walnut", 11.3, 12.9, 3.8, 5.8, 1.2, 2.6, 0.02)              # vanity cabinet
    pcyl("FURN", "ceramic", 12.15, 4.8, 2.75, 0.45, 0.65, 24, 0.75)            # vessel basin
    pcyl("DECO", "chrome", 11.55, 4.8, 2.75, 0.8, 0.05, 8)
    pbox("DECO", "mirror", 11.28, 11.31, 3.9, 5.7, 4.0, 6.5)
    wc(15.25, 7.9, "-u")
    pbox("GLASS", "glass", 11.25, 13.4, 10.0, 10.05, 0.05, 6.8)                # shower glass
    pbox("FLOOR", "bathfloor", 11.25, 15.25, 10.05, 12.5, 0.03, 0.06)          # shower tray step
    pcyl("DECO", "chrome", 13.25, 12.0, 6.6, 0.1, 0.4, 20)                     # rain shower
    pbox("DECO", "chrome", 13.22, 13.28, 12.0, 12.47, 6.62, 6.7)
    pbox("DECO", "chrome", 12.9, 13.6, 12.44, 12.47, 3.5, 3.7)                 # mixer
    led(13.25, 7.5, 1.0)

    # ---------------- Store room bath (u 0.75..5.75, v 13..21) ------------
    wc(5.75, 19.0, "-u")
    pcyl("FURN", "ceramic", 5.2, 15.4, 2.3, 0.5, 0.75, 24, 0.85)              # wall basin
    pbox("FURN", "ceramic", 5.3, 5.75, 14.8, 16.0, 1.6, 2.3)
    pcyl("DECO", "chrome", 5.6, 15.4, 2.8, 0.5, 0.05, 8)
    pbox("DECO", "mirror", 5.72, 5.75, 14.6, 16.2, 4.0, 5.8)
    pcyl("DECO", "chrome", 1.1, 20.6, 6.4, 0.1, 0.3, 18)                      # shower
    pbox("DECO", "chrome", 0.78, 1.1, 20.57, 20.63, 6.4, 6.45)
    pcyl("FURN", "plastic_blue", 1.6, 19.5, 0.03, 1.2, 0.6, 20, 0.7)          # bucket
    pbox("DECO", "chrome", 0.78, 0.84, 18.5, 19.5, 2.5, 2.7)                  # tap
    led(3.25, 17.0, 1.0)

    # ---------------- Common bath (u 32.25..35.25, v 21.5..27) -----------
    wc(33.75, 27.0, "-v")
    pcyl("FURN", "ceramic", 32.7, 23.8, 2.3, 0.5, 0.6, 24, 0.7)
    pbox("FURN", "ceramic", 32.25, 32.55, 23.3, 24.3, 1.6, 2.3)
    pbox("DECO", "mirror", 32.25, 32.28, 23.2, 24.4, 4.0, 5.6)
    led(33.75, 24.0, 1.0)

    # ---------------- Kitchen (u 31.25..39.25, v 0.75..12.5) -------------
    ct = 2.65
    # along the east wall (full length) and the south wall
    counters = [(31.25, 39.25, 0.75, 2.75), (37.25, 39.25, 2.75, 10.6)]
    for (u0, u1, v0, v1) in counters:
        pbox("FURN", "black", u0, u1, v0, v1, 0, 0.33)
        prbox("FURN", "kitchen_shutter", u0 + (0.05 if u0 > 31.3 else 0), u1, v0, v1, 0.33, ct, 0.02)
        prbox("FURN", "granite_black", u0, u1, v0, v1, ct, ct + 0.13, 0.02)
    # shutter grooves + handles on the counter fronts
    for u in (33.0, 35.0, 37.25):
        pbox("DECO", "black", u - 0.02, u + 0.02, 2.75, 2.78, 0.4, ct - 0.05)
        pbox("DECO", "chrome", u - 0.6, u - 0.2, 2.76, 2.82, ct - 0.25, ct - 0.18)
    for v in (5.0, 7.5, 10.6):
        pbox("DECO", "black", 37.22, 37.25, v - 0.02, v + 0.02, 0.4, ct - 0.05)
    # dado tiles behind counters
    pbox("WALL", "kitchen_dado", 31.25, 39.25, 0.78, 0.82, ct + 0.13, 5.0)
    pbox("WALL", "kitchen_dado", 39.18, 39.22, 0.75, 12.5, ct + 0.13, 5.0)
    # sink under the east window
    pbox("DECO", "steel", 34.2, 36.2, 1.1, 2.4, ct + 0.135, ct + 0.14)
    pbox("DECO", "black", 34.35, 36.05, 1.25, 2.25, ct + 0.14, ct + 0.145)
    pcyl("DECO", "chrome", 35.2, 1.0, ct + 0.13, 1.1, 0.05, 10)
    G.cyl("DECO", "chrome", W(35.2, 1.0, ct + 1.2), (-0.8 * FT, 0, 0), 0.015, 8)
    # 3-burner hob + chimney on the south counter (west part)
    pbox("DECO", "black", 37.6, 38.9, 7.8, 10.2, ct + 0.13, ct + 0.17)
    for (a, b) in ((38.0, 8.3), (38.0, 9.6), (38.5, 9.0)):
        pcyl("DECO", "steel", a, b, ct + 0.17, 0.04, 0.22, 16)
    pcyl("DECO", "steel", 38.0, 8.3, ct + 0.21, 0.5, 0.35, 20)                  # pressure cooker-ish pot
    pcyl("DECO", "black", 38.0, 9.6, ct + 0.21, 0.12, 0.42, 20)                 # tawa
    prbox("FURN", "black", 37.6, 39.2, 7.8, 10.2, 6.0, 6.6, 0.04)               # chimney hood
    pbox("FURN", "steel", 38.4, 39.2, 8.6, 9.4, 6.6, CEIL)
    # upper cabinets on the east wall (clear of the window)
    for (u0, u1) in ((31.3, 32.9), (37.3, 39.2)):
        prbox("FURN", "kitchen_shutter", u0, u1, 0.8, 1.9, 5.0, 7.4, 0.02)
    # fridge against the north wall
    prbox("FURN", "fridge", 31.3, 33.6, 3.0, 5.6, 0.0, 6.1, 0.08)
    pbox("DECO", "chrome", 33.6, 33.68, 5.2, 5.3, 2.5, 5.5)
    # utensils / jars
    for i in range(5):
        pcyl("DECO", ["ceramic", "plastic_red", "steel", "plastic_green", "ceramic"][i], 31.7 + i * 0.35, 1.3, ct + 0.13, 0.45, 0.13, 12)
    pbox("DECO", "oak_light", 36.6, 37.1, 1.0, 2.3, ct + 0.13, ct + 0.2)       # chopping board
    led(35.25, 6.6, 2.0)

    # ---------------- Store room NE (u 0.75..10.75, v 0.75..12.5) ---------
    rack(9.25, 10.7, 1.0, 4.8, 7.0, 5, "rack_grey")
    rack(9.25, 10.7, 4.9, 8.7, 7.0, 5, "rack_grey")
    prbox("FURN", "almirah", 0.8, 2.6, 0.8, 3.3, 0.0, 6.5, 0.03)        # steel almirah
    pbox("DECO", "black", 2.6, 2.62, 2.03, 2.07, 0.3, 6.3)
    pbox("DECO", "chrome", 2.6, 2.68, 1.8, 1.9, 3.0, 3.6)
    boxes_stack(1.0, 4.5, 2, 2, 2, (1.3, 1.5, 1.1))
    for i in range(3):
        pbox("FURN", ["plastic_blue", "plastic_green", "plastic_red"][i], 5.6 + i * 0.05, 6.9 + i * 0.05,
             1.0 + i * 1.6, 2.4 + i * 1.6, i * 0.0, 1.0)
    # aluminium ladder leaning on the east wall
    for v in (9.0, 10.2):  # aluminium ladder against the north wall
        pbox("FURN", "steel", 0.8, 0.95, v, v + 0.12, 0.0, 7.0)
    for k in range(1, 7):
        pbox("FURN", "steel", 0.8, 0.9, 9.0, 10.32, k * 1.0, k * 1.0 + 0.08)
    led(5.75, 6.6, 2.0)

    # ---------------- Stores 1/2/3 (each u 10 x v 16, shutters on the west) ----
    for (u0, u1) in ((0.75, 10.75), (11.25, 21.25), (21.75, 31.75)):
        tall_n = u0 > 1  # store 1 has a north window; keep its north rack low
        rack(u0 + 0.05, u0 + 2.55, 22.0, 29.6, 3.0 if not tall_n else 8.5, 3 if not tall_n else 6, "rack_orange" if u0 < 30 else "rack_blue")
        rack(u0 + 0.05, u0 + 2.55, 29.8, 35.8, 3.0 if not tall_n else 8.5, 3 if not tall_n else 6, "rack_orange" if u0 < 30 else "rack_blue")
        rack(u1 - 2.55, u1 - 0.05, 22.0, 29.6, 8.5, 6, "rack_blue")
        rack(u1 - 2.55, u1 - 0.05, 29.8, 35.8, 8.5, 6, "rack_blue")
        # pallet with cartons against the back (east) wall
        pbox("FURN", "oak_light", u0 + 3.2, u1 - 3.2, 21.6, 25.0, 0.0, 0.45)
        boxes_stack(u0 + 3.25, 21.65, 2, 2, 3, ((u1 - u0 - 6.5) / 2, 1.65, 1.2), 0.45)
        led((u0 + u1) / 2, 26.0, 2.0)
        led((u0 + u1) / 2, 33.0, 2.0)
    # store 3: small desk + chair near its door
    prbox("FURN", "oak_light", 26.0, 27.5, 35.0, 37.4, 2.4, 2.55, 0.02)
    pbox("FURN", "steel", 26.0, 26.1, 35.0, 37.4, 0, 2.4)
    pbox("FURN", "steel", 27.4, 27.5, 35.0, 37.4, 0, 2.4)
    chair(26.8, 34.2, 0, 1, "black", "black")

    # ---------------- Kitchen outside space, entrance, walk path, foot path ----
    prbox("FURN", "pvc_white", 40.3, 42.6, 9.5, 11.8, 0.0, 2.8, 0.08)             # washing machine
    pcyl("DECO", "glass", 40.25, 10.65, 1.1, 0.0, 0.7, 24, caps=False)
    G.cyl("DECO", "black", W(40.28, 10.65, 1.4), (0, 0.04 * FT, 0), 0.6 * FT, 24)
    prbox("FURN", "granite_black", 40.2, 42.9, 3.5, 6.5, 2.6, 2.75, 0.02)         # utility sink slab
    pbox("FURN", "paint_ext", 42.4, 42.9, 3.5, 6.5, 0, 2.6)
    pbox("DECO", "steel", 40.8, 42.4, 4.2, 5.8, 2.75, 2.76)
    pbox("DECO", "black", 40.9, 42.3, 4.3, 5.7, 2.76, 2.765)
    pbox("DECO", "rug", 37.0, 38.8, 17.3, 20.2, 0.03, 0.06)                       # door mat
    for (u, v) in ((42.2, 14.0), (42.2, 20.2), (41.8, 1.8), (36.8, 22.2)):
        plant(u, v, 2.6, 0.6)
    for u in (4.5, 15.5, 25.5, 35.0):                                             # foot path planters
        plant(u, 42.3, 2.2, 0.55)
    # wall lights on the walkway side of the stores
    for u in (10.75, 21.25, 31.75):
        pbox("LIGHT", "lamp_shade", u - 0.35, u + 0.35, 38.25, 38.45, 7.6, 8.4)
    for (u, v) in ((41.5, 17.0), (37.5, 30.0), (41.5, 6.6)):
        led(u, v, 1.2)
    for u in (6.0, 18.0, 30.0):
        led(u, 40.6, 1.2)


def wc(u_wall, v_wall, facing):
    """Wall-hung style WC with cistern against a wall. facing: direction the user faces when seated."""
    if facing == "-v":    # wall at larger v
        uc = u_wall
        prbox("FURN", "ceramic", uc - 0.75, uc + 0.75, v_wall - 0.5, v_wall, 0.0, 2.6, 0.08)       # cistern/box
        G.sphere("FURN", "ceramic", W(uc, v_wall - 1.4, 1.2), 0.75 * FT, (0.8, 1.1, 0.55), 18, 10)
        pbox("FURN", "ceramic", uc - 0.45, uc + 0.45, v_wall - 1.5, v_wall - 0.5, 0.0, 1.1)
        prbox("DECO", "pvc_white", uc - 0.62, uc + 0.62, v_wall - 2.25, v_wall - 0.5, 1.45, 1.55, 0.04)
        pbox("DECO", "chrome", uc - 0.2, uc + 0.2, v_wall - 0.53, v_wall - 0.5, 2.9, 3.1)
    else:                 # "-u": wall at larger u
        vc = v_wall
        prbox("FURN", "ceramic", u_wall - 0.5, u_wall, vc - 0.75, vc + 0.75, 0.0, 2.6, 0.08)
        G.sphere("FURN", "ceramic", W(u_wall - 1.4, vc, 1.2), 0.75 * FT, (1.1, 0.8, 0.55), 18, 10)
        pbox("FURN", "ceramic", u_wall - 1.5, u_wall - 0.5, vc - 0.45, vc + 0.45, 0.0, 1.1)
        prbox("DECO", "pvc_white", u_wall - 2.25, u_wall - 0.5, vc - 0.62, vc + 0.62, 1.45, 1.55, 0.04)


# ============================================================ assemble =======
def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def make_objects():
    cols = {}
    for (cat, mat), p in G.parts.items():
        if not p["f"]:
            continue
        col = cols.get(cat)
        if col is None:
            col = bpy.data.collections.new(cat)
            bpy.context.scene.collection.children.link(col)
            cols[cat] = col
        me = bpy.data.meshes.new(f"{cat}__{mat}")
        me.from_pydata(p["v"], [], p["f"])
        me.validate(clean_customdata=False)
        me.update()
        tile = MATS[mat][1]
        uvl = me.uv_layers.new(name="UVMap")
        verts = me.vertices
        for poly in me.polygons:
            n = poly.normal
            ax = max(range(3), key=lambda i: abs(n[i]))
            poly.use_smooth = p["s"][poly.index] if poly.index < len(p["s"]) else False
            if tile is None:  # fit 0..1 over the polygon's bounds (rugs, cartons)
                cs = [verts[verts_i].co for verts_i in poly.vertices]
                lo = [min(c[i] for c in cs) for i in range(3)]
                hi = [max(c[i] for c in cs) for i in range(3)]
            for li in poly.loop_indices:
                co = verts[me.loops[li].vertex_index].co
                if ax == 2:
                    a, b, ia, ib = co.x, co.y, 0, 1
                elif ax == 0:
                    a, b, ia, ib = co.y, co.z, 1, 2
                else:
                    a, b, ia, ib = co.x, co.z, 0, 2
                if tile is None:
                    a = (a - lo[ia]) / max(hi[ia] - lo[ia], 1e-6)
                    b = (b - lo[ib]) / max(hi[ib] - lo[ib], 1e-6)
                    uvl.data[li].uv = (a, b)
                else:
                    uvl.data[li].uv = (a / tile, b / tile)
        me.materials.append(get_mat(mat))
        ob = bpy.data.objects.new(f"{cat}__{mat}", me)
        col.objects.link(ob)
    return cols


def add_lights():
    col = bpy.data.collections.new("LAMPS")
    bpy.context.scene.collection.children.link(col)
    warm = (1.0, 0.88, 0.74)
    for (rid, label, rect, floor, paint, kind) in P.ROOMS:
        if kind == "stair":
            continue
        u0, u1, v0, v1 = rect
        area = (u1 - u0) * (v1 - v0)
        pts = [((u0 + u1) / 2, (v0 + v1) / 2)]
        if rid == "main_hall":
            pts = [(11, 17), (19, 17), (28, 17)]
        if rid in ("store1", "store2", "store3"):
            pts = [((u0 + u1) / 2, 26), ((u0 + u1) / 2, 33)]
        if rid == "west_path":
            pts = [(6, 40.6), (18, 40.6), (30, 40.6)]
        for (u, v) in pts:
            ld = bpy.data.lights.new(f"L_{rid}", "AREA")
            ld.shape = "SQUARE"
            ld.size = 0.6
            ld.energy = max(40.0, area * 1.5 / len(pts)) * (0.5 if kind == "open" else 1.0)
            ld.color = warm
            ob = bpy.data.objects.new(f"L_{rid}", ld)
            ob.location = W(u, v, CEIL - 0.1)
            col.objects.link(ob)
    # sun: late afternoon from the west-south-west (road side)
    sd = bpy.data.lights.new("Sun", "SUN")
    sd.energy = 4.0
    sd.angle = math.radians(1.0)
    sd.color = (1.0, 0.92, 0.82)
    so = bpy.data.objects.new("Sun", sd)
    d = Vector((1.0, 0.35, -0.75)).normalized()  # light travels toward east-north, downward
    so.rotation_euler = Vector((0, 0, -1)).rotation_difference(d).to_euler()
    col.objects.link(so)
    # world: soft sky gradient
    wd = bpy.data.worlds.new("Sky")
    bpy.context.scene.world = wd
    wd.use_nodes = True
    nt = wd.node_tree
    bg = nt.nodes["Background"]
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.0
    ramp.color_ramp.elements[0].color = (0.85, 0.82, 0.76, 1)
    ramp.color_ramp.elements[1].position = 0.6
    ramp.color_ramp.elements[1].color = (0.35, 0.55, 0.85, 1)
    nt.links.new(tc.outputs["Generated"], sep.inputs[0])
    nt.links.new(sep.outputs["Z"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bg.inputs["Color"])
    bg.inputs["Strength"].default_value = 1.2


# Viewpoints live in plan.py (shared with the web viewer)
CAMS = {k: (v["eye"][0], v["eye"][1], v["eye"][2], v["look"][0], v["look"][1], v["look"][2], v["lens"],
            tuple(v.get("hide", ()))) for k, v in P.VIEWS.items()}
CAMS["plan_top"] = None


def setup_render(res, samples):
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = samples
    sc.cycles.use_denoising = True
    try:
        sc.cycles.denoiser = "OPENIMAGEDENOISE"
    except Exception:
        pass
    sc.cycles.max_bounces = 6
    sc.cycles.diffuse_bounces = 3
    sc.cycles.glossy_bounces = 2
    sc.cycles.transmission_bounces = 4
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.image_settings.file_format = "JPEG"
    sc.render.image_settings.quality = 90
    sc.view_settings.view_transform = "AgX"
    sc.view_settings.look = "AgX - Medium High Contrast"
    sc.render.threads_mode = "AUTO"


def render_cam(name, out_dir, res):
    sc = bpy.context.scene
    cd = bpy.data.cameras.new(name)
    co = bpy.data.objects.new("CAM_" + name, cd)
    sc.collection.objects.link(co)
    hide = ()
    exposure = 0.0
    if name == "plan_top":
        cd.type = "ORTHO"
        cd.ortho_scale = 46.0 * FT
        co.location = W(21.75, 21.75, 60.0)
        co.rotation_euler = (0, 0, math.radians(-90))
        hide = ("CEIL", "UPPER", "LIGHT")
        sc.render.resolution_x, sc.render.resolution_y = 1400, 1400
        exposure = 0.3
    else:
        u, v, z, lu, lv, lz, lens, hide = CAMS[name]
        cd.lens = lens
        cd.clip_end = 400
        co.location = W(u, v, z)
        d = W(lu, lv, lz) - co.location
        co.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
        sc.render.resolution_x, sc.render.resolution_y = res
        exposure = 0.0
    sc.view_settings.exposure = exposure
    sc.camera = co
    for c in bpy.data.collections:
        c.hide_render = c.name in hide
    sc.render.filepath = os.path.join(out_dir, name + ".jpg")
    bpy.ops.render.render(write_still=True)
    print("rendered", sc.render.filepath, flush=True)


def main():
    clear_scene()
    sc = bpy.context.scene
    sc.unit_settings.system = "METRIC"
    if not os.path.isdir(ARGS["tex"]) or not os.listdir(ARGS["tex"]):
        import textures
        textures.build(ARGS["tex"])
    build_slabs()
    build_walls()
    build_rooms()
    build_stairs()
    build_furniture()
    build_site()
    make_objects()
    print("objects:", len(bpy.data.objects), "faces:", sum(len(p["f"]) for p in G.parts.values()), flush=True)
    if ARGS["glb"]:
        for o in bpy.data.objects:
            o.select_set(True)
        bpy.ops.export_scene.gltf(filepath=ARGS["glb"], export_format="GLB", use_selection=False,
                                  export_lights=False, export_cameras=False, export_image_format="AUTO",
                                  export_apply=True, export_yup=True)
        print("glb:", ARGS["glb"], os.path.getsize(ARGS["glb"]) // 1024, "KB", flush=True)
    add_lights()
    if ARGS["blend"]:
        bpy.ops.wm.save_as_mainfile(filepath=ARGS["blend"])
    if ARGS["renders"] != "none":
        os.makedirs(ARGS["out"], exist_ok=True)
        setup_render(ARGS["res"], ARGS["samples"])
        names = list(CAMS) if ARGS["renders"] == "all" else ARGS["renders"].split(",")
        for n in names:
            render_cam(n, ARGS["out"], ARGS["res"])


main()
