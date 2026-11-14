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
    --bake N         bake GI lightmaps (viewer/lm_*.jpg) with N samples; 0 = skip (default)
    --panos LIST     render 360-degree equirect panoramas (ids from plan.PANOS, or "all") to viewer/pano/
    --pano_res WxH   panorama size (default 4096x2048)   --pano_samples N (default 96)
    --samples N      Cycles samples (default 96)
    --res WxH        render size (default 1600x900)
"""
import math
import os
import sys
from contextlib import contextmanager, nullcontext

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
         "out": os.path.join(HERE, "renders"), "samples": 96, "res": "1600x900", "bake": "0",
         "panos": "none", "pano_res": "4096x2048", "pano_samples": 96}
    i = 0
    while i < len(argv):
        k = argv[i].lstrip("-")
        if k in a:
            a[k] = argv[i + 1]
            i += 2
        else:
            i += 1
    a["samples"] = int(a["samples"])
    a["pano_samples"] = int(a["pano_samples"])
    a["pano_res"] = tuple(int(x) for x in a["pano_res"].split("x"))
    a["res"] = tuple(int(x) for x in a["res"].split("x"))
    return a


ARGS = parse_args()


# ============================================================ geometry ======
def W(u, v, z=0.0):
    """plan feet -> Blender metres"""
    return Vector((-v * FT, -u * FT, z * FT))


BAKE_CATS = {"WALL": "WALL", "FLOOR": "FLOOR", "CEIL": "CEIL", "FCEIL": "CEIL"}   # category -> lightmap atlas
NO_BAKE_MATS = {"glass", "glass_frosted", "chrome", "steel", "mirror", "frame_alu", "shutter", "rack_grey"}
ITEMS = {}   # item id -> {"label", "layer"}   (things the viewer can select / move / remove)


class Geo:
    """Accumulates faces per (category, material, item) so the GLB has few draw calls.
    Faces of the fixed shell also get a rectangle in a lightmap atlas (baked GI)."""

    def __init__(self):
        self.parts = {}
        self.cur = None      # current item id (None = fixed shell)

    def _part(self, cat, mat):
        return self.parts.setdefault((cat, mat, self.cur), {"v": [], "f": [], "s": [], "lm": []})

    def add_faces(self, cat, mat, verts, faces, smooth=False, center=None, lm=None):
        p = self._part(cat, mat)
        base = len(p["v"])
        p["v"].extend(tuple(v) for v in verts)
        for fi, f in enumerate(faces):
            l = lm[fi] if lm else None
            if center is not None:  # make winding point away from the solid's centre
                pts = [Vector(verts[i]) for i in f]
                n = Vector((0, 0, 0))
                for i in range(len(pts)):
                    a, b = pts[i], pts[(i + 1) % len(pts)]
                    n += Vector(((a.y - b.y) * (a.z + b.z), (a.z - b.z) * (a.x + b.x), (a.x - b.x) * (a.y + b.y)))
                c = sum(pts, Vector()) / len(pts)
                if n.dot(c - center) < 0:
                    f = tuple(reversed(f))
                    if l:
                        l = (l[0], l[1], list(reversed(l[2])))
            p["f"].append(tuple(base + i for i in f))
            p["s"].append(smooth)
            p["lm"].append(l)

    def obox(self, cat, mat, o, e1, e2, e3, skip=()):
        """Oriented box o + [0,1]e1 + [0,1]e2 + [0,1]e3."""
        o, e1, e2, e3 = Vector(o), Vector(e1), Vector(e2), Vector(e3)
        E = (e1, e2, e3)
        vs = [o + e1 * (i & 1) + e2 * ((i >> 1) & 1) + e3 * ((i >> 2) & 1) for i in range(8)]
        faces = {"-z": (0, 2, 3, 1), "+z": (4, 5, 7, 6), "-y": (0, 1, 5, 4),
                 "+y": (2, 6, 7, 3), "-x": (0, 4, 6, 2), "+x": (1, 3, 7, 5)}
        fixed = {"x": 0, "y": 1, "z": 2}
        fs, lm = [], []
        bake = cat in BAKE_CATS and mat not in NO_BAKE_MATS
        for k, f in faces.items():
            if k in skip:
                continue
            fs.append(f)
            if bake:
                a, b = [i for i in range(3) if i != fixed[k[1]]]
                lm.append((E[a].length, E[b].length, [((i >> a) & 1, (i >> b) & 1) for i in f]))
        self.add_faces(cat, mat, vs, fs, center=o + (e1 + e2 + e3) / 2, lm=lm if bake else None)

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
_auto = {}


@contextmanager
def item(iid, label, layer="furniture"):
    """Everything built inside becomes one selectable / movable / removable object in the viewer."""
    prev = G.cur
    G.cur = iid
    ITEMS[iid] = {"label": label, "layer": layer}
    try:
        yield
    finally:
        G.cur = prev


def auto_item(kind, label, layer="furniture"):
    if G.cur is not None:
        return nullcontext()
    _auto[kind] = _auto.get(kind, 0) + 1
    return item(f"{kind}_{_auto[kind]}", f"{label} {_auto[kind]}", layer)


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
    "cove": (None, 1, 0.5, 0, (1, 1, 1), {"emit": (1.0, 0.82, 0.60), "emit_strength": 5.0}),
    "pipe_cold": (None, 1, 0.4, 0, (0.10, 0.35, 0.85), {}),
    "pipe_hot": (None, 1, 0.4, 0, (0.85, 0.15, 0.12), {}),
    "pipe_drain": (None, 1, 0.5, 0, (0.45, 0.42, 0.38), {}),
    "conduit": (None, 1, 0.45, 0, (0.95, 0.60, 0.05), {}),
    "plate": (None, 1, 0.3, 0, (0.95, 0.95, 0.93), {}),
    "db_box": (None, 1, 0.4, 0.3, (0.75, 0.77, 0.78), {}),
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
        pbox("SITE", "paint_ext", u0, u1, v0, v1, -SLAB, 0.0)
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
def as_item(kind, label, layer="furniture"):
    def deco(fn):
        def wrapped(*a, **k):
            with auto_item(kind, label, layer):
                return fn(*a, **k)
        return wrapped
    return deco


@as_item("plant", "Plant")
def plant(u, v, h=3.0, r=0.7):
    pcyl("FURN", "pot", u, v, 0, 1.2, r * 0.75, 18, r)
    pcyl("DECO", "soil", u, v, 1.15, 0.06, r * 0.95, 18)
    for i in range(7):
        a = i * 2.4
        G.sphere("DECO", "leaf", W(u + math.cos(a) * r * 0.45, v + math.sin(a) * r * 0.45, 1.2 + h * (0.35 + 0.08 * (i % 3))),
                 r * FT * 0.75, (1, 1, 1.25), 10, 7)


@as_item("fan", "Ceiling fan")
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


@as_item("cartons", "Cartons")
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


@as_item("rack", "Steel rack")
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


@as_item("chair", "Chair")
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


SPOTS = []   # recessed downlights (u, v, z) -> Blender spot lights + viewer


def downlight(u, v, z):
    pcyl("DECO", "pvc_white", u, v, z - 0.03, 0.03, 0.17, 20)
    pcyl("LIGHT", "led", u, v, z - 0.035, 0.01, 0.12, 20)
    SPOTS.append((u, v, z))


def false_ceiling(rid, label, rect, spots, band=1.5, drop=0.75, full=False, tray=None):
    """Gypsum false ceiling: a dropped perimeter band with a hidden LED cove and recessed downlights
    (or a full flat board for kitchens / baths, which also hides the pipes above)."""
    u0, u1, v0, v1 = rect
    z = CEIL - drop
    with item(f"fc_{rid}", f"False ceiling - {label}", "false_ceiling"):
        if full:
            pbox("FCEIL", "paint_ceiling", u0, u1, v0, v1, z, z + 0.08)
        else:
            for (a0, a1, b0, b1) in ((u0, u0 + band, v0, v1), (u1 - band, u1, v0, v1),
                                     (u0 + band, u1 - band, v0, v0 + band), (u0 + band, u1 - band, v1 - band, v1)):
                pbox("FCEIL", "paint_ceiling", a0, a1, b0, b1, z, z + 0.08)
            # fascia (inner upstand) hiding the LED strip
            i0, i1, j0, j1 = u0 + band, u1 - band, v0 + band, v1 - band
            for (a0, a1, b0, b1) in ((i0 - 0.08, i0, j0, j1), (i1, i1 + 0.08, j0, j1),
                                     (i0 - 0.08, i1 + 0.08, j0 - 0.08, j0), (i0 - 0.08, i1 + 0.08, j1, j1 + 0.08)):
                pbox("FCEIL", "paint_ceiling", a0, a1, b0, b1, z + 0.08, z + 0.38)
            for (a0, a1, b0, b1) in ((i0 - 0.3, i0 - 0.14, j0, j1), (i1 + 0.14, i1 + 0.3, j0, j1),
                                     (i0, i1, j0 - 0.3, j0 - 0.14), (i0, i1, j1 + 0.14, j1 + 0.3)):
                pbox("LIGHT", "cove", a0, a1, b0, b1, z + 0.08, z + 0.12)
            if tray:
                pbox("FCEIL", tray, i0, i1, j0, j1, CEIL - 0.05, CEIL - 0.001)
        for (u, v) in spots:
            downlight(u, v, z)


def build_false_ceilings():
    hall = [(u, v) for u in (8.5, 12.5, 16.5, 20.5, 24.5, 28.5, 32.5) for v in (13.75, 20.25)] + [(7.0, 17.0), (34.5, 17.0)]
    false_ceiling("main_hall", "Main Hall", (6.25, 35.25, 13.0, 21.0), hall, tray="oak_light")
    bed = [(u, v) for u in (18.5, 23.25, 28.0) for v in (1.5, 11.75)] + [(16.5, 4.5), (16.5, 8.7), (30.0, 6.6)]
    false_ceiling("master_bedroom", "Master Bedroom", (15.75, 30.75, 0.75, 12.5), bed)
    false_ceiling("kitchen", "Kitchen", (31.25, 39.25, 0.75, 12.5), [(u, v) for u in (33.5, 37.0) for v in (2.8, 6.6, 10.4)],
                  full=True, drop=0.9)
    false_ceiling("master_bath", "Master Bath", (11.25, 15.25, 0.75, 12.5), [(13.25, 3.0), (13.25, 7.0), (13.25, 11.0)],
                  full=True, drop=1.5)
    false_ceiling("storeroom_bath", "Store Room Bath", (0.75, 5.75, 13.0, 21.0), [(3.25, 15.0), (3.25, 19.0)],
                  full=True, drop=1.5)
    false_ceiling("common_bath", "Common Bath", (32.25, 35.25, 21.5, 27.0), [(33.75, 24.2)], full=True, drop=1.5)


def build_furniture():
    # ---------------- Main hall (u 6.25..35.25, v 13..21) -----------------
    with item("tv_unit", "TV unit"):
        prbox("FURN", "walnut", 6.3, 7.6, 14.0, 20.0, 0.4, 1.7, 0.03)
        pbox("DECO", "oak_light", 6.28, 6.36, 13.6, 20.4, 1.7, 8.0)          # wood panel behind TV
        pbox("DECO", "screen", 6.4, 6.5, 14.9, 19.1, 3.4, 5.8)                # 55" TV
        pbox("DECO", "black", 6.36, 6.4, 14.85, 19.15, 3.35, 5.85)
        prbox("FURN", "walnut", 6.3, 7.4, 13.8, 15.3, 4.6, 4.8, 0.02)         # floating shelf
    plant(7.3, 20.2, 2.5, 0.55)
    with item("sofa", "Sofa (3-seater)"):
        prbox("FURN", "fabric_sofa", 12.0, 15.0, 14.3, 19.9, 0.35, 1.45, 0.12)    # base
        prbox("FURN", "fabric_sofa", 14.2, 15.0, 14.3, 19.9, 1.45, 3.0, 0.15)     # back
        prbox("FURN", "fabric_sofa", 12.0, 14.15, 14.3, 15.0, 1.45, 2.3, 0.15)    # arms
        prbox("FURN", "fabric_sofa", 12.0, 14.15, 19.2, 19.9, 1.45, 2.3, 0.15)
        for c in range(3):
            a = 15.0 + c * 1.4
            prbox("DECO", "fabric_sofa", 12.1, 14.2, a + 0.02, a + 1.38, 1.45, 1.9, 0.18)
            prbox("DECO", "fabric_sofa", 13.75, 14.25, a + 0.05, a + 1.35, 1.9, 2.95, 0.2)   # back cushions
        prbox("DECO", "fabric_throw", 13.45, 13.85, 15.2, 16.3, 1.9, 2.9, 0.2)     # scatter cushions
        prbox("DECO", "fabric_bed", 13.45, 13.85, 18.0, 19.1, 1.9, 2.9, 0.2)
        for (a, b) in ((14.4, 14.6), (19.6, 19.8)):
            for (c, d) in ((12.1, 12.3), (14.7, 14.9)):
                pbox("FURN", "black", c, d, a, b, 0, 0.35)
    with item("rug_hall", "Rug (hall)"):
        pbox("DECO", "rug", 8.4, 14.2, 14.6, 19.6, 0.03, 0.05)
    with item("coffee_table", "Coffee table"):
        prbox("FURN", "oak_light", 9.3, 11.0, 15.6, 18.4, 1.25, 1.4, 0.03)
        for (a, b) in ((9.4, 15.7), (9.4, 18.2), (10.8, 15.7), (10.8, 18.2)):
            pbox("FURN", "black", a, a + 0.1, b, b + 0.1, 0, 1.25)
        pcyl("DECO", "ceramic", 10.1, 16.5, 1.4, 0.35, 0.25, 16)
    with item("dining_table", "Dining table"):
        prbox("FURN", "oak_light", 22.0, 26.5, 15.6, 18.4, 2.35, 2.5, 0.03)
        for (a, b) in ((22.2, 15.8), (22.2, 18.1), (26.2, 15.8), (26.2, 18.1)):
            pbox("FURN", "walnut", a, a + 0.12, b, b + 0.12, 0, 2.35)
        pcyl("DECO", "ceramic", 24.25, 17.0, 2.5, 0.25, 0.45, 20, 0.6)   # fruit bowl
        for i, (a, b) in enumerate(((24.1, 16.9), (24.4, 17.1), (24.25, 16.75))):
            G.sphere("DECO", ["plastic_red", "art2", "plastic_green"][i], W(a, b, 2.85), 0.12 * FT * 2, (1, 1, 1), 10, 6)
    for u in (23.1, 25.4):
        chair(u, 14.9, 0, 1)
        chair(u, 19.1, 0, -1)
    chair(21.1, 17.0, 1, 0)
    chair(27.4, 17.0, -1, 0)
    with item("pendants", "Pendant lights (dining)"):
        for u in (23.0, 25.5):
            pcyl("DECO", "black", u, 17.0, 6.2, CEIL - 6.2, 0.02, 6)
            pcyl("LIGHT", "lamp_shade", u, 17.0, 5.6, 0.8, 0.7, 20, 0.25)
    with item("shoe_cabinet", "Shoe cabinet + mirror"):
        prbox("FURN", "walnut", 28.6, 31.4, 19.7, 21.0, 0.3, 3.0, 0.03)
        pbox("DECO", "mirror", 28.9, 31.1, 20.92, 21.0, 4.0, 6.5)
    plant(33.9, 13.9, 3.0, 0.7)
    for (u0, u1, m) in ((16.0, 19.5, "art1"), (20.2, 21.6, "art2")):
        with auto_item("art", "Wall art"):
            pbox("DECO", "walnut", u0, u1, 20.9, 21.0, 4.0, 6.6)
            pbox("DECO", m, u0 + 0.12, u1 - 0.12, 20.86, 20.9, 4.12, 6.48)
    fan(10.5, 17.0)

    # ---------------- Master bedroom (u 15.75..30.75, v 0.75..12.5) ---------
    bu0, bu1, bv0, bv1 = 15.75, 22.6, 4.1, 9.1
    with item("bed", "Bed (queen)"):
        prbox("FURN", "fabric_sofa", bu0, bu0 + 0.35, bv0 - 0.3, bv1 + 0.3, 0.0, 4.2, 0.1)       # headboard
        prbox("FURN", "walnut", bu0 + 0.35, bu1, bv0, bv1, 0.3, 1.3, 0.04)                         # bed base
        prbox("FURN", "fabric_bed", bu0 + 0.4, bu1 - 0.05, bv0 + 0.05, bv1 - 0.05, 1.3, 2.0, 0.15)  # mattress
        prbox("DECO", "fabric_bed", bu0 + 2.6, bu1 + 0.03, bv0 - 0.02, bv1 + 0.02, 1.6, 2.15, 0.2)  # duvet
        prbox("DECO", "fabric_throw", bu1 - 1.6, bu1 + 0.05, bv0 - 0.04, bv1 + 0.04, 1.65, 2.2, 0.15)
        for (a, b) in ((bv0 + 0.3, bv0 + 2.3), (bv1 - 2.3, bv1 - 0.3)):
            prbox("DECO", "fabric_bed", bu0 + 0.5, bu0 + 1.7, a, b, 2.0, 2.55, 0.25)
    for (a, b) in ((2.2, 3.8), (9.4, 11.0)):
        with auto_item("bedside", "Bedside table + lamp"):
            prbox("FURN", "walnut", 15.8, 17.3, a, b, 0.0, 1.9, 0.03)
            pcyl("DECO", "ceramic", 16.5, (a + b) / 2, 1.9, 0.9, 0.18, 14, 0.08)
            pcyl("LIGHT", "lamp_shade", 16.5, (a + b) / 2, 2.7, 0.8, 0.45, 18, 0.3)
    with item("rug_bed", "Rug (bedroom)"):
        pbox("DECO", "rug", 21.5, 26.0, 3.2, 10.0, 0.03, 0.05)
    with item("wardrobe", "Wardrobe"):
        prbox("FURN", "walnut", 28.75, 30.7, 1.2, 8.7, 0.0, 7.6, 0.02)
        for k in range(1, 3):
            v = 1.2 + k * 2.5
            pbox("DECO", "black", 28.72, 28.75, v - 0.02, v + 0.02, 0.2, 7.4)
        for v in (3.5, 3.9, 6.0, 6.4):
            pbox("DECO", "chrome", 28.68, 28.72, v - 0.03, v + 0.03, 3.0, 4.6)
    with item("study_desk", "Study desk"):
        prbox("FURN", "oak_light", 23.0, 27.0, 0.8, 2.8, 2.35, 2.5, 0.02)
        prbox("FURN", "oak_light", 26.4, 27.0, 0.8, 2.8, 0.0, 2.35, 0.02)
        prbox("FURN", "oak_light", 23.0, 23.6, 0.8, 2.8, 0.0, 2.35, 0.02)
        pbox("DECO", "black", 24.2, 25.8, 1.0, 1.1, 2.5, 3.6)         # monitor
    chair(25.0, 3.6, 0, -1, "black", "fabric_throw")
    with item("curtains", "Curtains (bedroom)"):
        for (a, b) in ((19.2, 20.4), (25.1, 26.3)):
            prbox("DECO", "fabric_curtain", a, b, 0.85, 1.15, 0.2, 8.2, 0.12)
        pbox("DECO", "chrome", 19.0, 26.5, 0.97, 1.03, 8.3, 8.36)
    with item("art_bed", "Wall art (bedroom)"):
        pbox("DECO", "walnut", 15.75, 15.85, 4.8, 8.4, 4.8, 6.6)
        pbox("DECO", "art2", 15.85, 15.88, 4.95, 8.25, 4.95, 6.45)
    fan(23.25, 6.6)

    # ---------------- Master bath (u 11.25..15.25, v 0.75..12.5) ----------
    with item("vanity_mbath", "Vanity + basin (master bath)"):
        prbox("FURN", "granite_black", 11.3, 13.0, 3.7, 5.9, 2.6, 2.75, 0.02)
        prbox("FURN", "walnut", 11.3, 12.9, 3.8, 5.8, 1.2, 2.6, 0.02)
        pcyl("FURN", "ceramic", 12.15, 4.8, 2.75, 0.45, 0.65, 24, 0.75)
        pcyl("DECO", "chrome", 11.55, 4.8, 2.75, 0.8, 0.05, 8)
        pbox("DECO", "mirror", 11.28, 11.31, 3.9, 5.7, 4.0, 6.5)
    wc(15.25, 7.9, "-u")
    with item("shower_mbath", "Shower (master bath)"):
        pbox("GLASS", "glass", 11.25, 13.4, 10.0, 10.05, 0.05, 6.8)
        pcyl("DECO", "chrome", 13.25, 12.0, 6.6, 0.1, 0.4, 20)
        pbox("DECO", "chrome", 13.22, 13.28, 12.0, 12.47, 6.62, 6.7)
        pbox("DECO", "chrome", 12.9, 13.6, 12.44, 12.47, 3.5, 3.7)
    pbox("FLOOR", "bathfloor", 11.25, 15.25, 10.05, 12.5, 0.03, 0.06)          # shower tray step

    # ---------------- Store room bath (u 0.75..5.75, v 13..21) ------------
    wc(5.75, 19.0, "-u")
    with item("basin_srbath", "Basin (store room bath)"):
        pcyl("FURN", "ceramic", 5.2, 15.4, 2.3, 0.5, 0.75, 24, 0.85)
        pbox("FURN", "ceramic", 5.3, 5.75, 14.8, 16.0, 1.6, 2.3)
        pcyl("DECO", "chrome", 5.6, 15.4, 2.8, 0.5, 0.05, 8)
        pbox("DECO", "mirror", 5.72, 5.75, 14.6, 16.2, 4.0, 5.8)
    with item("shower_srbath", "Shower + bucket (store room bath)"):
        pcyl("DECO", "chrome", 1.1, 20.6, 6.4, 0.1, 0.3, 18)
        pbox("DECO", "chrome", 0.78, 1.1, 20.57, 20.63, 6.4, 6.45)
        pcyl("FURN", "plastic_blue", 1.6, 19.5, 0.03, 1.2, 0.6, 20, 0.7)
        pbox("DECO", "chrome", 0.78, 0.84, 18.5, 19.5, 2.5, 2.7)

    # ---------------- Common bath (u 32.25..35.25, v 21.5..27) -----------
    wc(33.75, 27.0, "-v")
    with item("basin_cbath", "Basin (common bath)"):
        pcyl("FURN", "ceramic", 32.7, 23.8, 2.3, 0.5, 0.6, 24, 0.7)
        pbox("FURN", "ceramic", 32.25, 32.55, 23.3, 24.3, 1.6, 2.3)
        pbox("DECO", "mirror", 32.25, 32.28, 23.2, 24.4, 4.0, 5.6)

    # ---------------- Kitchen (u 31.25..39.25, v 0.75..12.5) -------------
    ct = 2.65
    with item("kitchen_counter", "Kitchen counter (L) + sink + hob"):
        for (u0, u1, v0, v1) in [(31.25, 39.25, 0.75, 2.75), (37.25, 39.25, 2.75, 10.6)]:
            pbox("FURN", "black", u0, u1, v0, v1, 0, 0.33)
            prbox("FURN", "kitchen_shutter", u0 + (0.05 if u0 > 31.3 else 0), u1, v0, v1, 0.33, ct, 0.02)
            prbox("FURN", "granite_black", u0, u1, v0, v1, ct, ct + 0.13, 0.02)
        for u in (33.0, 35.0, 37.25):
            pbox("DECO", "black", u - 0.02, u + 0.02, 2.75, 2.78, 0.4, ct - 0.05)
            pbox("DECO", "chrome", u - 0.6, u - 0.2, 2.76, 2.82, ct - 0.25, ct - 0.18)
        for v in (5.0, 7.5, 10.6):
            pbox("DECO", "black", 37.22, 37.25, v - 0.02, v + 0.02, 0.4, ct - 0.05)
        pbox("DECO", "steel", 34.2, 36.2, 1.1, 2.4, ct + 0.135, ct + 0.14)       # sink
        pbox("DECO", "black", 34.35, 36.05, 1.25, 2.25, ct + 0.14, ct + 0.145)
        pcyl("DECO", "chrome", 35.2, 1.0, ct + 0.13, 1.1, 0.05, 10)
        G.cyl("DECO", "chrome", W(35.2, 1.0, ct + 1.2), (-0.8 * FT, 0, 0), 0.015, 8)
        pbox("DECO", "black", 37.6, 38.9, 7.8, 10.2, ct + 0.13, ct + 0.17)       # hob
        for (a, b) in ((38.0, 8.3), (38.0, 9.6), (38.5, 9.0)):
            pcyl("DECO", "steel", a, b, ct + 0.17, 0.04, 0.22, 16)
        pcyl("DECO", "steel", 38.0, 8.3, ct + 0.21, 0.5, 0.35, 20)
        pcyl("DECO", "black", 38.0, 9.6, ct + 0.21, 0.12, 0.42, 20)
        for i in range(5):
            pcyl("DECO", ["ceramic", "plastic_red", "steel", "plastic_green", "ceramic"][i], 31.7 + i * 0.35, 1.3, ct + 0.13, 0.45, 0.13, 12)
        pbox("DECO", "oak_light", 36.6, 37.1, 1.0, 2.3, ct + 0.13, ct + 0.2)
    pbox("WALL", "kitchen_dado", 31.25, 39.25, 0.78, 0.82, ct + 0.13, 5.0)       # dado tiles (fixed)
    pbox("WALL", "kitchen_dado", 39.18, 39.22, 0.82, 12.5, ct + 0.13, 5.0)
    with item("chimney", "Chimney hood"):
        prbox("FURN", "black", 37.6, 39.2, 7.8, 10.2, 6.0, 6.6, 0.04)
        pbox("FURN", "steel", 38.4, 39.2, 8.6, 9.4, 6.6, CEIL - 0.9)
    for n, (u0, u1) in enumerate(((31.3, 32.9), (37.3, 39.2))):
        with item(f"upper_cab_{n + 1}", "Upper cabinet"):
            prbox("FURN", "kitchen_shutter", u0, u1, 0.84, 1.9, 5.0, 7.4, 0.02)
    with item("fridge", "Fridge"):
        prbox("FURN", "fridge", 31.3, 33.6, 3.0, 5.6, 0.0, 6.1, 0.08)
        pbox("DECO", "chrome", 33.6, 33.68, 5.2, 5.3, 2.5, 5.5)

    # ---------------- Store room NE (u 0.75..10.75, v 0.75..12.5) ---------
    rack(9.25, 10.7, 1.0, 4.8, 7.0, 5, "rack_grey")
    rack(9.25, 10.7, 4.9, 8.7, 7.0, 5, "rack_grey")
    with item("almirah", "Steel almirah"):
        prbox("FURN", "almirah", 0.8, 2.6, 0.8, 3.3, 0.0, 6.5, 0.03)
        pbox("DECO", "black", 2.6, 2.62, 2.03, 2.07, 0.3, 6.3)
        pbox("DECO", "chrome", 2.6, 2.68, 1.8, 1.9, 3.0, 3.6)
    boxes_stack(1.0, 4.5, 2, 2, 2, (1.3, 1.5, 1.1))
    for i in range(3):
        with auto_item("crate", "Plastic crate"):
            pbox("FURN", ["plastic_blue", "plastic_green", "plastic_red"][i], 5.6 + i * 0.05, 6.9 + i * 0.05,
                 1.0 + i * 1.6, 2.4 + i * 1.6, 0.0, 1.0)
    with item("ladder", "Ladder"):
        for v in (9.0, 10.2):
            pbox("FURN", "steel", 0.8, 0.95, v, v + 0.12, 0.0, 7.0)
        for k in range(1, 7):
            pbox("FURN", "steel", 0.8, 0.9, 9.12, 10.2, k * 1.0, k * 1.0 + 0.08)
    led(5.75, 6.6, 2.0)

    # ---------------- Stores 1/2/3 (each u 10 x v 16, shutters on the west) ----
    for (u0, u1) in ((0.75, 10.75), (11.25, 21.25), (21.75, 31.75)):
        tall_n = u0 > 1  # store 1 has a north window; keep its north rack low
        rack(u0 + 0.05, u0 + 2.55, 22.0, 29.6, 3.0 if not tall_n else 8.5, 3 if not tall_n else 6, "rack_orange")
        rack(u0 + 0.05, u0 + 2.55, 29.8, 35.8, 3.0 if not tall_n else 8.5, 3 if not tall_n else 6, "rack_orange")
        rack(u1 - 2.55, u1 - 0.05, 22.0, 29.6, 8.5, 6, "rack_blue")
        rack(u1 - 2.55, u1 - 0.05, 29.8, 35.8, 8.5, 6, "rack_blue")
        with auto_item("pallet", "Pallet with cartons"):
            pbox("FURN", "oak_light", u0 + 3.2, u1 - 3.2, 21.6, 25.0, 0.0, 0.45)
            boxes_stack(u0 + 3.25, 21.65, 2, 2, 3, ((u1 - u0 - 6.5) / 2, 1.65, 1.2), 0.45)
        led((u0 + u1) / 2, 26.0, 2.0)
        led((u0 + u1) / 2, 33.0, 2.0)
    with item("store3_desk", "Desk (Store 3)"):
        prbox("FURN", "oak_light", 26.0, 27.5, 35.0, 37.4, 2.4, 2.55, 0.02)
        pbox("FURN", "steel", 26.0, 26.1, 35.0, 37.4, 0, 2.4)
        pbox("FURN", "steel", 27.4, 27.5, 35.0, 37.4, 0, 2.4)
    chair(26.8, 34.2, 0, 1, "black", "black")

    # ---------------- Kitchen outside space, entrance, walk path, foot path ----
    with item("washing_machine", "Washing machine"):
        prbox("FURN", "pvc_white", 40.3, 42.6, 9.5, 11.8, 0.0, 2.8, 0.08)
        G.cyl("DECO", "black", W(40.28, 10.65, 1.4), (0, 0.04 * FT, 0), 0.6 * FT, 24)
    with item("utility_sink", "Utility sink"):
        prbox("FURN", "granite_black", 40.2, 42.9, 3.5, 6.5, 2.6, 2.75, 0.02)
        pbox("FURN", "paint_ext", 42.4, 42.9, 3.5, 6.5, 0, 2.6)
        pbox("DECO", "steel", 40.8, 42.4, 4.2, 5.8, 2.75, 2.76)
        pbox("DECO", "black", 40.9, 42.3, 4.3, 5.7, 2.76, 2.765)
    with item("door_mat", "Door mat"):
        pbox("DECO", "rug", 37.0, 38.8, 17.3, 20.2, 0.03, 0.06)
    for (u, v) in ((42.2, 14.0), (42.2, 20.2), (41.8, 1.8), (36.8, 22.2)):
        plant(u, v, 2.6, 0.6)
    for u in (4.5, 15.5, 25.5, 35.0):                                             # foot path planters
        plant(u, 42.3, 2.2, 0.55)
    for u in (10.75, 21.25, 31.75):
        pbox("LIGHT", "lamp_shade", u - 0.35, u + 0.35, 38.25, 38.45, 7.6, 8.4)
    for (u, v) in ((41.5, 17.0), (37.5, 30.0), (41.5, 6.6)):
        led(u, v, 1.2)
    for u in (6.0, 18.0, 30.0):
        led(u, 40.6, 1.2)


# ============================================================ services (MEP) ==
def pipe(points, r, mat):
    """Round pipe / conduit through plan points (u, v, z) in feet."""
    for a, b in zip(points, points[1:]):
        wa, wb = W(*a), W(*b)
        if (wb - wa).length > 1e-4:
            G.cyl("MEP", mat, wa, wb - wa, r * FT, 10)
    for q in points[1:-1]:
        G.sphere("MEP", mat, W(*q), r * FT * 1.25, (1, 1, 1), 8, 6)


def build_water():
    """Water supply (blue = cold, red = hot) and drainage (grey). Routing is a sensible proposal:
    the drawing has no plumbing layout, so confirm with the plumber."""
    zc = 9.55                      # supply runs in the ceiling void (above the false ceilings)
    cold, hot, drain = 0.06, 0.05, 0.17
    with item("w_riser", "Cold water: down-take from terrace tank + main", "water"):
        pipe([(41.6, 12.2, 22.0), (41.6, 12.2, zc), (41.6, 13.3, zc), (3.25, 13.3, zc)], 0.08, "pipe_cold")
    with item("w_kitchen", "Cold water: kitchen sink", "water"):
        pipe([(35.2, 13.3, zc), (35.2, 0.95, zc), (35.2, 0.95, 3.4)], cold, "pipe_cold")
    with item("w_utility", "Cold water: utility sink + washing machine", "water"):
        pipe([(41.6, 12.2, 9.0), (42.85, 12.2, 9.0), (42.85, 12.2, 3.2), (42.85, 5.0, 3.2)], cold, "pipe_cold")
        pipe([(42.85, 10.6, 3.2), (42.7, 10.6, 3.2), (42.7, 10.6, 2.6)], cold, "pipe_cold")
    with item("w_mbath", "Cold water: master bath", "water"):
        pipe([(13.25, 13.3, zc), (13.25, 12.35, zc), (13.25, 12.35, 3.6)], cold, "pipe_cold")           # shower
        pipe([(13.25, 12.35, zc), (11.4, 12.35, zc), (11.4, 4.8, zc), (11.4, 4.8, 2.4)], cold, "pipe_cold")  # basin
        pipe([(13.25, 12.35, zc), (15.1, 12.35, zc), (15.1, 8.9, zc), (15.1, 8.9, 1.0)], cold, "pipe_cold")  # WC
    with item("w_mbath_hot", "Hot water: geyser, master bath", "water"):
        pcyl("MEP", "plate", 14.6, 12.0, 7.0, 1.4, 0.55, 18)                                            # geyser
        pipe([(14.6, 12.2, 7.0), (14.6, 12.4, 7.0), (14.6, 12.4, 3.75), (13.4, 12.4, 3.75)], hot, "pipe_hot")
        pipe([(14.6, 12.4, 7.0), (14.6, 12.4, 9.3), (11.55, 12.4, 9.3), (11.55, 5.1, 9.3), (11.55, 5.1, 2.4)], hot, "pipe_hot")
    with item("w_srbath", "Cold water: store room bath", "water"):
        pipe([(3.25, 13.3, zc), (5.6, 13.3, zc), (5.6, 15.4, zc), (5.6, 15.4, 2.6)], cold, "pipe_cold")       # basin
        pipe([(5.6, 15.4, zc), (5.6, 19.8, zc), (5.6, 19.8, 1.0)], cold, "pipe_cold")                        # WC
        pipe([(3.25, 13.3, zc), (0.9, 13.3, zc), (0.9, 20.6, zc), (0.9, 20.6, 3.5)], cold, "pipe_cold")       # shower + tap
    with item("w_srbath_hot", "Hot water: geyser, store room bath", "water"):
        pcyl("MEP", "plate", 1.35, 16.5, 7.0, 1.4, 0.55, 18)
        pipe([(1.0, 16.5, 7.0), (1.0, 20.45, 7.0), (1.0, 20.45, 3.7)], hot, "pipe_hot")
    with item("w_cbath", "Cold water: common bath", "water"):
        pipe([(33.75, 13.3, zc), (33.75, 21.7, zc), (32.45, 21.7, zc), (32.45, 23.8, zc), (32.45, 23.8, 2.6)], cold, "pipe_cold")
        pipe([(32.45, 23.8, zc), (32.45, 26.8, zc), (33.0, 26.8, zc), (33.0, 26.8, 1.0)], cold, "pipe_cold")
    # drainage: WC / floor traps run under the slab to vertical stacks
    g = P.GROUND
    with item("d_mbath", "Drain: master bath soil stack (east face)", "water"):
        pipe([(14.0, 7.9, -0.9), (14.0, 0.4, -0.9), (14.0, -0.35, -0.9), (14.0, -0.35, g)], drain, "pipe_drain")
        pipe([(12.15, 4.8, -0.9), (14.0, 4.8, -0.9)], 0.1, "pipe_drain")
        pipe([(13.25, 11.5, -0.9), (14.0, 11.5, -0.9), (14.0, 7.9, -0.9)], 0.1, "pipe_drain")
        pipe([(14.0, -0.35, -0.9), (14.0, -0.35, 24.0)], 0.1, "pipe_drain")                               # vent
    with item("d_kitchen", "Drain: kitchen waste stack (east face)", "water"):
        pipe([(35.2, 1.7, 2.0), (35.2, 1.7, -0.9), (35.2, -0.35, -0.9), (35.2, -0.35, g)], 0.12, "pipe_drain")
    with item("d_srbath", "Drain: store room bath soil stack (north face)", "water"):
        pipe([(4.3, 19.0, -0.9), (-0.35, 19.0, -0.9), (-0.35, 19.0, g)], drain, "pipe_drain")
        pipe([(2.0, 19.8, -0.9), (2.0, 19.0, -0.9)], 0.1, "pipe_drain")
        pipe([(5.0, 15.4, -0.9), (5.0, 19.0, -0.9)], 0.1, "pipe_drain")
        pipe([(-0.35, 19.0, -0.9), (-0.35, 19.0, 24.0)], 0.1, "pipe_drain")
    with item("d_cbath", "Drain: common bath soil stack", "water"):
        pipe([(33.75, 25.6, -0.9), (34.9, 25.6, -0.9), (34.9, 25.6, g)], drain, "pipe_drain")
        pipe([(32.7, 23.8, -0.9), (33.75, 23.8, -0.9), (33.75, 25.6, -0.9)], 0.1, "pipe_drain")
    with item("d_utility", "Drain: utility sink + washing machine", "water"):
        pipe([(41.6, 5.0, 2.0), (41.6, 5.0, -0.9), (43.2, 5.0, -0.9)], 0.1, "pipe_drain")
        pipe([(41.5, 10.6, -0.9), (41.5, 5.0, -0.9)], 0.1, "pipe_drain")


def build_electrical():
    """Distribution board, concealed conduits (orange), switchboards and sockets.
    A proposal for discussion with the electrician: the drawing has no electrical layout."""
    zc = 9.8
    r = 0.035

    def plate(u, v, z, face, w=0.55, h=0.35):
        # face: which axis the wall is on ('u' = plate lies on a wall running along v)
        if face == "u":
            pbox("ELEC", "plate", u - 0.03, u + 0.03, v - w / 2, v + w / 2, z - h / 2, z + h / 2)
        else:
            pbox("ELEC", "plate", u - w / 2, u + w / 2, v - 0.03, v + 0.03, z - h / 2, z + h / 2)

    with item("e_db", "Distribution board + main trunk", "electrical"):
        pbox("ELEC", "db_box", 35.12, 35.22, 13.4, 14.9, 4.6, 6.2)
        pipe([(35.17, 14.15, 6.2), (35.17, 14.15, zc), (35.17, 17.0, zc), (3.25, 17.0, zc)], 0.06, "conduit")
        pipe([(35.17, 14.15, 4.6), (35.17, 14.15, 0.2), (36.2, 14.15, 0.2), (36.2, 14.15, -0.9)], 0.06, "conduit")  # incoming supply
    # circuits: name, tap point on trunk (u), light points, switchboard (u, v, wall face), sockets (u, v, z, face)
    circuits = [
        ("main_hall", "Main Hall", 20.0, [(11.0, 17.0), (28.0, 17.0)], (35.2, 15.8, "u"),
         [(6.3, 17.0, 1.3, "u"), (20.5, 20.95, 1.3, "v"), (30.0, 20.95, 3.5, "v")]),
        ("master_bedroom", "Master Bedroom", 23.25, [(23.25, 6.6)], (27.0, 12.45, "v"),
         [(15.8, 3.0, 2.3, "u"), (15.8, 10.2, 2.3, "u"), (25.0, 0.8, 3.0, "v")]),
        ("kitchen", "Kitchen", 35.25, [(35.25, 6.6)], (35.3, 12.45, "v"),
         [(33.0, 0.8, 3.7, "v"), (39.2, 6.0, 3.7, "u"), (31.3, 4.3, 1.5, "u"), (39.2, 9.0, 6.4, "u")]),
        ("store_room", "Store Room", 5.75, [(5.75, 6.6)], (6.8, 12.45, "v"), [(10.7, 9.3, 1.3, "u")]),
        ("master_bath", "Master Bath", 13.25, [(13.25, 6.6)], (15.8, 3.9, "u"), [(14.6, 12.45, 7.6, "v")]),
        ("storeroom_bath", "Store Room Bath", 3.25, [(3.25, 17.0)], (4.3, 12.45, "v"), [(0.8, 16.5, 7.6, "u")]),
        ("common_bath", "Common Bath", 33.75, [(33.75, 24.2)], (35.66, 24.3, "u"), []),
        ("store1", "Store 1", 5.75, [(5.75, 26.0), (5.75, 33.0)], (1.5, 37.45, "v"), [(0.8, 24.0, 1.3, "u")]),
        ("store2", "Store 2", 16.25, [(16.25, 26.0), (16.25, 33.0)], (12.0, 37.45, "v"), [(11.3, 24.0, 1.3, "u")]),
        ("store3", "Store 3", 26.75, [(26.75, 26.0), (26.75, 33.0)], (31.2, 37.45, "v"), [(27.0, 37.45, 1.3, "v")]),
        ("outside", "Entrance + walkways", 34.5, [(41.5, 17.0), (37.5, 30.0), (41.5, 6.6)], (36.05, 16.0, "u"), []),
    ]
    for (cid, label, tap, lights, sb, sockets) in circuits:
        with item(f"e_{cid}", f"Electrical: {label} circuit", "electrical"):
            prev = (tap, 17.0)
            for (lu, lv) in lights:
                pipe([(prev[0], prev[1], zc), (prev[0], lv, zc), (lu, lv, zc)], r, "conduit")
                prev = (lu, lv)
            su, sv, face = sb
            pipe([(prev[0], prev[1], zc), (su, prev[1], zc), (su, sv, zc), (su, sv, 4.6)], r, "conduit")
            plate(su, sv, 4.45, face)
            for (ku, kv, kz, kf) in sockets:
                pipe([(su, sv, zc), (ku, sv, zc), (ku, kv, zc), (ku, kv, kz)], r * 0.8, "conduit")
                plate(ku, kv, kz, kf, 0.4, 0.3)


@as_item("wc", "WC")
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


LM_SIZE = {"WALL": 2048, "FLOOR": 2048, "CEIL": 1024}
LM_RANGE = 3.0      # lightmaps are stored as sRGB(irradiance / LM_RANGE)


def pack_lightmaps():
    """Give every baked face a rectangle in its atlas (shelf packing at the highest density that fits)."""
    groups = {}
    for (cat, mat, it), p in G.parts.items():
        if cat in BAKE_CATS and p["lm"] and all(l is not None for l in p["lm"]):
            for fi, l in enumerate(p["lm"]):
                groups.setdefault(BAKE_CATS[cat], []).append((l[0], l[1], (cat, mat, it), fi))
    placed = {}
    for g, rects in groups.items():
        S, pad = LM_SIZE[g], 2

        def try_pack(D):
            out, x, y, rowh = {}, 0, 0, 0
            for (w, h, key, fi) in sorted(rects, key=lambda r: -r[1]):
                pw, ph = max(2, math.ceil(w * D)) + 2 * pad, max(2, math.ceil(h * D)) + 2 * pad
                if pw > S:
                    return None
                if x + pw > S:
                    x, y, rowh = 0, y + rowh, 0
                if y + ph > S:
                    return None
                out[(key, fi)] = (x + pad, y + pad, pw - 2 * pad, ph - 2 * pad)
                x += pw
                rowh = max(rowh, ph)
            return out

        lo, hi, best = 2.0, 400.0, None
        for _ in range(22):
            mid = (lo + hi) / 2
            r = try_pack(mid)
            if r:
                best, lo = r, mid
            else:
                hi = mid
        print(f"lightmap {g}: {len(rects)} faces, {lo:.1f} px/m in {S}px", flush=True)
        for k, (x, y, w, h) in best.items():
            placed[k] = (g, x / S, y / S, w / S, h / S, 0.5 / S)
    return placed


def make_objects():
    placed = pack_lightmaps()
    cols = {}

    def col_for(name):
        if name not in cols:
            cols[name] = bpy.data.collections.new(name)
            bpy.context.scene.collection.children.link(cols[name])
        return cols[name]

    # item pivots: centre of the footprint, at the lowest point
    pivots = {}
    for (cat, mat, it), p in G.parts.items():
        if it is None or not p["v"]:
            continue
        lo, hi = pivots.setdefault(it, ([1e9] * 3, [-1e9] * 3))
        for v in p["v"]:
            for i in range(3):
                lo[i] = min(lo[i], v[i])
                hi[i] = max(hi[i], v[i])
    parents = {}
    for it, (lo, hi) in pivots.items():
        e = bpy.data.objects.new(f"ITEM__{it}", None)
        e.location = ((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, lo[2])
        e["label"] = ITEMS[it]["label"]
        e["layer"] = ITEMS[it]["layer"]
        e["cat"] = "ITEM"
        col_for("ITEMS").objects.link(e)
        parents[it] = e

    for (cat, mat, it), p in G.parts.items():
        if not p["f"]:
            continue
        name = f"{cat}__{mat}" + (f"__{it}" if it else "")
        me = bpy.data.meshes.new(name)
        me.from_pydata(p["v"], [], p["f"])
        me.update()
        tile = MATS[mat][1]
        uvl = me.uv_layers.new(name="UVMap")
        baked = len(me.polygons) == len(p["f"]) and all((((cat, mat, it), i) in placed) for i in range(len(p["f"])))
        lml = me.uv_layers.new(name="LM") if baked else None
        verts = me.vertices
        for poly in me.polygons:
            n = poly.normal
            ax = max(range(3), key=lambda i: abs(n[i]))
            poly.use_smooth = p["s"][poly.index] if poly.index < len(p["s"]) else False
            if tile is None:  # fit 0..1 over the polygon's bounds (rugs, cartons)
                cs = [verts[verts_i].co for verts_i in poly.vertices]
                lo = [min(c[i] for c in cs) for i in range(3)]
                hi = [max(c[i] for c in cs) for i in range(3)]
            if baked:
                g, x, y, w, h, ins = placed[((cat, mat, it), poly.index)]
                st = p["lm"][poly.index][2]
            for k, li in enumerate(poly.loop_indices):
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
                if baked:
                    sx, ty = st[k]
                    lml.data[li].uv = (x + ins + sx * (w - 2 * ins), y + ins + ty * (h - 2 * ins))
        uvl.active_render = True
        me.materials.append(get_mat(mat))
        ob = bpy.data.objects.new(name, me)
        ob["cat"] = cat
        if baked:
            ob["lm"] = placed[((cat, mat, it), 0)][0]
        if it:
            piv = parents[it].location
            for v in me.vertices:
                v.co = v.co - piv
            ob.parent = parents[it]
            ob["layer"] = ITEMS[it]["layer"]
            col_for("ITEMS").objects.link(ob)
        else:
            col_for(cat).objects.link(ob)
    return cols


def _denoise(img, S):
    """Bakes are not denoised by Cycles, so run the atlas through OpenImageDenoise (compositor node)."""
    import numpy as np
    raw = np.array(img.pixels[:], dtype=np.float32).reshape(S, S, 4)
    try:
        import tempfile
        sc = bpy.data.scenes.new("denoise")
        sc.render.resolution_x = sc.render.resolution_y = S
        sc.render.resolution_percentage = 100
        sc.use_nodes = True
        nt = sc.node_tree
        nt.nodes.clear()
        ni = nt.nodes.new("CompositorNodeImage")
        ni.image = img
        nd = nt.nodes.new("CompositorNodeDenoise")
        nc = nt.nodes.new("CompositorNodeComposite")
        nt.links.new(ni.outputs["Image"], nd.inputs["Image"])
        nt.links.new(nd.outputs["Image"], nc.inputs["Image"])
        sc.render.image_settings.file_format = "OPEN_EXR"
        sc.render.image_settings.color_depth = "32"
        path = os.path.join(tempfile.mkdtemp(), "dn.exr")
        sc.render.filepath = path
        bpy.ops.render.render(scene=sc.name, write_still=True)
        out = bpy.data.images.load(path)
        res = np.array(out.pixels[:], dtype=np.float32).reshape(S, S, 4)
        bpy.data.scenes.remove(sc)
        if np.isfinite(res).all() and res[..., :3].max() > 0:
            print("denoised", img.name, flush=True)
            return res
    except Exception as e:  # fall back to the raw bake
        print("denoise failed:", e, flush=True)
    return raw


def bake_lightmaps(out_dir, samples):
    """Bake direct + indirect light (no albedo) of the fixed shell into one atlas per group.
    Movable furniture and the service lines are hidden so their shadows are not frozen into the floor."""
    import numpy as np
    from PIL import Image
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = samples
    sc.cycles.use_denoising = True
    sc.cycles.max_bounces = 6
    sc.cycles.diffuse_bounces = 4
    sc.cycles.sample_clamp_indirect = 4.0
    sc.render.bake.margin = 4
    sc.render.bake.use_clear = False
    for o in bpy.data.objects:
        o.hide_render = o.get("layer") in ("furniture", "water", "electrical") or o.get("cat") in ("MEP", "ELEC")
    imgs = {g: bpy.data.images.new("LM_" + g, S, S, float_buffer=True, alpha=False) for g, S in LM_SIZE.items()}
    targets = [o for o in bpy.data.objects if o.type == "MESH" and o.get("lm")]
    for n, ob in enumerate(targets):
        mat = ob.data.materials[0]
        nt = mat.node_tree
        node = nt.nodes.get("LMBAKE") or nt.nodes.new("ShaderNodeTexImage")
        node.name = "LMBAKE"
        node.image = imgs[ob["lm"]]
        nt.nodes.active = node
        ob.data.uv_layers.active = ob.data.uv_layers["LM"]
        for o in bpy.context.view_layer.objects:
            o.select_set(False)
        ob.select_set(True)
        bpy.context.view_layer.objects.active = ob
        bpy.ops.object.bake(type="DIFFUSE", pass_filter={"DIRECT", "INDIRECT"}, use_clear=False, margin=4)
        ob.data.uv_layers.active = ob.data.uv_layers["UVMap"]
        print(f"baked {n + 1}/{len(targets)} {ob.name}", flush=True)
    for m in bpy.data.materials:
        nd = m.node_tree.nodes.get("LMBAKE") if m.node_tree else None
        if nd:
            m.node_tree.nodes.remove(nd)
    for g, img in imgs.items():
        S = LM_SIZE[g]
        px = _denoise(img, S)[::-1, :, :3]
        print("lightmap", g, "p50 %.3f p99 %.3f max %.3f" % (np.percentile(px, 50), np.percentile(px, 99), px.max()), flush=True)
        v = np.clip(px / LM_RANGE, 0, 1)
        srgb = np.where(v <= 0.0031308, v * 12.92, 1.055 * np.power(v, 1 / 2.4) - 0.055)
        Image.fromarray((srgb * 255 + 0.5).astype(np.uint8)).save(os.path.join(out_dir, f"lm_{g}.jpg"), quality=92)
    for o in bpy.data.objects:
        o.hide_render = False


def add_lights():
    col = bpy.data.collections.new("LAMPS")
    bpy.context.scene.collection.children.link(col)
    warm = (1.0, 0.88, 0.74)
    for (u, v, z) in SPOTS:
        ld = bpy.data.lights.new("Spot", "SPOT")
        ld.energy = 55.0
        ld.spot_size = math.radians(95)
        ld.spot_blend = 0.6
        ld.shadow_soft_size = 0.04
        ld.color = warm
        ob = bpy.data.objects.new("Spot", ld)
        ob.location = W(u, v, z - 0.06)
        col.objects.link(ob)
    for (rid, label, rect, floor, paint, kind) in P.ROOMS:
        if kind == "stair":
            continue
        u0, u1, v0, v1 = rect
        if any(u0 <= su <= u1 and v0 <= sv <= v1 for (su, sv, sz) in SPOTS):
            continue
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
    if "CEIL" in hide:
        hide = tuple(hide) + ("FCEIL",)
    for o in bpy.data.objects:
        o.hide_render = (o.get("cat") in hide or o.get("layer") in ("water", "electrical")
                         or ("CEIL" in hide and o.get("layer") == "false_ceiling"))
    sc.render.filepath = os.path.join(out_dir, name + ".jpg")
    bpy.ops.render.render(write_still=True)
    print("rendered", sc.render.filepath, flush=True)


def render_pano(pid, eye, out_dir, res, samples):
    """Path-traced equirectangular panorama. Image centre looks north (+Y), right of centre = east."""
    sc = bpy.context.scene
    cd = bpy.data.cameras.new("pano_" + pid)
    cd.type = "PANO"
    cd.panorama_type = "EQUIRECTANGULAR"
    cd.clip_start = 0.02
    co = bpy.data.objects.new("PANO_" + pid, cd)
    sc.collection.objects.link(co)
    co.location = W(*eye)
    co.rotation_euler = (math.radians(90), 0, 0)
    sc.camera = co
    sc.cycles.samples = samples
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.view_settings.exposure = 0.0
    for o in bpy.data.objects:
        o.hide_render = o.get("layer") in ("water", "electrical")
    sc.render.image_settings.file_format = "JPEG"
    sc.render.image_settings.quality = 92
    sc.render.filepath = os.path.join(out_dir, pid + ".jpg")
    bpy.ops.render.render(write_still=True)
    print("pano", sc.render.filepath, flush=True)


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
    build_false_ceilings()
    build_furniture()
    build_water()
    build_electrical()
    build_site()
    make_objects()
    print("objects:", len(bpy.data.objects), "faces:", sum(len(p["f"]) for p in G.parts.values()), flush=True)
    if ARGS["glb"]:
        for o in bpy.data.objects:
            o.select_set(True)
        bpy.ops.export_scene.gltf(filepath=ARGS["glb"], export_format="GLB", use_selection=False,
                                  export_lights=False, export_cameras=False, export_image_format="AUTO",
                                  export_apply=True, export_yup=True, export_extras=True)
        print("glb:", ARGS["glb"], os.path.getsize(ARGS["glb"]) // 1024, "KB", flush=True)
    add_lights()
    if ARGS["bake"] != "0":
        bake_lightmaps(os.path.dirname(ARGS["glb"]) if ARGS["glb"] else ARGS["out"], int(ARGS["bake"]))
    if ARGS["blend"]:
        bpy.ops.wm.save_as_mainfile(filepath=ARGS["blend"])
    if ARGS["panos"] != "none":
        pano_dir = os.path.join(HERE, "viewer", "pano")
        os.makedirs(pano_dir, exist_ok=True)
        setup_render(ARGS["res"], ARGS["samples"])
        allp = {q["id"]: q["eye"] for q in getattr(P, "PANOS", [])}
        ids = list(allp) if ARGS["panos"] == "all" else ARGS["panos"].split(",")
        for pid in ids:
            eye = allp.get(pid)
            if eye is None and ":" in pid:      # ad-hoc "name:u:v:z"
                pid, *xyz = pid.split(":")
                eye = [float(x) for x in xyz]
            render_pano(pid, eye, pano_dir if pid in allp else ARGS["out"], ARGS["pano_res"], ARGS["pano_samples"])
    if ARGS["renders"] != "none":
        os.makedirs(ARGS["out"], exist_ok=True)
        setup_render(ARGS["res"], ARGS["samples"])
        names = list(CAMS) if ARGS["renders"] == "all" else ARGS["renders"].split(",")
        for n in names:
            render_cam(n, ARGS["out"], ARGS["res"])


main()
