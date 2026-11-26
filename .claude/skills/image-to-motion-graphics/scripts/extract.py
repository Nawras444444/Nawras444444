import numpy as np, cv2, json
from PIL import Image
src=cv2.cvtColor(cv2.imread('src.png'),cv2.COLOR_BGR2RGB)
H,W=src.shape[:2]
def blank(): return np.zeros((H,W),np.uint8)
def rect(x0,y0,x1,y1,r=0):
    m=blank()
    if r: cv2.rectangle(m,(x0+r,y0),(x1-r,y1),255,-1);cv2.rectangle(m,(x0,y0+r),(x1,y1-r),255,-1)
    else: cv2.rectangle(m,(x0,y0),(x1,y1),255,-1)
    if r:
        for cx,cy in((x0+r,y0+r),(x1-r,y0+r),(x0+r,y1-r),(x1-r,y1-r)): cv2.circle(m,(cx,cy),r,255,-1)
    return m
def circ(cx,cy,r):
    m=blank();cv2.circle(m,(cx,cy),r,255,-1);return m
def poly(pts):
    m=blank();cv2.fillPoly(m,[np.array(pts,np.int32)],255);return m
def band(p,q,w):
    m=blank();cv2.line(m,p,q,255,w*2);return m
def feather(m,s=1.2): return cv2.GaussianBlur(m,(0,0),s)
layers={}  # name -> (mask uint8 (alpha), rgb)
def sub(a,b): return cv2.bitwise_and(a,cv2.bitwise_not(b))
# rings & icons
ringL=sub(circ(152,235,130),circ(152,235,86)); icL=circ(152,235,86)
ringR=sub(circ(793,235,130),circ(793,235,86)); icR=circ(793,235,86)
burstL=rect(300,262,402,366); burstR=rect(586,348,692,447)
# panels
shoulder=poly([(112,795),(200,795),(200,860),(112,860)])
icons={'dumbbell':rect(14,428,155,514),'laptop':rect(14,562,155,662),'target':rect(14,698,155,815),
       'book':rect(790,430,930,520),'bulb':rect(790,550,930,670),'calendar':rect(790,698,930,815)}
panL=sub(rect(4,388,164,850,60),shoulder); panR=rect(780,388,936,850,60)
iconm={k:cv2.bitwise_and(v,pl) for k,v,pl in [(k,icons[k],panL if k in('dumbbell','laptop','target') else panR) for k in icons]}
panL_only=panL.copy(); panR_only=panR.copy()
for k in('dumbbell','laptop','target'): panL_only=sub(panL_only,icons[k])
for k in('book','bulb','calendar'): panR_only=sub(panR_only,icons[k])
connL=band((163,636),(228,678),11); connR=band((718,704),(782,648),11)
# bars
bars={'bar1':rect(240,1512,366,1612,10),'bar2':rect(364,1477,484,1612,10),'bar3':rect(494,1429,612,1612,10),'bar4':rect(616,1368,732,1612,10)}
badge=circ(705,1552,72)
yellow=((src[...,0]>195)&(src[...,1]>130)&(src[...,2]<120)&(src[...,0]-src[...,2]>110)).astype(np.uint8)*255
roi=rect(262,1230,724,1500)
for b in('bar3','bar4'): roi=sub(roi,bars[b])
arrow=cv2.bitwise_and(yellow,roi)
arrow=cv2.morphologyEx(arrow,cv2.MORPH_CLOSE,np.ones((5,5),np.uint8))
n,lab,st,_=cv2.connectedComponentsWithStats(arrow)
k=1+np.argmax(st[1:,4]);arrow=((lab==k)*255).astype(np.uint8)
arrow=cv2.dilate(arrow,np.ones((3,3),np.uint8))
holes=cv2.dilate(arrow,np.ones((9,9),np.uint8))
for b in bars.values(): holes=cv2.bitwise_or(holes,cv2.dilate(b,np.ones((7,7),np.uint8)))
holes=cv2.bitwise_or(holes,cv2.dilate(badge,np.ones((7,7),np.uint8)))
holes=cv2.dilate(holes,np.ones((3,3),np.uint8))
filled=cv2.inpaint(cv2.cvtColor(src,cv2.COLOR_RGB2BGR),holes,6,cv2.INPAINT_TELEA); filled=cv2.cvtColor(filled,cv2.COLOR_BGR2RGB)
# characters
yy=[365,600,800,1000,1200,1400,1672]; xx=[462,470,497,490,470,470,470]
pm=np.array([(int(np.interp(y,yy,xx)),y) for y in range(365,H)])
manPoly=blank(); woPoly=blank()
manpts=[(0,0),(W,0)]
man=np.zeros((H,W),np.uint8); man[:]=0
for y in range(H):
    x=int(np.interp(y,yy,xx)) if y>=365 else 462
    man[y,:x]=255
