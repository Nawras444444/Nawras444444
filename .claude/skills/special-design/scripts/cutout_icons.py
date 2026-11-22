#!/usr/bin/env python3
"""Cut 3D icons (or any sticker-like images) out of their flat backgrounds.

Usage
  python3 cutout_icons.py OUTDIR IMG [IMG ...] [--names name1,name2,...] [--size 520]
  python3 cutout_icons.py OUTDIR --docx icons.docx            # pulls word/media/imageN.png in order

Each result is trimmed to its content, centred on a transparent square, resized and saved as WebP
(about 30 KB each). Check the contact sheet it writes (OUTDIR/_sheet.png) before using the icons:
labels inside documents are sometimes out of step with the pictures, so name icons by what they show.
Requires: pip install "rembg[cpu]" pillow  (first run downloads the isnet model).
"""
import argparse, os, re, zipfile, io
from PIL import Image


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("outdir"); ap.add_argument("images", nargs="*")
    ap.add_argument("--docx"); ap.add_argument("--names"); ap.add_argument("--size", type=int, default=520)
    a = ap.parse_args()
    os.makedirs(a.outdir, exist_ok=True)
    from rembg import remove, new_session
    session = new_session("isnet-general-use")

    items = []
    if a.docx:
        z = zipfile.ZipFile(a.docx)
        media = sorted([n for n in z.namelist() if n.startswith("word/media/")], key=lambda n: int(re.findall(r"\d+", n)[-1]))
        items = [(os.path.splitext(os.path.basename(n))[0], Image.open(io.BytesIO(z.read(n)))) for n in media]
    else:
        items = [(os.path.splitext(os.path.basename(p))[0], Image.open(p)) for p in a.images]
    if a.names:
        names = a.names.split(",")
        items = [(names[i] if i < len(names) else n, im) for i, (n, im) in enumerate(items)]

    thumbs = []
    for name, im in items:
        out = remove(im.convert("RGB"), session=session, post_process_mask=True)
        out = out.crop(out.getbbox())
        m = max(out.size); sq = Image.new("RGBA", (m, m), (0, 0, 0, 0)); sq.paste(out, ((m - out.width) // 2, (m - out.height) // 2))
        sq = sq.resize((a.size, a.size), Image.LANCZOS)
        sq.save(os.path.join(a.outdir, name + ".webp"), "WEBP", quality=88, method=6)
        thumbs.append(sq); print(name, flush=True)

    T, cols = 140, 10
    rows = (len(thumbs) + cols - 1) // cols
    sheet = Image.new("RGBA", (cols * T, max(1, rows) * T), (16, 20, 40, 255))
    for k, im in enumerate(thumbs):
        t = im.copy(); t.thumbnail((T - 8, T - 8)); sheet.alpha_composite(t, ((k % cols) * T + 4, (k // cols) * T + 4))
    sheet.save(os.path.join(a.outdir, "_sheet.png"))


if __name__ == "__main__":
    main()
