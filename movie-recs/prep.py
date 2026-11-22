"""Prepare posters (crop to 2:3), key character backgrounds, and build the voice envelope."""
import json, sys, wave
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

UP = sys.argv[1]  # uploads folder
OUT = "assets"

posters = {  # id: (file, crop box)
    "groundhog": ("257ccd1b-image.jpg", (6, 0, 731, 1087)),
    "shawshank": ("36e0f18b-image.jpg", (0, 0, 736, 1104)),
    "spirited":  ("fc120cfc-image.jpg", (48, 0, 688, 960)),     # drops the corner watermark
    "inception": ("923e6664-image.jpg", (0, 101, 736, 1205)),   # drops the garbled title block
    "madmax":    ("6998b1e8-image.jpg", (3, 0, 560, 836)),
}
for pid, (fn, box) in posters.items():
    im = Image.open(f"{UP}/{fn}").convert("RGB").crop(box).resize((720, 1080), Image.LANCZOS)
    im.save(f"{OUT}/poster-{pid}.jpg", quality=92)

def key(fn, name, borders, tol):
    im = Image.open(f"{UP}/{fn}").convert("RGB")
    a = np.asarray(im).astype(np.float32)
    h, w, _ = a.shape
    corners = np.concatenate([a[:8, :8].reshape(-1, 3), a[:8, -8:].reshape(-1, 3)])
    bg = np.median(corners, axis=0)
    near = np.sqrt(((a - bg) ** 2).sum(-1)) < tol
    lab, _ = ndimage.label(near)
    edge = set()
    if "t" in borders: edge |= set(np.unique(lab[0, :]))
    if "b" in borders: edge |= set(np.unique(lab[-1, :]))
    if "l" in borders: edge |= set(np.unique(lab[:, 0]))
    if "r" in borders: edge |= set(np.unique(lab[:, -1]))
    edge.discard(0)
    bgmask = np.isin(lab, list(edge))
    fg = ~bgmask
    fg = ndimage.binary_opening(fg, iterations=1)
    fg = ndimage.binary_fill_holes(fg)
    alpha = Image.fromarray((fg * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.1))
    rgba = im.copy(); rgba.putalpha(alpha)
    bbox = alpha.point(lambda v: 255 if v > 8 else 0).getbbox()
    rgba = rgba.crop(bbox)
    rgba.save(f"{OUT}/{name}.png", optimize=True)
    print(name, "bg", bg.round(), "bbox", bbox, "size", rgba.size)

key("97c24423-image.jpg", "host-sitting", "tlrb", 24)
key("ef74009d-image.jpg", "host-pointing", "tlr", 26)
Image.open(f"{UP}/6c6373ed-image.jpg").convert("RGB").resize((1080, 1920), Image.LANCZOS).save(f"{OUT}/host-dark.jpg", quality=92)

# Voice envelope at 30 fps, drives the "talking" motion.
w = wave.open(sys.argv[2]); sr = w.getframerate()
x = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(np.float32) / 32768
hop = sr // 30
n = len(x) // hop
rms = np.sqrt((x[: n * hop].reshape(n, hop) ** 2).mean(1))
rms = np.convolve(rms, [0.25, 0.5, 0.25], mode="same")
env = np.clip(rms / np.percentile(rms, 95), 0, 1)
open(f"{OUT}/env.js", "w").write("window.ENV=" + json.dumps([round(float(v), 3) for v in env]) + ";")
print("env frames", n)
