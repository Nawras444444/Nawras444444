import numpy as np, wave, subprocess, math
sr=44100; D=60.0; N=int(sr*D); rng=np.random.default_rng(11)
subprocess.run(["ffmpeg","-y","-loglevel","error","-i","narration.wav","-ar",str(sr),"-ac","1","/tmp/voice44.wav"],check=True)
w=wave.open("/tmp/voice44.wav");v=np.frombuffer(w.readframes(w.getnframes()),np.int16).astype(np.float64)/32768
voice=np.zeros(N)
def place(u0,u1,t0):
    seg=v[int(u0*sr):int(u1*sr)];i=int(t0*sr);voice[i:i+len(seg)]+=seg
# narration in three parts (same mapping as scene.html U2T)
place(0,13.8,7.2); place(13.8,30.8,28.0); place(30.8,33.28,54.0)
U2T=lambda u:u+(7.2 if u<13.8 else 14.2 if u<30.8 else 23.2)
def env(n,a,r):
    t=np.arange(n)/sr;return np.minimum(t/a,1)*np.exp(-t/r)
def put(buf,s,x,g=1.0):
    i=int(s*sr)
    if i<0 or i>=N:return
    x=x[:N-i];buf[i:i+len(x)]+=x*g
def ep(f,d):
    n=int(d*sr);t=np.arange(n)/sr
    return (np.sin(2*np.pi*f*t)+.35*np.sin(2*np.pi*2*f*t)*np.exp(-t*6)+.12*np.sin(2*np.pi*3*f*t)*np.exp(-t*9))*env(n,.004,.55)
def pad(f,d):
    n=int(d*sr);t=np.arange(n)/sr
    x=sum(np.sin(2*np.pi*f*k*t+i)*(1/k) for i,k in enumerate((1,2,3)))+np.sin(2*np.pi*f*1.004*t)
    return x*np.minimum(t/.6,1)*np.minimum((d-t)/.6,1)
def bass(f,d):
    n=int(d*sr);t=np.arange(n)/sr;return np.sin(2*np.pi*f*t)*env(n,.01,.5)
def kick():
    n=int(.3*sr);t=np.arange(n)/sr;f=48+90*np.exp(-t*30);return np.sin(2*np.pi*np.cumsum(f)/sr)*np.exp(-t*10)
def hat():
    n=int(.05*sr);x=np.diff(rng.standard_normal(n),prepend=0);return x*np.exp(-np.arange(n)/sr*90)
def n2f(m):return 440*2**((m-69)/12)
bpm=92;beat=60/bpm;bar=beat*4
chords=[(48,[60,64,67,71]),(45,[60,64,67,69]),(53,[60,65,69,72]),(55,[59,62,67,71])]
mus=np.zeros(N)
sec=lambda t:(0.55 if t<6.8 else 1.0 if t<21 else 0.8 if t<28 else 1.0 if t<45 else 0.7 if t<54 else 1.1)
for b in range(int(D/bar)+1):
    root,notes=chords[b%4];t0=b*bar;g=sec(t0)
    put(mus,t0,pad(n2f(notes[0]-12),bar+.3),.10*g);put(mus,t0,pad(n2f(notes[1]-12),bar+.3),.07*g)
    put(mus,t0,bass(n2f(root),beat*1.5),.5*g);put(mus,t0+beat*2.5,bass(n2f(root),beat*1.2),.4*g)
    for i in range(8): put(mus,t0+i*beat/2,ep(n2f(notes[[0,1,2,3,2,1,2,3][i]]+(12 if 21<=t0<28 else 0)),1.0),.16*g)
    if t0>=6.8:
        for i in range(4):
            if i%2==0: put(mus,t0+i*beat,kick(),.22*g if not 45<=t0<54 else .12)
        for i in range(8 if not 21<=t0<28 else 16): put(mus,t0+i*(beat/2 if not 21<=t0<28 else beat/4),hat(),(.05 if i%2 else .03)*g)
