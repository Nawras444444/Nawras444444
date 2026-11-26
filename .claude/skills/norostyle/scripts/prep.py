import numpy as np, cv2, json
from PIL import Image
img=cv2.cvtColor(cv2.imread('src.png'),cv2.COLOR_BGR2RGB);H,W=img.shape[:2]
I=img.astype(np.int32);R,G,B=I[...,0],I[...,1],I[...,2]
k=lambda n:np.ones((n,n),np.uint8)
u8=lambda m:(m>0).astype(np.uint8)*255
yellow=u8((R>185)&(G>130)&(B<110)&(R-B>100))
teal=u8((B>R+20)&(G>R+10)&(np.maximum(G,B)<200))
red=u8((R>130)&(G<95)&(B<95)&(R-G>70))
cream=u8((I.min(axis=2)>165)&(R-B<75))
def close(m,n=9): return cv2.morphologyEx(m,cv2.MORPH_CLOSE,k(n))
yC,tC,rC=close(yellow),close(teal,11),close(red)
meta={}
def save(name,rgb,a,pad=3):
    a=a.astype(np.float32);a=a/255 if a.max()>1.5 else a
    ys,xs=np.where(a>0.02);x0,y0=max(0,xs.min()-pad),max(0,ys.min()-pad);x1,y1=min(W,xs.max()+pad+1),min(H,ys.max()+pad+1)
    out=np.dstack([np.clip(rgb,0,255),a*255])[y0:y1,x0:x1].astype(np.uint8)
    Image.fromarray(out,'RGBA').save(f'L/{name}.png');meta[name]=[int(x0),int(y0),int(x1-x0),int(y1-y0)]
# ---- man
man=np.array(Image.open('man_rm.png').convert('L'))
bot=np.zeros((H,W),np.uint8);bot[1175:]=255
nY,lY=cv2.connectedComponents(yC);bgYBL=u8(lY==lY[1050,60])
manExtra=cv2.bitwise_and(bot,cv2.bitwise_not(cv2.dilate(bgYBL,k(3))))
man=np.maximum(man,cv2.GaussianBlur(manExtra,(0,0),1.2))
# remove red-halftone patch next to face
patch=np.zeros((H,W),np.uint8);patch[520:830,520:690]=255
redzone=cv2.bitwise_and(close(red,15),patch)
man[redzone>0]=0
z=np.zeros((H,W),np.uint8);z[420:530,550:690]=255
man[(cv2.bitwise_and(cv2.bitwise_or(close(red,15),close(teal,15)),z))>0]=0
man=cv2.morphologyEx(man,cv2.MORPH_OPEN,k(5))
manB=(man>128).astype(np.uint8)*255
# keep largest component(s)
n,lab,st,_=cv2.connectedComponentsWithStats(manB)
keep=np.zeros_like(manB)
for i in range(1,n):
    if st[i,4]>4000: keep[lab==i]=255
