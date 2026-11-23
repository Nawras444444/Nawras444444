"""Cut the 8 contact sheets into individual panels -> panels/s{sheet}_{row}{col}.jpg"""
from PIL import Image
import sys
U = sys.argv[1] if len(sys.argv) > 1 else '/root/.claude/uploads/6218ff56-a6bf-5a9c-beb4-6f24584a7659/'
SHEETS = {  # sheet id: (file, row bounds, col bounds)
  1: ('a74ada2f', [(0,312),(317,626),(630,932),(934,1312)], [(0,597),(601,1199)]),
  2: ('cf45ada8', [(0,330),(332,652),(654,1024)], [(0,766),(769,1536)]),
  3: ('d5bbb6d8', [(0,339),(340,682),(683,1024)], [(0,767),(768,1536)]),
  4: ('fd6697b5', [(0,335),(336,653),(655,1024)], [(0,767),(768,1536)]),
  5: ('7441689f', [(0,335),(336,655),(656,1024)], [(0,767),(768,1536)]),
  6: ('22dda460', [(0,335),(336,669),(671,1024)], [(0,767),(768,1536)]),
  7: ('63e64e15', [(0,333),(334,660),(662,1024)], [(0,767),(768,1536)]),
  8: ('f7ca699d', [(0,336),(338,672)], [(0,767),(768,1536)]),
}
M = 4
for s, (f, rows, cols) in SHEETS.items():
    im = Image.open(f'{U}{f}-image.png').convert('RGB')
    for r, (y0, y1) in enumerate(rows):
        for c, (x0, x1) in enumerate(cols):
            im.crop((x0+M, y0+M, x1-M, y1-M)).save(f'panels/s{s}_{r}{c}.jpg', quality=94)
    if s == 8:
        im.crop((0, 679, 1536, 1024)).save('panels/s8_banner.jpg', quality=94)
