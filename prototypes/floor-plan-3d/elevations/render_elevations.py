"""First-floor elevations: orthographic views of the four outer faces of the 3D model.

    $BPY elevations/render_elevations.py [--faces south,west,north,east] [--photo 1] [--lines 1]
                                         [--width 3840] [--samples 64]

Imports build_blender.py unchanged (importing it builds the whole scene with its lights and renders nothing), hides
the upper-storey massing (the drawing covers the first floor; the ground floor stays below it as context), and for
each face writes to elevations/out/:

  <face>_lines.png    line work (black on white): traced from a one-sample depth + surface-normal pass rendered at
                      twice the size, so seams between wall pieces do not draw lines, only real edges and steps do
  <face>_albedo.png   flat surface colours (no light), for the colour wash in the drawing
  <face>_mask.png     where the building is (white) and where the sky is (black)
  <face>_photo.jpg    path-traced render (Cycles, same materials, sun and sky as the stills)
  frames.json         the image <-> plan mapping of every face, used by annotate.py to place levels and dimensions

Furniture, plants, lights and services are left out of the line work (kept in the photo). The site ground, road and
kerb are left out of the line work too; annotate.py draws the ground line.
"""
import json
import math
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(HERE, "out")


def opts():
    a = {"faces": "south,west,north,east", "photo": "1", "lines": "1", "width": "3840", "samples": "64"}
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    for i, k in enumerate(argv):
        if k.startswith("--") and k[2:] in a and i + 1 < len(argv):
            a[k[2:]] = argv[i + 1]
    return a


A = opts()
sys.argv = [sys.argv[0], "--renders", "none", "--panos", "none"]   # build_blender reads its own options from argv
sys.path.insert(0, ROOT)
os.chdir(ROOT)
t_build = time.time()
import build_blender as BB  # noqa: E402  (importing it builds the scene)
import bpy  # noqa: E402
import numpy as np  # noqa: E402
from bpy_extras.object_utils import world_to_camera_view  # noqa: E402
from mathutils import Vector  # noqa: E402

P, FT = BB.P, BB.FT
print(f"scene built in {time.time() - t_build:.0f}s", flush=True)

# Frame shared by all four faces, in plan feet: 51.5 ft across (the 43.5 ft building + 4 ft each side) and from
# 1.5 ft below ground level to above the stair cabin. Same scale on every sheet.
SPAN, Z_LO, Z_HI = 51.5, P.GROUND - 1.5, 20.5
CENTRE = 43.5 / 2
DIST = 150.0                       # camera distance (ft); orthographic, so it only has to clear the building
# looking direction in Blender world (X east, Y north) and the plan axis that runs across the image
# sun: compass bearing it shines from. The stills use 250 (late afternoon, west-south-west), which leaves the north and
# east faces in shade, so those two are lit the way presentation elevations are, by a sun that really reaches them at
# Indian latitudes: a summer evening from the west-north-west, and the morning from the east-south-east.
FACES = {
    "south": {"dir": (0, 1, 0), "axis": "v", "title": "South elevation", "note": "main entrance side",
              "sun": 250, "sun_note": "late-afternoon sun from the west-south-west"},
    "west": {"dir": (1, 0, 0), "axis": "u", "title": "West elevation", "note": "road side",
             "sun": 250, "sun_note": "late-afternoon sun from the west-south-west"},
    "north": {"dir": (0, -1, 0), "axis": "v", "title": "North elevation", "note": "rear",
              "sun": 300, "sun_note": "summer-evening sun from the west-north-west"},
    "east": {"dir": (-1, 0, 0), "axis": "u", "title": "East elevation", "note": "side",
             "sun": 100, "sun_note": "morning sun from the east-south-east"},
}


def camera(face, width):
    f = FACES[face]
    height = int(round(width * (Z_HI - Z_LO) / SPAN / 2)) * 2
    sc = bpy.context.scene
    cd = bpy.data.cameras.new("ELEV_" + face)
    cd.type = "ORTHO"
    cd.sensor_fit = "HORIZONTAL"
    cd.ortho_scale = SPAN * FT
    cd.clip_start = 1.0
    cd.clip_end = (DIST + 80) * FT
    co = bpy.data.objects.new("ELEV_" + face, cd)
    sc.collection.objects.link(co)
    d = Vector(f["dir"])
    centre = BB.W(CENTRE, CENTRE, (Z_LO + Z_HI) / 2)
    co.location = centre - d * (DIST * FT)
    co.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    sc.camera = co
    sc.render.resolution_x, sc.render.resolution_y = width, height
    sc.render.resolution_percentage = 100
    bpy.context.view_layer.update()
    # measured mapping (robust to sign mistakes): image x from the plan axis, image y from height
    def px(u, v, z):
        p = world_to_camera_view(sc, co, BB.W(u, v, z))
        return p.x * width, (1 - p.y) * height
    if f["axis"] == "v":
        x0, _ = px(CENTRE, 0.0, 0.0)
        x1, _ = px(CENTRE, 43.5, 0.0)
    else:
        x0, _ = px(0.0, CENTRE, 0.0)
        x1, _ = px(43.5, CENTRE, 0.0)
    _, y0 = px(CENTRE, CENTRE, 0.0)
    _, y1 = px(CENTRE, CENTRE, 10.0)
    frame = {"face": face, "title": f["title"], "note": f["note"], "sun": f["sun"], "sun_note": f["sun_note"],
             "axis": f["axis"], "width": width,
             "height": height, "x_at_0": x0, "x_per_ft": (x1 - x0) / 43.5, "y_at_0": y0, "y_per_ft": (y1 - y0) / 10.0}
    return co, frame


