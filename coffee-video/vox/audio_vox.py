"""Vox-style SFX (whoosh on each scene change, pop when the badge lands) over ../final_audio.wav."""
import numpy as np, wave
SR=48000
with wave.open('../final_audio.wav') as w:
    base=np.frombuffer(w.readframes(w.getnframes()),'<i2').reshape(-1,2).astype(float)/32767
out=base.copy(); rng=np.random.default_rng(7)
def add(sig,t,g):
    i=int(t*SR); n=min(len(sig),len(out)-i); out[i:i+n]+=g*sig[:n,None]
def whoosh(d=.7):
    n=int(d*SR); x=rng.standard_normal(n); tt=np.arange(n)/n
    env=np.sin(np.pi*tt)**2; y=np.zeros(n); a=0
    for i in range(n):                                   # sweeping one-pole lowpass
        k=.02+.25*tt[i]; a+=k*(x[i]-a); y[i]=a
    return y*env/np.abs(y).max()
def pop(f=520):
    n=int(.18*SR); tt=np.arange(n)/SR
    return np.sin(2*np.pi*(f+900*np.exp(-tt*40))*tt)*np.exp(-tt*22)
STARTS=[0,4.6,10.75,14.7,20.1,25.1,30.2,37.0]
W=whoosh()
for s in STARTS[1:]: add(W,s-.3,.10)
for s in STARTS[:7]: add(pop(),s+1.25,.07)            # badges pop at +1.0s (+.25 overshoot)
add(pop(660),37.6,.08); add(pop(880),37.75,.06)          # end title pop
out=np.clip(out,-.98,.98)
with wave.open('final_audio_vox.wav','wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out*32767).astype('<i2').tobytes())
