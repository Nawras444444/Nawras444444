"""Prepare per-story assets from the extracted page images:
person cutouts (rembg), photo cards, maps, flags  -> ./assets/NN_*.png"""
import os, sys, json
import numpy as np
from PIL import Image, ImageFilter
from rembg import remove, new_session

RAW = sys.argv[1]          # folder with pNNN.jpg extracted from the MHTML
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets")
os.makedirs(OUT, exist_ok=True)

# story -> (person part, map part, flag part, person crop box or None, cutout?)
STORIES = {
 1: (38, 37, 36, None, True),
 2: (35, 34, 33, (240, 50, 512, 352), True),
 3: (32, 31, 36, (0, 0, 9999, 9999), True),
 4: (30, 29, 28, None, True),
 5: (27, 26, 36, None, True),
 6: (25, 24, 23, (0, 20, 196, 479), True),
 7: (22, 21, 20, None, True),
 8: (19, 18, 36, None, True),
 9: (17, 16, 15, (115, 45, 400, 232), False),
 10: (14, 13, None, None, True),
 11: (11, 10, 9, (300, 0, 512, 269), True),
 12: (8, 16, 15, None, True),
 13: (7, 6, 5, None, True),
 14: (4, 10, 3, None, False),
 15: (2, 37, 36, None, True),
}
# rows at the bottom carrying stock-site watermark strips (fraction of height to trim)
TRIM_BOTTOM = {37: 0.0, 26: 0.1, 18: 0.1, 34: 0.1, 21: 0.1, 6: 0.12, 12: 0.08, 13: 0.0}

sess = new_session("u2net_human_seg")

def load(i):
    return Image.open(f"{RAW}/p{i:03d}.jpg").convert("RGB")

def trim(im, i):
    f = TRIM_BOTTOM.get(i, 0)
    return im.crop((0, 0, im.width, int(im.height * (1 - f)))) if f else im

for n, (pp, mp, fp, box, do_cut) in STORIES.items():
    im = load(pp)
    if box:
        im = im.crop((box[0], box[1], min(box[2], im.width), min(box[3], im.height)))
    im.save(f"{OUT}/{n:02d}_photo.png")
    if do_cut:
        big = im.resize((im.width * 2, im.height * 2), Image.LANCZOS)
        cut = remove(big, session=sess, post_process_mask=True)
        a = np.array(cut)
        al = a[..., 3]
        # keep only the largest connected blob
        import cv2
        nlab, lab, stats, _ = cv2.connectedComponentsWithStats((al > 128).astype(np.uint8))
        if nlab > 1:
            k = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
            keep = cv2.dilate((lab == k).astype(np.uint8), np.ones((9, 9), np.uint8))
            al = (al * keep).astype(np.uint8)
        a[..., 3] = al
        cut = Image.fromarray(a, "RGBA")
        cut = cut.crop(cut.getbbox())
        cut.save(f"{OUT}/{n:02d}_cut.png")
    trim(load(mp), mp).save(f"{OUT}/{n:02d}_map.png")
    if fp:
        trim(load(fp), fp).save(f"{OUT}/{n:02d}_flag.png")
    print("story", n, "ok", flush=True)
