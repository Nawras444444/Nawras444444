"""norostyle prep for the Troy reel: per scene -> text-free plate (A), sprites cut from A,
clean background plate (B), background pieces cut from B, meta.json.
usage: python3 scripts/prep.py [s01 s02 ...]   (run from troy-video/)"""
import sys, json, os
import numpy as np, cv2
from PIL import Image
import onnxruntime as ort
sys.path.insert(0, os.path.dirname(__file__))
from scenes import S

H, W = 941, 1672
lama = ort.InferenceSession('models/lama.onnx', providers=['CPUExecutionProvider'])
_rb = None
def rembg_mask(rgb):
    global _rb
    from rembg import remove, new_session
    if _rb is None: _rb = new_session('birefnet-general-lite')
    m = remove(Image.fromarray(rgb), session=_rb, only_mask=True)
    return np.array(m).astype(np.uint8)

k = lambda n: cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (n, n))
u8 = lambda m: (m > 0).astype(np.uint8) * 255

def inpaint(img, mask):
    """LaMa per connected region, with context, at 512."""
    img = img.copy(); mask = u8(mask)
    n, lab, st, _ = cv2.connectedComponentsWithStats(cv2.dilate(mask, k(25)))
    for i in range(1, n):
        x, y, w, h = st[i, :4]
        reg = (lab == i) & (mask > 0)
        if not reg.any(): continue
        if reg.sum() < 2500:
            img = cv2.inpaint(img, u8(reg), 5, cv2.INPAINT_TELEA); continue
        s = int(max(w, h) * 1.6 + 96); cx, cy = x + w // 2, y + h // 2
        x0, y0 = max(0, cx - s // 2), max(0, cy - s // 2); x1, y1 = min(W, x0 + s), min(H, y0 + s)
        x0, y0 = max(0, x1 - s), max(0, y1 - s)
        crop = img[y0:y1, x0:x1]; mc = u8(reg[y0:y1, x0:x1])
        ch, cw = crop.shape[:2]
        a = cv2.resize(crop, (512, 512), interpolation=cv2.INTER_AREA).astype(np.float32) / 255
        mm = (cv2.resize(mc, (512, 512), interpolation=cv2.INTER_NEAREST) > 0).astype(np.float32)
        mm = cv2.dilate(mm, k(5))
        out = lama.run(None, {'image': a.transpose(2, 0, 1)[None], 'mask': mm[None, None]})[0][0].transpose(1, 2, 0)
        if out.max() <= 1.5: out = out * 255
        out = cv2.resize(np.clip(out, 0, 255).astype(np.uint8), (cw, ch), interpolation=cv2.INTER_CUBIC)
        soft = cv2.GaussianBlur(mc.astype(np.float32) / 255, (0, 0), 1.2)[..., None]
        soft = np.maximum(soft, (mc[..., None] > 0))
        img[y0:y1, x0:x1] = (crop * (1 - soft) + out * soft).astype(np.uint8)
    return img

def boxmask(b):
    m = np.zeros((H, W), np.uint8); m[b[1]:b[3], b[0]:b[2]] = 255; return m

def key(img, b, kind, excl=(), fill=False):
    I = img.astype(np.int32); R, G, B = I[..., 0], I[..., 1], I[..., 2]
    if kind == 'red': m = (R > 120) & (G < 95) & (B < 95) & (R - G > 55)
    elif kind == 'redline': m = (R > 165) & (G < 60) & (B < 60)
    else: m = (I.min(axis=2) > 200) & (I.max(axis=2) - I.min(axis=2) < 45)
    m = u8(m) & boxmask(b)
    for e in excl: m[e[1]:e[3], e[0]:e[2]] = 0
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, k(3))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    keep = np.zeros_like(m)
    for i in range(1, n):
        if st[i, 4] >= 18: keep[lab == i] = 255
    if fill:
        keep = cv2.morphologyEx(keep, cv2.MORPH_CLOSE, k(7)); cnt, _ = cv2.findContours(keep, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        keep = np.zeros_like(keep); cv2.drawContours(keep, cnt, -1, 255, -1)
    return cv2.dilate(keep, k(3))

def fillred(img, b):
    m = key(img, b, 'red'); m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, k(15))
    cnt, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    out = np.zeros_like(m)
    if cnt: cv2.drawContours(out, [max(cnt, key=cv2.contourArea)], -1, 255, -1)
    return cv2.dilate(out, k(5))

def paperkey(img, b):
    c = img[b[1]:b[3], b[0]:b[2]].astype(np.float32)
    border = np.concatenate([c[:4].reshape(-1, 3), c[-4:].reshape(-1, 3), c[:, :4].reshape(-1, 3), c[:, -4:].reshape(-1, 3)])
    ref = np.median(border, 0); d = np.sqrt(((c - ref) ** 2).sum(2))
    m = u8(d > 62); m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, k(5))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m); keep = np.zeros_like(m)
    for i in range(1, n):
        if st[i, 4] >= 25: keep[lab == i] = 255
    full = np.zeros((H, W), np.uint8); full[b[1]:b[3], b[0]:b[2]] = cv2.dilate(keep, k(3)); return full

def textmask(img, b, rm):
    c = img[b[1]:b[3], b[0]:b[2]].astype(np.int32); lum = c.mean(axis=2); sat = c.max(axis=2) - c.min(axis=2)
    m = (lum < 105) if rm == 'dark' else ((lum > 175) & (sat < 90))
    full = np.zeros((H, W), np.uint8); full[b[1]:b[3], b[0]:b[2]] = u8(m)
    return cv2.dilate(full, k(7))