mus*=np.minimum(np.arange(N)/sr/1.0,1)*np.minimum((D-np.arange(N)/sr)/1.5,1)
e=np.abs(voice);e=np.convolve(e,np.ones(int(sr*.12))/int(sr*.12),'same');e=np.convolve(e,np.ones(int(sr*.25))/int(sr*.25),'same')
duck=np.clip(e/0.08,0,1);mus*=1-.55*duck
sfx=np.zeros(N)
def whoosh(t0,d=.6,g=.28):
    n=int(d*sr);x=rng.standard_normal(n);y=np.cumsum(x);y=y-np.concatenate([np.zeros(200),y[:-200]]);y/=(np.abs(y).max()+1e-9)
    tt=np.arange(n)/sr;put(sfx,t0,y*np.sin(np.pi*np.clip(tt/d,0,1))**2,g)
def riser(t0,d):
    n=int(d*sr);x=rng.standard_normal(n);k=np.linspace(60,3,n).astype(int)+1
    y=np.cumsum(x);idx=np.arange(n);y=y-y[np.maximum(idx-k,0)];y/=(np.abs(y).max()+1e-9)
    put(sfx,t0,y*(np.arange(n)/n)**2*np.minimum((d*sr-idx)/(.2*sr),1),.22)
def pop(t0,f=520,g=.45):
    n=int(.25*sr);t=np.arange(n)/sr;fr=f*(1+1.2*np.exp(-t*40));put(sfx,t0,np.sin(2*np.pi*np.cumsum(fr)/sr)*np.exp(-t*14),g)
def thud(t0):
    n=int(.3*sr);t=np.arange(n)/sr;put(sfx,t0,np.sin(2*np.pi*80*t)*np.exp(-t*18)+rng.standard_normal(n)*np.exp(-t*60)*.4,.6)
def ding(t0,f,g=.3,d=1.2):
    n=int(d*sr);t=np.arange(n)/sr;put(sfx,t0,(np.sin(2*np.pi*f*t)+.4*np.sin(2*np.pi*2.01*f*t)*np.exp(-t*5))*env(n,.005,.35),g)
def chime(t0,g=.18):
    for i,f in enumerate([660,880,1320,1760]):
        n=int(1.8*sr);t=np.arange(n)/sr;put(sfx,t0+i*.11,np.sin(2*np.pi*f*t)*env(n,.01,.55),g)
BOUND=[6.8,11,16,21,28,34.1,40.5,45,54]
for b in BOUND: whoosh(b-.4)
thud(.6);thud(.95);pop(1.9,640);pop(5.5,880,.3)
for t0,f in [(U2T(.2),440),(U2T(1.9),520),(U2T(2.58),700),(U2T(7.98),600),(U2T(12.98),760),(U2T(19.3),700),(U2T(30.3),780),(54.42,880)]: pop(t0,f)
for i in range(6): pop(U2T(9.25+i*.14),900,.3)
for t0 in [14.3,15.2,17.3,17.8,18.3]: thud(U2T(t0))
riser(21,6.6);ding(22,520,.3);ding(22.7,520,.25);ding(26.1,392,.3);pop(26.9,760)
# journey map dings: pitch follows the sentiment curve (journey-mapping skill)
S=[.74,.30,.13,.58,.96]
for i,s in enumerate(S): ding(45+.8+6.8*((180+i*180-90)/900)+.1,330*2**(s*1.6),.28)
chime(52.6,.2);riser(52.0,1.9)
chime(54.5,.22);chime(56.5,.26)
sfx*=1-.35*duck
mix=voice*1.0+mus*0.55+sfx*0.7
mix=np.tanh(mix*1.1);mix/=max(1e-9,np.abs(mix).max())/0.95
out=(mix*32767).astype(np.int16)
with wave.open("mix.wav","wb") as f:
    f.setnchannels(1);f.setsampwidth(2);f.setframerate(sr);f.writeframes(out.tobytes())
print("audio ok")
