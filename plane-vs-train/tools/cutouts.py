"""Cut out the uploaded stickers onto transparent PNGs (public/img)."""
import sys, os
from PIL import Image, ImageFilter
from rembg import remove, new_session
U = sys.argv[1]; OUT = "public/img"
M = {  # upload file -> name
 "34c9f8be-image.png":"plane", "66e7383d-image.png":"speedplane", "aaa06644-image.png":"train",
 "0f0ed4c8-image.png":"airport", "e3e60973-image.png":"security", "5c0657f4-image.png":"waiting",
 "d929eb50-image.png":"baggage", "fb2eb534-image.png":"station", "3f42f499-image.png":"okwoman",
 "3b63636e-image.png":"relax", "1bf631e7-image.png":"map", "5b9318d6-image.jpg":"coins",
 "7a203ca0-image.jpg":"runner", "ec5a9f16-image.jpg":"suitcases",
}
s = new_session("isnet-general-use")
for f, n in M.items():
    im = Image.open(os.path.join(U, f)).convert("RGB")
    cut = remove(im, session=s, post_process_mask=True)
    bb = cut.getchannel("A").point(lambda v: 255 if v > 20 else 0).getbbox()
    cut = cut.crop(bb)
    cut.thumbnail((1000, 1000))
    cut.save(f"{OUT}/{n}.png"); print(n, cut.size)
# alarm clock already has alpha
c = Image.open(os.path.join(U, "01db9777-image.png")).convert("RGBA")
c = c.crop(c.getchannel("A").point(lambda v: 255 if v > 20 else 0).getbbox()); c.thumbnail((800, 800)); c.save(f"{OUT}/clock.png")
# bell crop from the reminder image (orange bg kept, framed in a square)
r = Image.open(os.path.join(U, "0860fae0-image.jpg")).convert("RGB").crop((330, 110, 640, 380)); r.save(f"{OUT}/bell.jpg", quality=92)
