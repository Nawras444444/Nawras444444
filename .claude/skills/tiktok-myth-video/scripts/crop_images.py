#!/usr/bin/env python3
"""Crop generated scene images tightly around their subject (drops the top 38% where the
generator leaves ghost text, whitens the off-white background).
Usage: crop_images.py images_dir   (reads s1..s8.png, writes c1..c8.png)"""
import sys
from PIL import Image
import numpy as np
d=sys.argv[1]
for i in range(1,9):
    a=np.array(Image.open(f'{d}/s{i}.png').convert('RGB')).astype(int)
    h=a.shape[0]; a[:int(h*0.38)]=255
    ys,xs=np.where(a.min(axis=2)<228); m=24
    x0,x1,y0,y1=max(0,xs.min()-m),min(a.shape[1],xs.max()+m),max(0,ys.min()-m),min(h,ys.max()+m)
    Image.fromarray(a.astype('uint8')).crop((x0,y0,x1,y1)).save(f'{d}/c{i}.png')
