"""Cut animatable elements + 'plates' out of the 7 posters, and icons out of the sheet.
Writes assets/*.png and assets/config.js (consumed by index.html)."""
import json
from PIL import Image, ImageFilter, ImageEnhance

W, H = 941, 1672
A = "assets/"

# scene start times (s) — synced to voiceover pauses (+0.4s lead-in)
LEAD = 0.4
STARTS = [0, 8.6, 16.5, 25.2, 34.8, 44.6, 54.4]
STARTS = [0] + [s + LEAD for s in STARTS[1:]]
END = 67.0

# element: (name, bbox x0,y0,x1,y1, anim, t-offset in scene)
# anims needing a blurred hole in the plate: fly*, drop, pop, wipe, flip, slam
EL = {
 1: [("title", (68, 72, 885, 330), "slam", 0.5),
     ("coords", (62, 338, 872, 412), "wipe", 1.6),
     ("map", (0, 418, 318, 795), "flyL", 2.4),
     ("compass", (712, 440, 888, 672), "spin", 0.0),
     ("sextant", (0, 1205, 385, 1672), "flyL", 3.4),
     ("paper", (398, 1125, 941, 1580), "flyR", 4.2),
     ("ship", (80, 540, 885, 1060), "bob", 0.0)],
 2: [("title", (100, 10, 938, 110), "slam", 0.3),
     ("photo", (0, 0, 112, 126), "drop", 0.9),
     ("specbar", (108, 112, 864, 168), "wipe", 1.4),
     ("stamp", (636, 170, 930, 335), "slam", 3.2),
     ("deck", (35, 990, 925, 1155), "flyR", 4.4),
     ("cross", (15, 1170, 512, 1495), "flyL", 5.0),
     ("specs", (515, 1175, 930, 1502), "flyR", 5.4),
     ("anchor", (755, 1495, 941, 1672), "swing", 0.0),
     ("ship", (20, 360, 920, 895), "bob", 0.0)],
 3: [("title", (20, 8, 645, 98), "wipe", 0.3),
     ("barrelpic", (645, 0, 890, 140), "drop", 0.8),
     ("info", (512, 170, 865, 395), "flyR", 1.4),
     ("count", (185, 770, 765, 940), "slam", 2.6),
     ("barrels", (235, 940, 705, 1035), "wipe", 3.2),
     ("banner", (105, 1045, 850, 1150), "slam", 4.6),
     ("diagram", (0, 1175, 335, 1440), "flyL", 5.6),
     ("stack", (345, 1175, 905, 1465), "flyR", 6.0),
     ("bar", (20, 1475, 920, 1645), "flyB", 6.6)],
 4: [("title", (35, 15, 505, 155), "wipe", 0.3),
     ("watch", (175, 165, 545, 595), "swingTop", 0.0),
     ("pipe", (405, 675, 715, 805), "flyR", 1.0),
     ("logbook", (25, 630, 505, 1075), "flyL", 1.8),
     ("coins", (455, 995, 885, 1255), "drop", 3.2),
     ("norob", (35, 1295, 905, 1435), "slam", 6.4),
     ("nostr", (35, 1455, 905, 1605), "slam", 7.4)],
 5: [("c1", (38, 172, 322, 622), "flip", 0.2), ("c2", (342, 172, 628, 622), "flip", 0.45),
     ("c3", (642, 172, 928, 622), "flip", 0.7),
     ("souls", (95, 675, 855, 822), "slam", 1.6),
     ("c4", (32, 922, 248, 1243), "flip", 2.4), ("c5", (255, 922, 468, 1243), "flip", 2.6),
     ("c6", (477, 922, 693, 1243), "flip", 2.8), ("c7", (697, 922, 913, 1243), "flip", 3.0),
     ("c8", (52, 1257, 323, 1603), "flip", 3.3), ("c9", (337, 1257, 608, 1603), "flip", 3.5),
     ("c10", (617, 1257, 903, 1603), "flip", 3.7),
     ("stamp", (170, 765, 865, 885), "slam", 5.3)],
 6: [("title", (20, 8, 625, 145), "wipe", 0.2),
     ("empty", (60, 220, 655, 335), "slam", 0.6),
     ("barrels", (40, 340, 670, 830), "flyB", 1.2),
     ("info", (675, 245, 925, 805), "flyR", 2.0),
     ("lifeboat", (35, 965, 905, 1115), "slam", 1.7),
     ("boat", (275, 1200, 805, 1340), "blink", 2.4),
     ("ropes", (390, 1105, 590, 1185), "pop", 2.8),
     ("bar", (15, 1495, 925, 1645), "flyB", 6.0)],
 7: [("title", (95, 15, 605, 85), "wipe", 0.2),
     ("photo", (35, 90, 525, 335), "drop", 0.5),
     ("arms", (530, 120, 905, 345), "flyR", 0.9),
     ("seal", (625, 350, 925, 645), "slam", 1.3),
     ("gib", (15, 415, 645, 688), "wipe", 0.6),
     ("year", (40, 688, 640, 800), "pop", 1.0),
     ("check", (20, 802, 375, 1060), "wipeDown", 2.4),
     ("ghost", (545, 700, 941, 1110), "ghost", 0.0),
     ("unsolved", (55, 1105, 895, 1435), "slam", 4.0),
     ("bar", (20, 1435, 920, 1645), "flyB", 5.4)],
}
HOLE = {"ghost", "slam", "wipe", "flyL", "flyR", "flyB", "drop", "pop", "flip", "wipeDown"}

