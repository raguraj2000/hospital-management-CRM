#!/usr/bin/env bash
# Shrink the exported GLB for the web without touching its node tree (names/extras drive the viewer):
#   scanned-model textures -> 512 px, our textures -> 1024 px, all -> WebP, meshes -> meshopt.
# usage: tools/optimize_glb.sh in.glb out.glb
set -euo pipefail
in="$1"; out="$2"; t="$(mktemp -d)"
npx gltf-transform resize "$in" "$t/a.glb" --width 512 --height 512 --pattern "^models_" >/dev/null
npx gltf-transform resize "$t/a.glb" "$t/b.glb" --width 1024 --height 1024 >/dev/null
npx gltf-transform webp "$t/b.glb" "$t/c.glb" --quality 80 >/dev/null
npx gltf-transform meshopt "$t/c.glb" "$out" >/dev/null
rm -rf "$t"
ls -la "$out"