wom=cv2.bitwise_not(man)
others=ringL|ringR|burstL|burstR|panL|panR|connL|connR
others=cv2.bitwise_or(others,cv2.bitwise_or(ringL,ringR))
for m in(icL,icR): others=cv2.bitwise_or(others,m)
# note: shoulder zone remains character
chars_base=filled
manA=sub(man,others); womA=sub(wom,others)
manA=sub(manA,cv2.bitwise_or(connL,connR)); womA=sub(womA,cv2.bitwise_or(connL,connR))
def save(name,rgb,alpha,bbox=None,soft=True):
    a=feather(alpha,0.8) if soft else alpha
    ys,xs=np.where(alpha>0)
    x0,x1,y0,y1=xs.min()-3,xs.max()+4,ys.min()-3,ys.max()+4
    x0=max(0,x0);y0=max(0,y0);x1=min(W,x1);y1=min(H,y1)
    out=np.dstack([rgb,a])[y0:y1,x0:x1]
    Image.fromarray(out,'RGBA').save(f'L/{name}.png')
    meta[name]=[int(x0),int(y0),int(x1-x0),int(y1-y0)]
meta={}
ih=blank()
for k in icons: ih=cv2.bitwise_or(ih,icons[k])
ih=cv2.dilate(ih,np.ones((3,3),np.uint8))
pl=cv2.cvtColor(cv2.inpaint(cv2.cvtColor(src,cv2.COLOR_RGB2BGR),ih,3,cv2.INPAINT_TELEA),cv2.COLOR_BGR2RGB)
save('ringL',src,ringL);save('ringR',src,ringR);save('icL',src,icL);save('icR',src,icR)
save('burstL',src,burstL,soft=False);save('burstR',src,burstR,soft=False)
save('panL',pl,panL_only);save('panR',pl,panR_only)
for k in icons: save(k,src,iconm[k])
save('connL',src,connL);save('connR',src,connR)
save('man',chars_base,manA,soft=False);save('woman',chars_base,womA,soft=False)
for k,b in bars.items(): save(k,src,b)
save('arrow',src,arrow);save('badge',src,badge)
json.dump(meta,open('meta.json','w'))
# rest composite for verification
comp=np.full((H,W,3),255,np.float32)
order=['ringL','icL','ringR','icR','panL','panR','dumbbell','laptop','target','book','bulb','calendar','man','woman','connL','connR','burstL','burstR','bar1','bar2','bar3','bar4','arrow','badge']
for n in order:
    im=np.array(Image.open(f'L/{n}.png')).astype(np.float32);x,y,w,h=meta[n]
    a=im[...,3:4]/255;comp[y:y+h,x:x+w]=comp[y:y+h,x:x+w]*(1-a)+im[...,:3]*a
d=np.abs(comp-src.astype(np.float32)).max(axis=2)
Image.fromarray(comp.astype(np.uint8)).save('rest.png')
Image.fromarray(np.clip(d*4,0,255).astype(np.uint8)).save('diff.png')
print('mean diff',d.mean(),'pix>40',(d>40).sum())
# holes preview (no bars)
comp2=np.full((H,W,3),255,np.float32)
for n in ['man','woman']:
    im=np.array(Image.open(f'L/{n}.png')).astype(np.float32);x,y,w,h=meta[n]
    a=im[...,3:4]/255;comp2[y:y+h,x:x+w]=comp2[y:y+h,x:x+w]*(1-a)+im[...,:3]*a
Image.fromarray(comp2.astype(np.uint8)).save('chars_only.png')
