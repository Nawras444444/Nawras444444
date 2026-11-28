"""Cut the reference icon sheets (5 columns x 6 rows) into single icons, upscaled 2x.

Rows are not evenly spaced on the sheets, so each row uses the band where its
icons actually sit (measured from brightness), padded a little.
"""
import sys
from PIL import Image

U, OUT = sys.argv[1], sys.argv[2]
SHEETS = {
    "s2": (f"{U}/873089cc-image.png", [(91, 274), (341, 515), (589, 778), (829, 1005), (1058, 1253), (1313, 1504)]),
    "s3": (f"{U}/2f81a571-image.png", [(40, 261), (295, 527), (559, 793), (820, 1006), (1037, 1227), (1282, 1504)]),
}
PAD = 22
for key, (path, bands) in SHEETS.items():
    im = Image.open(path).convert("RGB")
    W, H = im.size
    cw = W / 5
    for r, (y0, y1) in enumerate(bands):
        for c in range(5):
            box = (round(c * cw), max(0, y0 - PAD), round((c + 1) * cw), min(H, y1 + PAD))
            tile = im.crop(box)
            tile = tile.resize((tile.width * 2, tile.height * 2), Image.LANCZOS)
            tile.save(f"{OUT}/{key}_r{r+1}c{c+1}.png", optimize=True)