def octmask(b, c=16):
    x0, y0, x1, y1 = b
    pts = np.array([[x0 + c, y0], [x1 - c, y0], [x1, y0 + c], [x1, y1 - c], [x1 - c, y1], [x0 + c, y1], [x0, y1 - c], [x0, y0 + c]], np.int32)
    m = np.zeros((H, W), np.uint8); cv2.fillPoly(m, [pts], 255); return m

def grab(img, b):
    m = np.zeros((H, W), np.uint8); bg = np.zeros((1, 65), np.float64); fg = np.zeros((1, 65), np.float64)
    x0, y0, x1, y1 = b
    cv2.grabCut(cv2.cvtColor(img, cv2.COLOR_RGB2BGR), m, (x0, y0, x1 - x0, y1 - y0), bg, fg, 6, cv2.GC_INIT_WITH_RECT)
    f = u8((m == 1) | (m == 3)); f = cv2.morphologyEx(f, cv2.MORPH_CLOSE, k(9))
    cnt, _ = cv2.findContours(f, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    out = np.zeros_like(f)
    if cnt: cv2.drawContours(out, [max(cnt, key=cv2.contourArea)], -1, 255, -1)
    # sanity: if grabcut grabbed too little, fall back to the octagon
    if out.sum() / 255 < 0.6 * (x1 - x0) * (y1 - y0): out = octmask(b)
    return out

def save(path, rgb, a, meta, name, pad=2):
    a = a.astype(np.float32); a = a / 255 if a.max() > 1.5 else a
    ys, xs = np.where(a > 0.02)
    if len(xs) == 0: print('  !! empty', name); return
    x0, y0 = max(0, xs.min() - pad), max(0, ys.min() - pad); x1, y1 = min(W, xs.max() + pad + 1), min(H, ys.max() + pad + 1)
    out = np.dstack([rgb, a * 255])[y0:y1, x0:x1].astype(np.uint8)
    Image.fromarray(out, 'RGBA').save(f'{path}/{name}.png', optimize=False, compress_level=3)
    meta[name] = [int(x0), int(y0), int(x1 - x0), int(y1 - y0)]

def run(sc):
    sid = sc['src']; path = f'L/{sid}'; os.makedirs(path, exist_ok=True)
    img = cv2.cvtColor(cv2.imread(f'src/{sid}.png'), cv2.COLOR_BGR2RGB)
    assert img.shape[:2] == (H, W), img.shape
    els = sc['els']; meta = {}
    panel = next(e['box'] for e in els if e['n'] == 'panel')
    inside = lambda b, p: b[0] >= p[0] - 20 and b[2] <= p[2] + 20 and b[1] >= p[1] - 30 and b[3] <= p[3] + 30
    # A: remove text
    tm = np.zeros((H, W), np.uint8)
    for e in els:
        if e['k'] == 'text': tm |= textmask(img, e['box'], e['rm'])
    A = inpaint(img, tm)
    # sprites from A
    fg = np.zeros((H, W), np.uint8)
    for e in els:
        b = e['box']; n = e['n']
        if e['k'] in ('char', 'shape'):
            if 'circle' in e:
                cx, cy, r = e['circle']; a = np.zeros((H, W), np.uint8); cv2.circle(a, (cx, cy), r, 255, -1, cv2.LINE_AA)
            else:
                a = np.zeros((H, W), np.uint8); a[b[1]:b[3], b[0]:b[2]] = rembg_mask(A[b[1]:b[3], b[0]:b[2]])
                a = np.where(a > 12, a, 0).astype(np.uint8)
                if inside(b, panel): a = np.maximum(a, cv2.GaussianBlur(paperkey(A, b), (0, 0), .7))
        elif e['k'] == 'line':
            a = cv2.GaussianBlur(key(A, b, e['key'], e.get('excl', ()), e.get('fill', False)), (0, 0), .7)
        elif e['k'] == 'piece' and e['mask'] == 'red':
            a = cv2.GaussianBlur(fillred(A, b), (0, 0), .8)
        else: continue
        save(path, A, a, meta, n); fg |= u8(a > 40)
    B = inpaint(A, cv2.dilate(fg, k(9)))
    # pieces from B
    pieces = []
    for e in els:
        if e['k'] == 'piece' and e['mask'] != 'red':
            m = grab(B, e['box']) if e['mask'] == 'grab' else octmask(e['box'])
            save(path, B, cv2.GaussianBlur(m, (0, 0), .8), meta, e['n']); pieces.append(e['n'])
    Image.fromarray(B).save(f'{path}/base.jpg', quality=93); meta['base'] = [0, 0, W, H]
    Image.fromarray(A).save(f'{path}/plateA.jpg', quality=90)
    json.dump(meta, open(f'{path}/meta.json', 'w'))
    # check sheet: original | A | B
    sheet = np.concatenate([cv2.resize(x, (836, 470)) for x in (img, A, B)], axis=1)
    over = img.copy()
    for e in els:
        b = e['box']; col = {'piece': (0, 255, 0), 'char': (255, 0, 255), 'shape': (0, 200, 255), 'line': (255, 255, 0), 'text': (255, 60, 0)}[e['k']]
        cv2.rectangle(over, (b[0], b[1]), (b[2], b[3]), col, 2)
    cv2.imwrite(f'out/chk_{sid}.jpg', cv2.cvtColor(np.concatenate([sheet, np.concatenate([cv2.resize(over, (836, 470)), np.zeros((470, 1672, 3), np.uint8)], 1)], 0), cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 82])
    print(sid, len(meta), 'layers')

want = sys.argv[1:]
for sc in S:
    if not want or sc['src'] in want: run(sc)
