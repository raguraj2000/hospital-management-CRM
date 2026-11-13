# First Floor Plan v5 → walkable 3D model

This folder turns `reference/First_Floor_2D_Plan_v5.pdf` into a 3D model you can walk through in a browser, plus photoreal Cycles stills.
It is a standalone prototype and is not part of the clinic app.

```
plan.py           single source of truth: rooms, walls, doors/windows, stairs, viewpoints (feet)
textures.py       procedural textures (tiles, kota, wood, granite, fabric…) made with numpy, no downloads
build_blender.py  Blender: geometry + materials + furniture + lights + cameras -> viewer/model.glb + renders/*.jpg
compare.py        overlays the PDF's walls (red) on the top-down render -> renders/compare_plan.jpg
viewer/           static web viewer (index.html, app.js bundle, model.glb, plan.json); host it anywhere
viewer/src/       viewer source (Three.js + three-mesh-bvh, bundled with esbuild, no CDN)
shots.mjs         headless screenshots of the viewer (Playwright)
```

## Run the viewer

```bash
node serve.mjs 8090
```

Then open `http://localhost:8090`. To host it, copy the `viewer/` folder to any static host (it needs `model.glb`, `plan.json`, `app.js`, `index.html`).

* **Walk** (default): on desktop, click to look with the mouse, use WASD or the arrow keys to move, Shift to run, Esc to release the mouse.
  On a phone, use your left thumb as a joystick and drag on the right side to look.
* **Overview**: a dollhouse view with the ceiling and upper floor hidden and labels showing each room's size. Click a label, or double-click a floor, to walk there.
* **Minimap** (top right): drawn the same way as the PDF, with East at the top and North on the left. Tap it to jump to that spot.
* **Edit**: tap any object (furniture, a false ceiling, a pipe run, a conduit circuit) to select it. Drag the arrows to move it, or use Rotate 90°, Remove and Put back. Restore all undoes everything. Changes are saved in the browser on that device, and Copy layout puts them on the clipboard as JSON.
* **Layers**: turn Furniture, False ceiling, Water lines and Electric lines on or off. Turning on a services layer also turns on X-ray walls, because those lines are concealed.
* **Go to…**: jumps to a named viewpoint or a room. **HQ** turns on ambient occlusion and sun shadows (on by default on desktop, off on phones).
* URL options: `?view=kitchen`, `?room=store2`, `?mode=overview`, `?hq=0`.

## Rebuild

Blender 4.4 is used as a Python module (`pip install bpy==4.4.0` on Python 3.11), or run it with `blender -b -P build_blender.py -- …`.

```bash
python3 plan.py
```

```bash
python textures.py build/textures
```

```bash
python build_blender.py --tex build/textures --glb viewer/model.glb --bake 72 --renders all --samples 64 --res 1280x720
```

```bash
python3 compare.py
```

```bash
npm install && npm run build:viewer
```

```bash
node shots.mjs renders/web
```

`--bake N` bakes the lighting of the fixed shell (walls, floors, ceilings, false ceilings) into `viewer/lm_WALL.jpg`, `lm_FLOOR.jpg` and `lm_CEIL.jpg` with Cycles, then denoises them. The viewer multiplies these onto the surfaces, which is where the soft bounce light, the cove glow and the downlight pools come from. Furniture is left out of the bake so it stays movable; it gets a soft contact shadow that moves with it.

To change the building, edit `plan.py`, then rebuild. The viewer reads `plan.json` for room names, sizes and the minimap.

---

# Model notes

## Orientation

* **Main entrance faces SOUTH.** The main door is in the south (front) wall of the Main Hall and opens from the Entrance Space into the hall.
* **West is the road side.** The West Foot Path (4'9" × 35') runs in front of the store shutters. In the model the road lies beyond it at ground level.
* The model uses the same axes as the drawing. `u` is measured in feet southward from the north outer face, and `v` in feet westward from the east outer face.
  In three.js, North is −z and East is +x.

## Inside dimensions (as drawn, all kept exactly)

| Room | Inside size | Floor finish in model |
|---|---|---|
| Store room (NE) | 10' × 11'9" | vitrified tile |
| Master bath | 4' × 11'9" | anti-skid tile, wall tile to 7' |
| Master bedroom | 15' × 11'9" | wood-look laminate |
| Kitchen | 8' × 11'9" | vitrified tile, granite L-counter |
| Kitchen outside space | 3' × 12' | kota stone |
| Store room bath | 5' × 8' | anti-skid tile, wall tile to 7' |
| Main hall | 29' × 8' | vitrified tile |
| Entrance space | 7' × 8' (4' from hall + 3' strip) | kota stone |
| Store 1 / 2 / 3 | 10' × 16' each | IPS cement |
| Common bath | 3' × 5'6" | anti-skid tile |
| Up stair / Down stair | 3' / 3' wide | granite treads |
| Walk path | ~4' | kota stone |

Walls: 9" outer brick walls, 6" partitions, 4½" walls for the common bath, and 6" parapets 3'6" high with granite coping.

## Doors and windows

The table measures every opening from the inside face of the wall named in brackets.