cfg = {"starts": STARTS, "end": END, "scenes": []}
for s in range(1, 8):
    im = Image.open(f"src/scene{s}.png").convert("RGB").resize((W, H))
    plate = im.copy()
    blur = im.filter(ImageFilter.GaussianBlur(5))
    blur = ImageEnhance.Brightness(blur).enhance(0.28)
    els = []
    for name, box, anim, t in EL[s]:
        im.crop(box).save(f"{A}s{s}_{name}.png" if False else f"{A}s{s}_{name}.webp", quality=92)
        if anim == "ghost":
            fog = ImageEnhance.Brightness(im.filter(ImageFilter.GaussianBlur(30))).enhance(0.95)
            mask = Image.new("L", (box[2]-box[0], box[3]-box[1]), 0)
            from PIL import ImageDraw
            ImageDraw.Draw(mask).rectangle((40, 40, mask.width-40, mask.height-40), fill=255)
            plate.paste(fog.crop(box), box[:2], mask.filter(ImageFilter.GaussianBlur(25)))
        elif anim in HOLE:
            plate.paste(blur.crop(box), box[:2])
        els.append({"n": name, "b": box, "a": anim, "t": t})
    plate.save(f"{A}s{s}_plate.jpg", quality=92)
    cfg["scenes"].append({"els": els})

# ---------- icons ----------
sheet = Image.open("src/icons.png").convert("RGB")
rows = [(5, 270), (285, 535), (548, 782), (795, 1020), (1035, 1275), (1290, 1595)]
cols = [(10, 181), (200, 371), (390, 561), (580, 751), (770, 933)]
names = ["ship", "compass", "wheel", "anchor", "spyglass", "barrel", "barrelvapor", "lantern",
         "pipe", "coins", "rowboat", "rope", "davit", "lifebuoy", "bottle", "logbook", "scroll",
         "seal", "magnifier", "hourglass", "fogman", "crew", "footprints", "lock", "gauge",
         "wave", "ghostship", "gavel", "dossier", "question"]
bg = (247, 240, 228)
for i, nm in enumerate(names):
    r, c = divmod(i, 5)
    tile = sheet.crop((cols[c][0], rows[r][0], cols[c][1], rows[r][1])).convert("RGBA")
    px = tile.load()
    for y in range(tile.height):
        for x in range(tile.width):
            p = px[x, y]
            d = abs(p[0] - bg[0]) + abs(p[1] - bg[1]) + abs(p[2] - bg[2])
            if d < 34:
                px[x, y] = (p[0], p[1], p[2], 0)
            elif d < 70:
                px[x, y] = (p[0], p[1], p[2], int(255 * (d - 34) / 36))
    bb = tile.getbbox()
    if bb:
        tile = tile.crop(bb)
    tile.save(f"{A}i_{nm}.webp", quality=92)

open(f"{A}config.js", "w").write("window.CFG=" + json.dumps(cfg) + ";")
print("ok", len(names), "icons")