man=np.where(keep>0,man,0).astype(np.uint8)
save('man',img,man)
# ---- note paper (cream torn sheet)
box=np.zeros((H,W),np.uint8);box[200:815,0:740]=255
nc=cv2.bitwise_and(cv2.bitwise_or(cv2.bitwise_or(cream,u8((R>150)&(G<110)&(B<110))),u8(I.max(axis=2)<70)),box);nc=cv2.bitwise_and(nc,cv2.bitwise_not(tC));nc=close(nc,35)
n,lab,st,_=cv2.connectedComponentsWithStats(nc);i=1+np.argmax(st[1:,4]);note=u8(lab==i)
cnt,_=cv2.findContours(note,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE);note=np.zeros_like(note);cv2.drawContours(note,cnt,-1,255,-1)
note=cv2.erode(note,k(3));note=cv2.bitwise_and(note,cv2.bitwise_not(cv2.dilate(u8(man>60),k(3))))
inner=cv2.erode(note,k(15))
lum=img.mean(axis=2)
txtA=np.clip((175-lum)/120,0,1)*(inner>0)
redU=cv2.bitwise_and(u8((R>150)&(G<110)&(B<110)),cv2.erode(note,k(3)))
redU=cv2.dilate(redU,k(3))
txtA[redU>0]=0
holes=cv2.dilate(u8((txtA>0.05)|(redU>0)),k(5))
noteImg=cv2.cvtColor(cv2.inpaint(cv2.cvtColor(img,cv2.COLOR_RGB2BGR),holes,4,cv2.INPAINT_TELEA),cv2.COLOR_BGR2RGB)
save('note',noteImg,cv2.GaussianBlur(note,(0,0),.8))
ua=cv2.GaussianBlur(redU,(0,0),.8)
save('underline',img,ua)
# text lines -> rows
lines=[(262,352),(384,500),(528,706)]
import sys
SPLITS=json.loads(sys.argv[1]) if len(sys.argv)>1 else [[],[],[]]
print('lines',lines)
black=np.zeros_like(img,dtype=np.float32)+18
words={}
tb=cv2.dilate(u8(txtA>0.25),k(3));ncc,lcc,stc,cc=cv2.connectedComponentsWithStats(tb)
centers=np.array([(a+b)/2 for a,b in lines]);lineOf=np.zeros(ncc,int)
for i in range(1,ncc):
    yv=cc[i][1];lineOf[i]=0 if yv<380 else (1 if yv<522 else 2)
    if stc[i,4]<40: lineOf[i]=-1
for li,(y0,y1) in enumerate(lines):
    sel=np.isin(lcc,[i for i in range(1,ncc) if lineOf[i]==li]);la=txtA*sel
    col=(la>0.4).sum(axis=0)>0;xs=np.where(col)[0]
    print('gaps',li,[(int(xs[i]),int(xs[i+1]-xs[i])) for i in range(len(xs)-1) if xs[i+1]-xs[i]>6])
    sp=SPLITS[li];bs=[0]+sp+[W];segs=[(bs[i],bs[i+1]) for i in range(len(bs)-1)]
    print('line',li,segs)
    for wi,(a,b) in enumerate(segs):
        mm=np.zeros_like(la);mm[:,max(0,a-4):b+5]=1;save(f't{li}_{wi}',black,la*mm)
    words[li]=len(segs)
# ---- arrow
ab=np.zeros((H,W),np.uint8);ab[85:215,405:640]=255
arrow=cv2.bitwise_and(u8(I.max(axis=2)<85),ab);arrow=cv2.morphologyEx(arrow,cv2.MORPH_CLOSE,k(3))
n,lab,st,_=cv2.connectedComponentsWithStats(arrow);i=1+np.argmax(st[1:,4]);arrow=u8(lab==i);arrow=cv2.dilate(arrow,k(3))
save('arrow',img,cv2.GaussianBlur(arrow,(0,0),.7))
# ---- bulb + rays
bb=np.zeros((H,W),np.uint8);bb[60:350,695:915]=255
notbg=cv2.bitwise_and(bb,cv2.bitwise_not(cv2.bitwise_or(tC,rC)))
notbg=cv2.morphologyEx(notbg,cv2.MORPH_OPEN,k(3))
n,lab,st,_=cv2.connectedComponentsWithStats(notbg)
ci=lab[180,805];bulb=u8(lab==ci);cnt,_=cv2.findContours(bulb,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE);bulb=np.zeros_like(bulb);cv2.drawContours(bulb,cnt,-1,255,-1)
save('bulb',img,cv2.GaussianBlur(bulb,(0,0),.8))
rb=np.zeros((H,W),np.uint8);rb[0:330,615:1010]=255
rays=cv2.bitwise_and(cv2.bitwise_and(yellow,rb),cv2.bitwise_not(cv2.dilate(bulb,k(9))))
rays=cv2.morphologyEx(rays,cv2.MORPH_CLOSE,k(3))
n,lab,st,cen=cv2.connectedComponentsWithStats(rays);ri=0;rayinfo=[]
for i in range(1,n):
    if st[i,4]<250: continue
    m=cv2.dilate(u8(lab==i),k(3));save(f'ray{ri}',img,cv2.GaussianBlur(m,(0,0),.7));rayinfo.append([float(cen[i][0]),float(cen[i][1])]);ri+=1