| Opening | Wall | Size | Position | Opens |
|---|---|---|---|---|
| **Main door** | hall south (front) wall | 3'6" × 7' teak, panelled | 4' from hall's east wall | into hall, hinged on west side |
| Store room door | hall east wall | 3' × 7' | 1' from hall's north wall | into store room |
| Store room bath door | store room west wall | 2'6" × 7' | 6" from north wall | into bath (no door from hall) |
| Master bedroom door | hall east wall | 3' × 7' | 3" from bedroom's south wall | into bedroom |
| Kitchen door | hall east wall | 3' × 7' | 6" from kitchen's north wall | into kitchen |
| Master bath door | bath/bedroom wall | 2'6" × 7' | **2" from the east wall** | into bath |
| Common bath door | its south wall | 2' × 7' | 3" from the main-hall-side wall | outward to open space |
| Store 1 shutter | west wall | 7' × 8' rolling | centred (1'6" each side) | rolled up |
| Store 2 shutter | west wall | 7' × 8' rolling | centred | rolled up |
| Store 3 door | west wall, right (south) half | 3' × 7' | 6' from north wall, 1' from south wall | into store; left half is wall |
| Store room windows | east / north | 4' / 5' | 2'3" from N wall / 2'9" from E wall | sill 3', head 7' |
| Master bath vent | east | 2' | 6" from N wall | sill 5' |
| Master bedroom window | east | 6' | 4' from N wall | sill 3' |
| Kitchen windows | east / south | 4' / 3' | 1'9" from N wall / 3'9" from E wall | sill 3'6" (above counter) |
| Store room bath vent | north | 2' | 2'6" from E wall | sill 5' |
| Store 1 window | north | 6' | 4'6" from E wall | sill 3' |
| Main hall | — | — | **no window** (v5: bath is behind it) | — |

The drawing doesn't dimension opening positions. These were measured off the PDF and are accurate to about ±3".

## Changes, assumptions and things to verify on site

1. **The overall footprint doesn't close.** The drawing's totals are "~41'" on the east side and "~40'6"" on the north side. The north-side inside sizes alone (11'9" + 8' + 16' + 4'9") already add up to 40'6", which leaves nothing for walls. With every inside size kept exact, the model's footprint is **43'6" × 43'6"** to the outside of the parapets. If the plot is fixed at about 41' × 40'6", some rooms must shrink by about 2–3'. Decide which before building.
2. **Heights are assumed** because the drawing shows none. The model uses 10' floor to ceiling, a 6" slab, 7' doors, 8' shutters, and window sills at 3' (3'6" in the kitchen, 5' for vents). Ground level is taken as 10'6" below the first floor.
3. **The up stair is too short.** A 3'-wide straight flight in about 10' of run can't reach 10'6" floor-to-floor comfortably. The model's flight works out to roughly 8.4" risers on 8.1" treads, which is about 45°. In practice it needs a dog-leg with a landing, or more length. The model shows the steep straight flight, closed off where it reaches the 2nd floor, which isn't modelled.
4. **The down stair works.** It has 16 risers of about 7.9" over about 20' and descends toward the west to ground level.
5. **Railings were added.** Steel railings (3'4") run along the open edge of the down stair, at its top, and on the walk-path side of the up stair. The drawing leaves these edges open. The solid wall the drawing shows between the walk path and the down stair is kept, full height.
6. **The walkways are covered.** The west foot path, kitchen outside space and entrance area are assumed to sit under the 2nd floor slab. The upper floor is shown only as a closed block.
7. **The main hall has no window,** following v5. It gets daylight only through the main door. Plan for mechanical ventilation, or a ventilator high in the hall wall.
8. **The master bath door at 2" from the east wall** leaves no room for a door frame or architrave. A 4" minimum is typical, so check this with the carpenter. The model keeps it at 2" as drawn.
9. **The common bath** at 3' × 5'6" fits a WC and a small wall basin only.
10. **Store 3:** the left (north) half of the frontage is wall and the right half has a normal 3' door, as v5 states.
11. **Furniture and finishes are illustrative.** They are sized to fit and to show that each room works. The stores and the store room get steel racks and cartons; the other rooms get residential finishes.

## False ceiling, water lines and electric lines

None of these are on the drawing. They are a proposal to discuss with the contractor, plumber and electrician, and each piece can be selected and removed in the viewer.

**False ceiling** (gypsum):

| Room | Type | Underside height |
|---|---|---|
| Main hall | 1'6" perimeter band with LED cove, 16 downlights, wood-finish centre | 9'3" (centre stays 10') |
| Master bedroom | 1'6" perimeter band with LED cove, 9 downlights | 9'3" (centre stays 10') |
| Kitchen | full flat board, 6 downlights | 9'1" |
| Master bath, store room bath, common bath | full flat board, hides the pipes above | 8'6" |
| Stores, store room | none (surface LED panels) | 10' |

**Water lines** (blue = cold, red = hot, grey = drain):

* The cold supply comes down from a terrace tank at the corner of the kitchen outside space. A main runs in the ceiling void along the hall's east wall, with a drop to each fixture.
* Each of the two attached baths has a geyser with a short hot line to its shower. The master bath also has a hot line to the basin.
* WCs and floor traps drain under the slab to vertical stacks: master bath and kitchen on the east face, store room bath on the north face, common bath beside the stair.

**Electric lines** (orange conduit, white plates):

* The distribution board is inside the main door. A trunk runs along the hall ceiling.
* There is one circuit per room, running to the ceiling light points, then to a switchboard beside the door at 4'6", then to the sockets.
* The stores have their own circuits, with switchboards beside the shutters.

## How the model was checked against the drawing

`renders/plan_top.jpg` is an orthographic top view at the same orientation as the PDF. `compare.py` draws the PDF's walls in red on top of it to produce `renders/compare_plan.jpg`.
Any offset you see in that overlay comes from the drawing, which isn't exactly to scale: for example, the 15' bedroom is drawn about 16' wide. The model follows the written dimensions.
