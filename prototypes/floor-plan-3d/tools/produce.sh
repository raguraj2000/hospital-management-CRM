#!/usr/bin/env bash
# Full production run: web model + baked lighting, then 4K panoramas, then 4K cinematic stills.
#   BPY=<python with bpy> tools/produce.sh [pano ids|all]
set -uo pipefail
cd "$(dirname "$0")/.."
BPY="${BPY:-python}"
PANOS="${1:-all}"
mkdir -p build
echo "== textures"; "$BPY" tools/prep_textures.py | tail -1
echo "== model + lightmaps"; "$BPY" build_blender.py --glb build/model_raw.glb --bake 72 --renders none 2>&1 | grep -E "^(glb|lightmap|denoised|scanned)|Error"
mv -f build/lm_*.jpg viewer/ 2>/dev/null
tools/optimize_glb.sh build/model_raw.glb viewer/model.glb
echo "== panoramas"; "$BPY" build_blender.py --panos "$PANOS" --pano_res 4096x2048 --pano_samples 128 2>&1 | grep -E "^pano|Error"
echo "== stills"; "$BPY" build_blender.py --renders hall,living,bedroom,kitchen,master_bath,store_room,store1,store3,entrance,foot_path,street,aerial,plan_top --samples 160 --res 3840x2160 --out renders 2>&1 | grep -E "^rendered|Error"
echo "== done"
