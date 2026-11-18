# First Floor Plan v5 → walkable 3D model

This folder turns `reference/First_Floor_2D_Plan_v5.pdf` into a 3D model you can walk through in a browser, 4K path-traced 360° photos of every main space, and 4K Cycles stills.
It is a standalone prototype and is not part of the clinic app.

```
plan.py           single source of truth: rooms, walls, doors/windows, stairs, viewpoints, photo spots (feet)
build_blender.py  Blender: geometry + materials + furniture + lights -> web model, baked light, panoramas, stills
ph_assets.py      Poly Haven (CC0) scanned furniture, PBR textures and HDRI skies: download + import helpers
textures.py       procedural textures (numpy), used where no scanned set fits and as the offline fallback
compare.py        overlays the PDF's walls (red) on the top-down render -> renders/compare_plan.jpg
viewer/           static web viewer (index.html, app.js bundle, model.glb, lm_*.jpg, plan.json, pano/); host it anywhere
viewer/src/       viewer source (Three.js + three-mesh-bvh, bundled with esbuild, no CDN): main.js, pano.js (Photo mode)
viewer/pano/      4K 360° panoramas for Photo mode, one <id>.jpg per photo spot in plan.py PANOS
renders/          4K Cycles stills (3840 x 2160) and the plan overlay
tools/            prep_textures.py, produce.sh (full production run), optimize_glb.sh (web model),
                  make_artifact.py (static copy for text-only hosts), test_photo_mode.mjs, make_test_panos.py
shots.mjs         headless screenshots of the viewer (Playwright)
```

## Run the viewer

```bash
node serve.mjs 8090
```

Then open `http://localhost:8090`. To host it, copy the `viewer/` folder to any static host (it needs `model.glb`, `plan.json`, `app.js`, `index.html`, and `pano/` for Photo mode).

* **Photo** (default when panoramas exist): path-traced 360° photos taken at fixed standing points. Drag to look, scroll or pinch to zoom, and click a ring on the floor (or press ↑ / W) to step to the next spot. See "Photo mode" below.
* **Walk** (default when there are no panoramas): on desktop, click to look with the mouse, use WASD or the arrow keys to move, Shift to run, Esc to release the mouse.
  On a phone, use your left thumb as a joystick and drag on the right side to look.
* **Overview**: a dollhouse view with the ceiling and upper floor hidden and labels showing each room's size. Click a label, or double-click a floor, to walk there.
* **Minimap** (top right): drawn the same way as the PDF, with East at the top and North on the left. Tap it to jump to that spot (in Photo mode: to the nearest photo spot). Blue dots are photo spots that have a panorama.
* **Edit**: tap any object (furniture, a false ceiling, a pipe run, a conduit circuit) to select it. Drag the arrows to move it, or use Rotate 90°, Remove and Put back. Restore all undoes everything. Changes are saved in the browser on that device, and Copy layout puts them on the clipboard as JSON.
* **Layers**: turn Furniture, False ceiling, Water lines and Electric lines on or off. Turning on a services layer also turns on X-ray walls, because those lines are concealed.
* **Go to…**: jumps to a named viewpoint or a room. **HQ** turns on ambient occlusion and sun shadows (on by default on desktop, off on phones).
* URL options: `?view=kitchen`, `?room=store2`, `?mode=overview`, `?mode=walk`, `?hq=0`, `?pano=hall_mid` (with optional `&heading=90&pitch=-10&fov=65`; heading is degrees clockwise from north), `?still=4` (render 4 frames and stop, for screenshots), `?debug=lm` or `?debug=albedo` (show only the baked light or only the textures on walls, floors and ceilings).

### Photo mode

* **Spots** come from `PANOS` in `plan.py` (`python3 plan.py` writes them to `plan.json` as `panos: [{id, label, eye: [u, v, z] ft, file, room}]`). The list order is the render priority.
* **Files**: `viewer/pano/<id>.jpg`, equirectangular 2:1 (4096 × 2048 or 8192 × 4096), from an upright camera at the eye point. The viewer asks for every file once at startup and offers only the ones that exist, so renders can arrive one at a time. With no files at all the Photo button is hidden. The browser prints one "404" network line per missing file in its console; that is expected.
* **Convention**: the horizontal centre of the image looks **north**, moving right turns toward **east**, the left and right edges are south, and the top is straight up (checked against the Cycles renders from `build_blender.py --panos`). If the renders come out differently, change the two constants at the top of `viewer/src/pano.js` and rebuild:
  * `PANO_YAW_OFFSET_DEG`: compass bearing (degrees clockwise from north) that the image centre looks at. `0` = north, `90` = east.
  * `PANO_FLIP_X`: `true` if moving right in the image turns toward west (a mirrored image).
  * A single pano can override them through `PANO_OVERRIDES` in `plan.py`: `{"store1": {"yaw_offset_deg": 90, "flip_x": True}}`.
* **Hotspots**: a ring is shown for every other available spot within 22 ft that has a clear line to it. The line is tested against the model's walls and glazing (not furniture, not the open door leaves), on the straight line between the two eye points and on parallel lines 1'3" to either side.
* **Switching**: Photo → Walk puts the walker on the photo spot with the same heading. Walk → Photo goes to the nearest spot, preferring one in sight (so the kitchen goes to the hall's spot, not to the bedroom's through the wall). In Photo mode the minimap and the Go-to list (group "Photo spots") move between spots. Edit, Layers and HQ are hidden because the photos are fixed renders; those changes show in Walk mode.
* **Display**: the photo is drawn as-is (sRGB, no tone mapping, no ambient-occlusion or bloom pass), with mipmaps and anisotropic filtering. Images larger than the device's texture limit (or 4096 px on phones) are scaled down first. At most 6 panoramas are kept in memory: the current one and its nearest neighbours, which are preloaded.
* **Test images**: `python3 tools/make_test_panos.py` writes placeholder panoramas for six spots. It skips files that already exist; `--force` overwrites, `--all` covers every spot. Each has compass letters, a 15° grid and a yellow cross where each neighbouring spot's floor point should be, so the floor rings must land on the crosses.

