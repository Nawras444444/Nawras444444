"""Give every icon a transparent background so it composites over the 3D stage.

g-* icons sit on pure black: alpha comes from brightness, colour is un-premultiplied.
The other icons sit on a textured navy backdrop: they get a soft elliptical feather.
"""
import glob, os, sys
import numpy as np
from PIL import Image

d = sys.argv[1]
for f in glob.glob(f"{d}/*.jpg"):
    a = np.asarray(Image.open(f).convert("RGB")).astype(np.float32) / 255
    h, w, _ = a.shape
    if os.path.basename(f).startswith("g-"):
        al = np.clip((a.max(2) - 0.04) / 0.96, 0, 1)
        rgb = np.where(al[..., None] > 0.001, np.clip(a / np.maximum(al[..., None], 1e-3), 0, 1), 0)
    else:
        yy, xx = np.mgrid[0:h, 0:w]
        r = np.sqrt(((xx - w / 2) / (w * 0.5)) ** 2 + ((yy - h / 2) / (h * 0.5)) ** 2)
        al = np.clip((1.0 - r) / 0.28, 0, 1) ** 1.4
        rgb = a
    out = np.dstack([rgb, al]) * 255
    Image.fromarray(out.astype(np.uint8), "RGBA").save(f[:-4] + ".webp", quality=88, method=6)
    os.remove(f)