def set_visibility(line_work):
    """Upper storey always hidden. For the line work also furniture, lights, services and the open ground."""
    site_open = {"SITE__ground", "SITE__asphalt", "SITE__kota", "SITE__granite", "SITE__pvc_white"}
    items = set()
    for o in bpy.data.objects:
        if o.get("cat") == "ITEM":
            items.add(o.name)
            for c in o.children_recursive:
                items.add(c.name)
    for o in bpy.data.objects:
        cat = o.get("cat")
        hide = cat == "UPPER" or o.get("layer") in ("water", "electrical")
        if line_work:
            hide = hide or o.name in items or o.name.startswith("FURN__ph__") or o.name in site_open \
                or cat in ("FURN", "LIGHT", "MEP", "ELEC", "FCEIL")
        o.hide_render = hide


def load_exr(path, w, h, channels):
    img = bpy.data.images.load(path)
    img.colorspace_settings.name = "Non-Color"
    buf = np.empty(w * h * 4, np.float32)
    img.pixels.foreach_get(buf)
    bpy.data.images.remove(img)
    return buf.reshape(h, w, 4)[::-1, :, :channels]          # Blender stores rows bottom-up


def dilate(m, r):
    out = m.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dx * dx + dy * dy > r * r + r:
                continue
            out |= np.roll(np.roll(m, dy, 0), dx, 1)
    return out


# Material ids for the drawing's hatches (annotate.py): rolling shutters, glass, granite copings, timber.
MAT_ID = {"shutter": 1, "glass": 2, "glass_frosted": 2, "mirror": 2, "granite": 3, "teak": 4, "oak_light": 4,
          "walnut": 4}


def passes(w, h, sockets, override=None):
    """One-sample render of the given passes at w x h; returns {socket: float array (h, w, 4)}, top row first."""
    sc = bpy.context.scene
    vl = bpy.context.view_layer
    sc.render.resolution_x, sc.render.resolution_y = w, h
    sc.render.engine = "CYCLES"
    sc.cycles.samples = 1
    sc.cycles.use_adaptive_sampling = False
    sc.cycles.use_denoising = False
    sc.cycles.filter_width = 0.01                          # one ray through each pixel centre: no blended normals
    sc.render.film_transparent = True
    vl.use_pass_z = vl.use_pass_normal = vl.use_pass_diffuse_color = vl.use_pass_material_index = True
    vl.material_override = override
    sc.use_nodes = True
    nt = sc.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    rl = nt.nodes.new("CompositorNodeRLayers")
    comp = nt.nodes.new("CompositorNodeComposite")
    nt.links.new(rl.outputs["Image"], comp.inputs["Image"])
    fo = nt.nodes.new("CompositorNodeOutputFile")
    tmp = os.path.join(ROOT, "build", "elev_tmp")
    os.makedirs(tmp, exist_ok=True)
    for f in os.listdir(tmp):
        os.remove(os.path.join(tmp, f))
    fo.base_path = tmp
    fo.format.file_format = "OPEN_EXR"
    fo.format.color_depth = "32"
    fo.file_slots.clear()
    for sock in sockets:
        fo.file_slots.new(sock)
        nt.links.new(rl.outputs[sock], fo.inputs[sock])
    sc.render.filepath = os.path.join(tmp, "image")
    bpy.ops.render.render(write_still=False)
    out = {}
    for sock in sockets:
        f = next(os.path.join(tmp, f) for f in sorted(os.listdir(tmp)) if f.startswith(sock))
        out[sock] = load_exr(f, w, h, 4)
        os.remove(f)
    vl.material_override = None
    sc.use_nodes = False
    sc.render.film_transparent = False
    return out


