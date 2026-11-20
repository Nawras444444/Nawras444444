import numpy as np, wave, subprocess
sr=44100; D=34.0; N=int(sr*D); rng=np.random.default_rng(7)
# voice -> 44.1k mono
subprocess.run(["ffmpeg","-y","-loglevel","error","-i","narration.wav","-ar",str(sr),"-ac","1","/tmp/voice44.wav"],check=True)
w=wave.open("/tmp/voice44.wav");v=np.frombuffer(w.readframes(w.getnframes()),np.int16).astype(np.float64)/32768
voice=np.zeros(N);voice[:min(N,len(v))]=v[:N]
def env(n,a,r):
    t=np.arange(n)/sr;return np.minimum(t/a,1)*np.exp(-t/r)
def put(buf,s,x,g=1.0):
    i=int(s*sr)
    if i<0 or i>=N:return
    x=x[:N-i];buf[i:i+len(x)]+=x*g
def ep(f,d):   # warm electric-piano-ish
    n=int(d*sr);t=np.arange(n)/sr
    x=np.sin(2*np.pi*f*t)+.35*np.sin(2*np.pi*2*f*t)*np.exp(-t*6)+.12*np.sin(2*np.pi*3*f*t)*np.exp(-t*9)
    return x*env(n,.004,.55)
def pad(f,d):
    n=int(d*sr);t=np.arange(n)/sr
    x=sum(np.sin(2*np.pi*f*k*t+i)*(1/k) for i,k in enumerate((1,2,3)))+np.sin(2*np.pi*f*1.004*t)
    a=np.minimum(t/.6,1)*np.minimum((d-t)/.6,1)
    return x*a
def bass(f,d):
    n=int(d*sr);t=np.arange(n)/sr;return np.sin(2*np.pi*f*t)*env(n,.01,.5)
def kick():
    n=int(.3*sr);t=np.arange(n)/sr;f=48+90*np.exp(-t*30);return np.sin(2*np.pi*np.cumsum(f)/sr)*np.exp(-t*10)
def hat():
    n=int(.05*sr);x=np.diff(rng.standard_normal(n),prepend=0);return x*np.exp(-np.arange(n)/sr*90)
def n2f(m):return 440*2**((m-69)/12)
bpm=92;beat=60/bpm
chords=[(53,[60,64,67,72]),(57,[60,64,67,71]),(50,[57,60,65,69]),(55,[59,62,65,69])] # F-ish groove: Cmaj / Am / Dm / G
chords=[(48,[60,64,67,71]),(45,[60,64,67,69]),(53,[60,65,69,72]),(55,[59,62,67,71])]
mus=np.zeros(N);bar=beat*4
for b in range(int(D/bar)+1):
    root,notes=chords[b%4];t0=b*bar
    put(mus,t0,pad(n2f(notes[0]-12),bar+.3),.10)
    put(mus,t0,pad(n2f(notes[1]-12),bar+.3),.07)
    put(mus,t0,bass(n2f(root),beat*1.5),.5);put(mus,t0+beat*2.5,bass(n2f(root),beat*1.2),.4)
    for i in range(8): # arp eighths
        put(mus,t0+i*beat/2,ep(n2f(notes[[0,1,2,3,2,1,2,3][i]]),1.0),.16)
    for i in range(4): put(mus,t0+i*beat,kick(),.22 if i%2==0 else 0)
    for i in range(8): put(mus,t0+i*beat/2+beat/4*0,hat(),.05 if i%2 else .03)
mus*= np.minimum(np.arange(N)/sr/1.0,1)*np.minimum((D-np.arange(N)/sr)/1.2,1)
# ducking by voice
e=np.abs(voice);k=int(sr*.12);ker=np.ones(k)/k;e=np.convolve(e,ker,'same');e=np.convolve(e,np.ones(int(sr*.25))/int(sr*.25),'same')
duck=1-.55*np.clip(e/0.08,0,1)
mus*=duck
# SFX
sfx=np.zeros(N)
def whoosh(t0,d=.6):
    n=int(d*sr);x=rng.standard_normal(n)
    # sweep via moving average with changing length (cheap bandpass feel)
    y=np.cumsum(x);y=y-np.concatenate([np.zeros(200),y[:-200]]);y/= (np.abs(y).max()+1e-9)
    t=np.arange(n)/sr;a=np.sin(np.pi*np.clip(t/d,0,1))**2
    put(sfx,t0,y*a,.28)
def pop(t0,f=520):
    n=int(.25*sr);t=np.arange(n)/sr;fr=f*(1+1.2*np.exp(-t*40));x=np.sin(2*np.pi*np.cumsum(fr)/sr)*np.exp(-t*14)
    put(sfx,t0,x,.45)
def thud(t0):
    n=int(.3*sr);t=np.arange(n)/sr;x=np.sin(2*np.pi*80*t)*np.exp(-t*18)+rng.standard_normal(n)*np.exp(-t*60)*.4;put(sfx,t0,x,.6)
def chime(t0):
    for i,f in enumerate([660,880,1320,1760]):
        n=int(1.6*sr);t=np.arange(n)/sr;x=np.sin(2*np.pi*f*t)*env(n,.01,.5);put(sfx,t0+i*.11,x,.18)
for b in [3.8,8.8,13.8,19.9,26.3,30.8]: whoosh(b-.4)
for t0 in [.3,.75,2.58,12.98,19.3,30.3,31.15]: pop(t0,[440,520,640,700,660,740,880][[.3,.75,2.58,12.98,19.3,30.3,31.15].index(t0)])
for t0 in [14.3,15.2,17.3,17.8,18.3]: thud(t0)
for t0 in [9.25,9.39,9.53,9.67,9.81,9.95]: pop(t0,900)
chime(31.2)
sfx*=1-.35*np.clip(e/0.08,0,1)
mix=voice*1.0+mus*0.55+sfx*0.7
mix=np.tanh(mix*1.1)
mix/=max(1e-9,np.abs(mix).max())/0.95
out=(mix*32767).astype(np.int16)
with wave.open("mix.wav","wb") as f:
    f.setnchannels(1);f.setsampwidth(2);f.setframerate(sr);f.writeframes(out.tobytes())
print("ok")
