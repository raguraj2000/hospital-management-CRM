"""Assemble a static, host-anywhere copy of the viewer for hosts that only serve text/images.

    python3 tools/make_artifact.py [out_dir]        (default build/artifact)

The GLB goes out as base64 text split into parts below 12 MB that each decode on their own
(3-byte aligned), listed in <meta name="model">; viewer/src/main.js joins them. Run
`npm run build:viewer` first so viewer/app.js is current.
"""
import base64
import os
import re
import shutil
import sys

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VIEWER = os.path.join(HERE, "viewer")
PART = 9 * 1024 * 1024          # bytes per part (multiple of 3) -> 12 MB of base64 text


def main(out):
    os.makedirs(os.path.join(out, "pano"), exist_ok=True)
    for f in os.listdir(out):                         # drop stale model parts
        if f.startswith("model.glb.b64"):
            os.remove(os.path.join(out, f))
    glb = open(os.path.join(VIEWER, "model.glb"), "rb").read()
    names = []
    for i in range(0, len(glb), PART):
        name = f"model.glb.b64.{i // PART}.txt"
        with open(os.path.join(out, name), "wb") as fh:
            fh.write(base64.b64encode(glb[i:i + PART]))
        names.append(name)
    for f in ["app.js", "plan.json"] + [f for f in os.listdir(VIEWER) if f.startswith("lm_")]:
        shutil.copy2(os.path.join(VIEWER, f), os.path.join(out, f))
    pano = os.path.join(VIEWER, "pano")
    for f in sorted(os.listdir(pano)) if os.path.isdir(pano) else []:
        if f.endswith(".jpg"):
            shutil.copy2(os.path.join(pano, f), os.path.join(out, "pano", f))
    html = open(os.path.join(VIEWER, "index.html"), encoding="utf-8").read()
    # the host wraps the page in its own document skeleton: keep title, metas, style and body content
    html = re.sub(r"<!doctype html>\s*|</?html[^>]*>\s*|</?head>\s*|</?body>\s*", "", html, flags=re.I)
    html = re.sub(r'<meta (charset|name="viewport")[^>]*>\s*', "", html)
    html = html.replace("</title>", f'</title>\n<meta name="model" content="{",".join(names)}">', 1)
    open(os.path.join(out, "index.html"), "w", encoding="utf-8").write(html)
    total = sum(os.path.getsize(os.path.join(dp, f)) for dp, _, fs in os.walk(out) for f in fs)
    print(f"{out}: {len(names)} model parts, {len(os.listdir(os.path.join(out, 'pano')))} panos, "
          f"{total / 1e6:.1f} MB")


if __name__ == "__main__":
    main(os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "build", "artifact")))
