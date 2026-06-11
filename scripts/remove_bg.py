"""
FNAF Jumpscare Background Remover
==================================
Removes the dark office background from FNAF 1 jumpscare animations
by treating dark pixels as transparent.

Supports: .webp (animated/static), .gif
Outputs:  transparent animated WebP files in src/assets/transparent/

Usage:
  python scripts/remove_bg.py
"""

import os
import sys
from pathlib import Path
from PIL import Image
import numpy as np

# ─── CONFIG ──────────────────────────────────────────────────────────────────
ASSETS_DIR  = Path("src/assets")
OUTPUT_DIR  = Path("src/assets/transparent")

# Files to process
TARGETS = [
    "bonnie_jumpscare.webp",
    "chica_jumpscare.webp",
    "foxy_jumpscare.gif",
    "freddy_jumpscare.webp",
    "freddy_jumpscare_power.gif",
    "golden_freddy.webp",
]

# Background removal tuning
# Pixels with luminance BELOW this value (0-255) become transparent.
# The FNAF office bg is very dark (~15-40 luminance), animatronics are brighter.
DARK_THRESHOLD  = 55    # pixels darker than this → transparent
EDGE_FEATHER    = 20    # feather zone: pixels in [DARK_THRESHOLD, DARK_THRESHOLD+EDGE_FEATHER] are semi-transparent

# ─── HELPERS ─────────────────────────────────────────────────────────────────

def luminance(r, g, b):
    """Perceived luminance (BT.601)."""
    return 0.299 * r + 0.587 * g + 0.114 * b

def remove_dark_background(frame: Image.Image) -> Image.Image:
    """
    Convert a single PIL frame to RGBA with dark pixels made transparent.
    Uses a soft edge feather to avoid harsh hard edges.
    """
    img = frame.convert("RGBA")
    data = np.array(img, dtype=np.float32)  # H×W×4

    r, g, b, a = data[:,:,0], data[:,:,1], data[:,:,2], data[:,:,3]
    lum = 0.299 * r + 0.587 * g + 0.114 * b  # H×W

    # Fully transparent where very dark
    fully_transparent = lum < DARK_THRESHOLD
    # Feathered zone
    feather_zone = (lum >= DARK_THRESHOLD) & (lum < DARK_THRESHOLD + EDGE_FEATHER)
    feather_alpha = (lum - DARK_THRESHOLD) / EDGE_FEATHER  # 0→1 across the zone

    new_alpha = np.ones_like(lum, dtype=np.float32) * 255.0
    new_alpha[fully_transparent] = 0.0
    new_alpha[feather_zone] = feather_alpha[feather_zone] * 255.0

    data[:,:,3] = new_alpha
    return Image.fromarray(data.astype(np.uint8), "RGBA")


def get_frames(img: Image.Image):
    """Yield all frames from an animated image."""
    try:
        for i in range(getattr(img, "n_frames", 1)):
            img.seek(i)
            yield img.copy(), img.info.get("duration", 100)
    except EOFError:
        pass


def process_file(src_path: Path, dst_path: Path):
    print(f"\n  Processing: {src_path.name}")
    img = Image.open(src_path)
    n_frames = getattr(img, "n_frames", 1)
    print(f"    Frames: {n_frames}")

    frames = []
    durations = []
    for i, (frame, dur) in enumerate(get_frames(img)):
        processed = remove_dark_background(frame)
        frames.append(processed)
        durations.append(dur)
        if (i + 1) % 5 == 0 or i == 0:
            print(f"    Frame {i+1}/{n_frames}...", end="\r")

    print(f"    Done processing {n_frames} frames.        ")

    if len(frames) == 1:
        frames[0].save(dst_path, format="WEBP", lossless=True)
    else:
        frames[0].save(
            dst_path,
            format="WEBP",
            save_all=True,
            append_images=frames[1:],
            duration=durations,
            loop=0,
            lossless=False,
            quality=85,
            method=4,
        )

    size_kb = dst_path.stat().st_size / 1024
    print(f"    Saved → {dst_path}  ({size_kb:.1f} KB)")


# ─── MAIN ────────────────────────────────────────────────────────────────────

def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    print("=" * 60)
    print("  FNAF Jumpscare Background Remover")
    print("=" * 60)

    ok, fail = 0, 0
    for filename in TARGETS:
        src = ASSETS_DIR / filename
        if not src.exists():
            print(f"\n  SKIP (not found): {src}")
            continue
        # Always output as .webp
        dst_name = Path(filename).stem + "_transparent.webp"
        dst = OUTPUT_DIR / dst_name
        try:
            process_file(src, dst)
            ok += 1
        except Exception as e:
            print(f"\n  ERROR on {filename}: {e}")
            import traceback; traceback.print_exc()
            fail += 1

    print("\n" + "=" * 60)
    print(f"  Done! {ok} succeeded, {fail} failed.")
    print(f"  Transparent files → {OUTPUT_DIR.resolve()}")
    print("=" * 60)


if __name__ == "__main__":
    main()
