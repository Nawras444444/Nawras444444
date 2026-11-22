"""Cut the 3D icons out of their backgrounds -> ./assets/icons/<name>.png"""
import os, sys
import numpy as np
from PIL import Image
from rembg import remove, new_session
U = sys.argv[1]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "icons")
os.makedirs(OUT, exist_ok=True)
SRC = {
    "folder": "67305dfe-image.png", "shield_ok": "5f88251d-image.png", "eraser": "61eb7ff4-image.png",
    "shield_crack": "10ad0f5d-image.jpg", "camera_orange": "b9d3b103-image.jpg", "camera_blue": "38cf30f4-image.png",
    "pin": "dc9b3954-image.png", "globe": "36d599db-image.jpg", "bars": "5e7438b6-image.jpg",
    "warning": "8371ade6-image.jpg", "clock": "03dab6c0-image.jpg", "chart_down": "bf4509de-image.jpg",
    "bar_chart": "b3da1aeb-image.jpg", "chart_up": "e8ee326f-image.jpg", "bank": "510518fd-image.jpg",
    "money_bag": "5b646894-image.jpg", "board": "388bf75c-image.jpg", "gold": "391786be-image.jpg",
}
sess = new_session("u2net")
for name, f in SRC.items():
    im = Image.open(os.path.join(U, f))
    if im.mode in ("RGBA", "LA", "P") and np.array(im.convert("RGBA"))[..., 3].min() < 20:
        im = im.convert("RGBA")
    else:
        im = remove(im.convert("RGB"), session=sess, post_process_mask=True)
    im = im.crop(im.getbbox())
    im.thumbnail((600, 600), Image.LANCZOS)
    im.save(f"{OUT}/{name}.png"); print(name, im.size, flush=True)