print('rays',ri)
# ---- background pieces
fg=np.maximum.reduce([u8(man>40),note,cv2.dilate(ua,k(5)),cv2.dilate(arrow,k(11)),cv2.dilate(bulb,k(5)),cv2.dilate(rays,k(9))])
lab=np.zeros((H,W),np.int32)  # 1 yellow 2 teal 3 red
vis=(fg==0)
lab[(yC>0)&vis]=1;lab[(tC>0)&vis&(lab==0)]=2;lab[(rC>0)&vis&(lab==0)]=3
for c in (1,2,3):
    nn,ll,st_,_=cv2.connectedComponentsWithStats(u8(lab==c))
    for i in range(1,nn):
        if st_[i,4]<6000: lab[ll==i]=0
# assign every pixel to nearest labelled colour
d=[];
for c in (1,2,3):
    m=u8(lab==c);d.append(cv2.distanceTransform(cv2.bitwise_not(m),cv2.DIST_L2,5))
near=np.argmin(np.stack(d),0)+1
# texture fill hidden parts
bg=img.copy();hid=(lab==0)
# torn white edges stay as is when visible (they belong to nearest piece); only fg-hidden pixels need texture
need=(fg>0)
for c in (1,2,3):
    m=(lab==c).astype(np.uint8)
    # find a clean tile
    T=96;ii=cv2.integral(m);best=None
    for y in range(0,H-T,16):
        for x in range(0,W-T,16):
            if ii[y+T,x+T]-ii[y,x+T]-ii[y+T,x]+ii[y,x]==T*T: best=(x,y);break
        if best: break
    print('tile',c,best)
    tx,ty=best;tile=img[ty:ty+T,tx:tx+T]
    yy,xx=np.where(need&(near==c));bg[yy,xx]=tile[(yy-ty)%T,(xx-tx)%T]
# pieces: split teal at y=600 (top band vs low-left)
pieces={}
P=np.zeros((H,W),np.int32)
P[near==1]=1;P[near==3]=3;P[(near==2)]=2
n1,l1=cv2.connectedComponents(u8(P==1))
names=[]
def piece(name,m):
    m=cv2.GaussianBlur(u8(m),(0,0),.8);save(name,bg,m);names.append(name)
yl=[(l1==i) for i in range(1,n1)];yl.sort(key=lambda m:np.where(m)[0].mean())
for j,m in enumerate(yl):
    if m.sum()>3000: piece(f'bg_y{j}',m)
teal2=(P==2);yy=np.arange(H)[:,None]
piece('bg_t0',teal2&(yy<560));piece('bg_t1',teal2&(yy>=560))
n3,l3=cv2.connectedComponents(u8(P==3))
for j in range(1,n3):
    m=(l3==j)
    if m.sum()>3000: piece(f'bg_r{j-1}',m)
json.dump({'meta':meta,'bg':names,'words':words,'rays':rayinfo},open('meta.json','w'))
print(names)
# verify
comp=np.zeros((H,W,3),np.float32)
order=names+['man','note','underline']+[f't{li}_{wi}' for li in words for wi in range(words[li])]+['arrow','bulb']+[f'ray{i}' for i in range(ri)]
for nme in order:
    im=np.array(Image.open(f'L/{nme}.png')).astype(np.float32);x,y,w,h=meta[nme];a=im[...,3:4]/255
    comp[y:y+h,x:x+w]=comp[y:y+h,x:x+w]*(1-a)+im[...,:3]*a
dd=np.abs(comp-img).max(axis=2);print('diff',dd.mean())
bgc=np.zeros((H,W,3),np.float32)
for nme in names:
    im=np.array(Image.open(f'L/{nme}.png')).astype(np.float32);x,y,w,h=meta[nme];a=im[...,3:4]/255
    bgc[y:y+h,x:x+w]=bgc[y:y+h,x:x+w]*(1-a)+im[...,:3]*a
c=Image.new('RGB',(1086,724));c.paste(Image.fromarray(comp.astype(np.uint8)).resize((543,724)),(0,0));c.paste(Image.fromarray(bgc.astype(np.uint8)).resize((543,724)),(543,0));c.save('chk.png')
