# First-floor elevations

The four outer faces of the first floor (First_Floor_2D_Plan_v5) as architectural elevation sheets and as
path-traced renders. They are made from the same 3D model as the walkable viewer and the stills, so every opening sits
where `plan.py` puts it. Nothing outside this folder is changed: `build_blender.py` and `plan.py` are only imported.

| Face | Looking | Shows |
|---|---|---|
| South | north | main entrance side: the main door and the kitchen's south window above the parapet |
| West | east | road side: the stores' two 7' rolling shutters and Store 3's door behind the foot-path parapet |
| North | south | rear: the store-room and Store 1 windows and the store-room bath ventilator |
| East | west | side: the store-room, master-bath, bedroom and kitchen windows |

## Files (`out/`)

| File | What it is |
|---|---|
| `<face>_drawing.png` | the sheet: line work, a light colour wash, rolling-shutter and glass hatches, ground line, levels, floor brackets, opening tags (W, V, D, RS) with sizes, two dimension chains, key plan, scale bar and notes |
| `<face>_render.jpg` | Cycles path-traced orthographic render (3840 px, 64 samples + denoise) on a soft sky |
| `first_floor_elevations.pdf` | the four sheets, one A3-landscape page each |
| `<face>_lines.png`, `_albedo.png`, `_mask.png`, `_matid.png`, `_photo.png`, `frames.json` | intermediate passes and the camera mapping |

## Heights are assumptions

The PDF plan gives positions and widths, not heights. The sheets use the model's assumptions and say so in their
notes. These are floor to ceiling 10'-0", slab 6", doors 7'-0", rolling shutters 8'-0", window sill 3'-0" and head
7'-0" (kitchen sill 3'-6"), ventilators 5'-0" to 7'-0", parapets 3'-6", and ground floor 10'-0" plus slab, so ground
level is −10'-6" from the first-floor FFL. The ground floor and the stair head room are context only. The upper storey
is not shown. To change a height, edit it in `plan.py` and rebuild; the sheets follow.

## How the sheets are made

```bash
# 1. passes and renders (Blender 4.4 as a Python module; about 40 min on 4 CPU cores, most of it the 4 renders)
$BPY elevations/render_elevations.py                       # --faces south,west --width 3840 --samples 64 --photo 0
# 2. sheets, renders on a sky, and the PDF (plain Python 3 + Pillow + numpy, under a minute)
python3 elevations/annotate.py
```

- **Cameras**: one orthographic camera per face, all with the same frame (51'-6" across) and the same scale.
  `frames.json` records the measured image ↔ plan mapping that `annotate.py` uses to place levels and dimensions.
- **Line work**: a one-sample depth and surface-normal pass at twice the size, with one plain material, so texture
  bump adds no speckle. A line is drawn where the depth steps (more than about an inch: frames, reveals, setbacks) or
  the surface turns (more than about 35°), and where the building meets the sky. Seams between wall pieces have
  neither, so they draw nothing. Steps over 2 ft and the outline are drawn heavier. Furniture, plants, lights,
  services and the open ground are left out of the line work.
- **Colour wash and hatches**: surface colours from the real materials at 40% over white. A material-ID pass finds
  the rolling shutters (horizontal slats every 3") and the glass (pale blue with glints).
- **Tags and chains**: the openings come from `plan.W`, using the outer walls that face each way, and their sills
  and heads add the levels.

## Page

`page/index.html` is the elevations page (face tabs, Drawing / Render, zoom to 4×). `python3 elevations/page/build_assets.py`
fills `page/elev/` with the full-size images and 2400 px previews; serve `elevations/page/` with any static server.