## Rebuild

Blender 4.4 runs as a Python module: `pip install bpy==4.4.0 "numpy<2" pillow` on Python 3.11 (or run `blender -b -P build_blender.py -- …`). `$BPY` below is that Python.

1. Rooms, walls, openings and photo spots go to `viewer/plan.json`:

   ```bash
   python3 plan.py
   ```

2. Once, download the Poly Haven CC0 assets (scanned furniture and props, PBR texture scans, HDRI skies) into `build/ph/` (git-ignored). This needs network access to `api.polyhaven.com` and `dl.polyhaven.org`. Without it the build falls back to procedural textures and simple box furniture.

   ```bash
   python3 ph_assets.py fetch
   ```

3. Run the whole production pipeline:

   ```bash
   BPY=$BPY tools/produce.sh all
   ```

   It runs these steps in order:
   * **Textures** (`tools/prep_textures.py`): the procedural set from `textures.py`, replaced by scanned sets where one fits, into `build/tex_final/`.
   * **Model and baked light** (`build_blender.py --glb build/model_raw.glb --bake 72`): writes `viewer/lm_WALL.jpg`, `lm_FLOOR.jpg` and `lm_CEIL.jpg`.
   * **Web model** (`tools/optimize_glb.sh`): textures go to 1024 px WebP (scanned props 512 px) and meshes are meshopt-compressed, giving `viewer/model.glb` of about 27 MB (from about 120 MB).
   * **Panoramas** (`--panos all --pano_res 4096x2048 --pano_samples 64 --skip_existing 1`): into `viewer/pano/`.
   * **Stills** (`--renders … --res 3840x2160 --samples 64`): into `renders/`.

4. Build the viewer and take screenshots:

   ```bash
   npm install && npm run build:viewer
   ```

   ```bash
   node shots.mjs renders/web
   ```

5. For hosts that serve only text and images, `python3 tools/make_artifact.py` writes a static copy to `build/artifact/`. It carries the model as base64 text parts that the viewer joins.

`--bake N` bakes the lighting of the fixed shell (walls, floors, ceilings, false ceilings) into the three atlases with Cycles, then denoises them. The viewer multiplies them onto the surfaces; that is where the soft bounce light, the cove glow and the downlight pools come from. Furniture is left out of the bake so it stays movable, and gets a soft contact shadow that moves with it. `--bake_groups CEIL` re-bakes one atlas with the same layout, so the web model stays valid.

To change the building, edit `plan.py`, then rebuild. The viewer reads `plan.json` for room names, sizes, photo spots and the minimap.

## How the realism is made, and its limits

* **Materials** are Poly Haven CC0 photo scans with colour, roughness and normal maps: oak and herringbone floors, vitrified and kota tiles, granite, kitchen dado tile, fabrics, concrete and asphalt. The painted walls and ceilings are a plaster scan tinted per room. Procedural textures (`textures.py`) fill the few slots with no fitting scan.
* **Furniture and props**: 89 scanned models are placed, including the sofa, lounge chair, coffee and side tables, TV cabinet, dining chairs, pendant and desk lamps, brass and steel kitchenware, plants, books, frames, cartons, crates, barrels and a hand truck. Poly Haven has no CC0 scan of a modern bed, flat TV, curtains, rugs, bathroom fittings, modular kitchen or fridge, so those are modelled to size here and given scanned materials.
* **Light**: an HDRI sky photo (`rustig_koppie_puresky`) supplies the sun and sky light. It is rotated so the sun, 28° high, comes from the west-south-west (the road side), as on a late afternoon. Indoors there are recessed downlights, LED coves in the false ceilings, pendants and lamps. Everything goes through the AgX view transform ("Medium High Contrast" look), as in photographic arch-viz.
* **Walk mode** is real time, so it can't path-trace. The walls, floors and ceilings carry Cycles-baked light (direct and bounced, denoised). Furniture is lit live so it stays movable, with ambient occlusion, bloom and sun shadows on desktop. Expect "good game engine" realism.
* **Photo mode** is the ultra-realistic part: each spot is a full Cycles path-traced 4096 × 2048 panorama, with 64 samples, adaptive sampling and OpenImageDenoise.
* **Stills** are 3840 × 2160 Cycles renders from a level camera with lens shift (two-point perspective, as architectural photographers shoot), so walls and door frames stay vertical.
* **Exposure** is set per room, as a photographer would: the white stores under bare LED panels are shot darker than the warm living spaces, or their walls clip to pure white (`EXPOSURE` in `plan.py`, in EV).

Render cost on the 4-core CPU this was built on (no GPU):

| Step | Time |
|---|---|
| Bake the walls, floors and ceilings | about 20 min (ceilings take 6× samples) |
| One 4K interior panorama | 28–36 min alone (48 min while sharing the CPU) |
| One 4K still | similar to a panorama |

An animated, cinematic walkthrough like the reference video needs 25–30 path-traced frames per second, so about 1,500–1,800 frames per minute of video. At these times that is several weeks of CPU rendering per minute. On a desktop GPU Cycles is typically tens of times faster, so the same scene could render a short walkthrough overnight. The pipeline is ready for that: `build_blender.py` would need a camera path and `sc.cycles.device = "GPU"`.

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
