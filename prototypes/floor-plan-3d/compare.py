"""Overlay the PDF's walls (red) on the top-down Cycles render to check the model against the drawing.

    python3 compare.py            -> renders/compare_plan.jpg
Needs reference/ref-1.png (pdftoppm -png -r 150 reference/First_Floor_2D_Plan_v5.pdf reference/ref)
and renders/plan_top.jpg (build_blender.py --renders plan_top).
"""
import os

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ref = Image.open(os.path.join(HERE, "reference", "ref-1.png")).convert("L")
top = Image.open(os.path.join(HERE, "renders", "plan_top.jpg")).convert("RGB")

# Render frame: ortho 46 ft over the image width, centred on u = v = 21.75 ft, east up / north left.
N = top.size[0]
SC = N / 46.0

# Reference frame (PDF at 150 dpi): measured outer corners of the drawing, in the 1300-px layout.
K = ref.size[0] / 1300.0
ref_u0, ref_u1 = 188.6 * K, 812.0 * K    # u = 0 (north outer face) .. u = 43.5 (south parapet)
ref_v0, ref_v1 = 162.8 * K, 776.0 * K    # v = 0 (east outer face)  .. v = 43.5 (west parapet)

# Map every render pixel to a reference pixel (separate x/y scale: the drawing is not exactly to scale).
ys, xs = np.mgrid[0:N, 0:N]
u = (xs - N / 2) / SC + 21.75
v = (ys - N / 2) / SC + 21.75
rx = ref_u0 + u / 43.5 * (ref_u1 - ref_u0)
ry = ref_v0 + v / 43.5 * (ref_v1 - ref_v0)
R = np.array(ref)
ok = (rx >= 0) & (ry >= 0) & (rx < R.shape[1] - 1) & (ry < R.shape[0] - 1)
g = np.full((N, N), 255)
g[ok] = R[ry[ok].astype(int), rx[ok].astype(int)]
walls = g < 90

out = np.array(top).astype(float) * 0.85
out[walls] = out[walls] * 0.2 + np.array([230, 30, 30]) * 0.8
side = Image.new("RGB", (N * 2, N), "white")
side.paste(Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)), (0, 0))
side.paste(top, (N, 0))
side.save(os.path.join(HERE, "renders", "compare_plan.jpg"), quality=88)
print("wrote renders/compare_plan.jpg")