def line_work(face, frame):
    """Edges from depth + geometric normals at 2x (a plain material, so bump maps add no speckle), surface colours
    and material ids from the real materials; saved at 1x (box-filtered, so the lines come out smooth)."""
    from PIL import Image
    w, h = frame["width"] * 2, frame["height"] * 2
    t0 = time.time()
    plain = bpy.data.materials.get("ELEV_plain") or bpy.data.materials.new("ELEV_plain")
    g = passes(w, h, ("Depth", "Normal"), override=plain)
    depth = g["Depth"][..., 0] / FT                         # feet from the camera plane
    nrm = g["Normal"][..., :3]
    del g
    for m in bpy.data.materials:
        m.pass_index = MAT_ID.get(m.name, 0)
    c = passes(w, h, ("DiffCol", "IndexMA"))
    alb, mid = c["DiffCol"][..., :3], np.rint(c["IndexMA"][..., 0]).astype(np.uint8)
    del c
    fg = depth < DIST * 3
    thin = np.zeros((h, w), bool)
    heavy = np.zeros((h, w), bool)
    for ax in (0, 1):
        a = [slice(None)] * 2
        b = [slice(None)] * 2
        a[ax], b[ax] = slice(0, -1), slice(1, None)
        a, b = tuple(a), tuple(b)
        z0, z1, f0, f1 = depth[a], depth[b], fg[a], fg[b]
        both = f0 & f1
        dz = np.abs(z0 - z1)
        cosn = (nrm[a] * nrm[b]).sum(-1)
        sil = f0 != f1                                     # building against the sky
        step = both & (dz > 0.08)                          # ~1 inch: frames, reveals, sills, recesses
        big = both & (dz > 2.0)                            # 2 ft: setbacks behind parapets, the stair, verandahs
        crease = both & (cosn < 0.82)                      # ~35 degrees: corners, slopes, stair nosings
        near_a = (z0 <= z1) & f0 | ~f1                    # the line belongs to the nearer surface
        for m, out in ((sil | step | crease, thin), (sil | big, heavy)):
            out[a] |= m & near_a
            out[b] |= m & ~near_a
    ink = np.where(dilate(heavy, 2), 1.0, np.where(dilate(thin, 1), 0.82, 0.0))
    W1, H1 = frame["width"], frame["height"]
    lines = Image.fromarray((255 * (1 - ink)).astype(np.uint8), "L").resize((W1, H1), Image.BOX)
    lines.save(os.path.join(OUT, f"{face}_lines.png"), optimize=True)
    srgb = np.where(alb <= 0.0031308, alb * 12.92, 1.055 * np.clip(alb, 0, None) ** (1 / 2.4) - 0.055)
    Image.fromarray((np.clip(srgb, 0, 1) * 255).astype(np.uint8), "RGB").resize((W1, H1), Image.BOX).save(
        os.path.join(OUT, f"{face}_albedo.png"), optimize=True)
    Image.fromarray((fg * 255).astype(np.uint8), "L").resize((W1, H1), Image.BOX).save(
        os.path.join(OUT, f"{face}_mask.png"), optimize=True)
    Image.fromarray(mid[::2, ::2], "L").save(os.path.join(OUT, f"{face}_matid.png"), optimize=True)
    print(f"lines {face} {time.time() - t0:.0f}s", flush=True)


def photo(face, frame, samples):
    """Path-traced, with a transparent background: an orthographic camera sees one sky direction only (a flat
    colour), so annotate.py puts a soft sky behind it instead."""
    sc = bpy.context.scene
    BB.setup_render((frame["width"], frame["height"]), samples)
    vl = bpy.context.view_layer
    vl.use_pass_z = vl.use_pass_normal = vl.use_pass_diffuse_color = vl.use_pass_material_index = False
    sc.view_settings.exposure = 0.0
    m = BB.ph()
    if m and BB.ARGS["hdri"] != "none":                 # the sky photo carries the sun: turn it to this face's bearing
        m.set_world_hdri(BB.ARGS["hdri"], 1.0, m.hdri_rotation_for_sun(BB.ARGS["hdri"], float(frame["sun"])))
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA"
    sc.render.filepath = os.path.join(OUT, f"{face}_photo.png")
    t0 = time.time()
    bpy.ops.render.render(write_still=True)
    sc.render.film_transparent = False
    print(f"photo {face} {time.time() - t0:.0f}s", flush=True)


def main():
    os.makedirs(OUT, exist_ok=True)
    faces = [f for f in A["faces"].split(",") if f]
    width, samples = int(A["width"]), int(A["samples"])
    frames_path = os.path.join(OUT, "frames.json")
    frames = json.load(open(frames_path)) if os.path.exists(frames_path) else {}
    cams = {}
    for face in faces:
        cams[face], frames[face] = camera(face, width)
    json.dump(frames, open(frames_path, "w"), indent=1)
    if A["lines"] == "1":
        set_visibility(True)
        for face in faces:
            bpy.context.scene.camera = cams[face]
            line_work(face, frames[face])
    if A["photo"] == "1":
        set_visibility(False)
        for face in faces:
            bpy.context.scene.camera = cams[face]
            photo(face, frames[face], samples)


main()
