import numpy as np, wave
sr=44100;D=70;N=sr*D;rng=np.random.default_rng(1)
L=np.zeros(N);R=np.zeros(N)
def add(buf,s,x,g=1.0):
    i=int(s*sr);
    if i>=N:return
    x=x[:N-i];buf[i:i+len(x)]+=x*g
def env(n,a,r):
    t=np.arange(n)/sr;return np.minimum(t/a,1)*np.exp(-t/r)
def kick():
    n=int(.35*sr);t=np.arange(n)/sr;f=45+110*np.exp(-t*28);ph=2*np.pi*np.cumsum(f)/sr
    return np.sin(ph)*np.exp(-t*9)
def hat():
    n=int(.06*sr);x=rng.standard_normal(n);x=np.diff(x,prepend=0);return x*np.exp(-np.arange(n)/sr*70)
def snare():
    n=int(.2*sr);t=np.arange(n)/sr;x=rng.standard_normal(n)*np.exp(-t*22)+.5*np.sin(2*np.pi*190*t)*np.exp(-t*25);return x
def tone(f,d,a=.01,r=.4,saw=False):
    n=int(d*sr);t=np.arange(n)/sr
    w=sum(np.sin(2*np.pi*f*k*t)/k for k in (1,2,3,4)) if saw else np.sin(2*np.pi*f*t)
    return w*env(n,a,r)
def lp(x,k):
    return np.convolve(x,np.ones(k)/k,mode='same')
def hit(s,g=1):
    n=int(2.0*sr);t=np.arange(n)/sr;f=70*np.exp(-t*1.2)+30;ph=2*np.pi*np.cumsum(f)/sr
    x=np.sin(ph)*np.exp(-t*2.2)+lp(rng.standard_normal(n),12)*np.exp(-t*6)*.6
    add(L,s,x,g);add(R,s,x,g)
def whoosh(s,d,g=.5):
    n=int(d*sr);t=np.arange(n)/sr;x=rng.standard_normal(n);k=np.cumsum(x)*0
    y=lp(x,40)*(t/d)**2*np.exp(-0*t)
    y*=np.minimum((d-t)/.05,1)
    add(L,s,y,g);add(R,s,y[::-1] if False else y,g)
beat=.5
# chords Am F C G, root freqs
chords=[(220,[220,261.6,329.6]),(174.6,[174.6,220,261.6]),(261.6,[261.6,329.6,392]),(196,[196,246.9,293.7])]
bass_root=[55,43.65,65.4,49]
for ci in range(int(D/4)+1):
    s=ci*4;ch=chords[ci%4]
    if s>=D:break
    for f in ch[1]:
        x=tone(f,4.2,.6,3,True)*.05;x=lp(x,6)
        add(L,s,x,1);add(R,s,x,1)
    x=tone(bass_root[ci%4],4,.02,2.0)*.35
    add(L,s,x*(1 if s>=7 else .4));add(R,s,x*(1 if s>=7 else .4))
# drums
sec=lambda t:('intro' if t<7 else 'a' if t<17 else 'b' if t<30 else 'break' if t<42 else 'build' if t<54 else 'drop' if t<63 else 'out')
for b in range(int(D/beat)):
    t=b*beat;s=sec(t)
    kk=s in('a','b','drop','out') or (s=='build' and t>=48) or (s=='intro' and t>=5)
    if s=='out' and t>=67:kk=False
    if kk:
        add(L,t,kick(),.8);add(R,t,kick(),.8)
    if s in('b','drop','a') and b%2==1:
        add(L,t,snare(),.35);add(R,t,snare(),.35)
    if s in('b','drop','build','a'):
        for h in (0,.25):
            x=hat()*(.12 if h==0 else .07);add(L,t+h,x);add(R,t+h,x)
    if s=='drop':
        x=hat()*.15;add(L,t+.125,x);add(R,t+.375,x)
# arps (pluck) 8th notes
sc=[0,3,7,12,7,3]
for b in range(int(D/.25)):
    t=b*.25;s=sec(t)
    if s in('intro','out') and t<4:continue
    if s in ('a','intro','out'): continue
    if t>=D-1:continue
    ci=int(t//4)%4;f=chords[ci][0]*2*2**(sc[b%6]/12)
    g=.07 if s!='break' else .1
    x=tone(f,.3,.002,.12,True)*g;add(L,t,x,.7+.3*(b%2));add(R,t,x,.7+.3*((b+1)%2))
# snare build 48-54
for k,t in enumerate(np.arange(48,54,.25 if True else .5)):
    g=.15+.5*(t-48)/6;x=snare()*g;add(L,t,x);add(R,t,x)
for t in np.arange(52.5,54,.125):
    x=snare()*.5;add(L,t,x);add(R,t,x)
# impacts at scene boundaries & sfx
for t in [0.2,7,17,30,42,54,63,67.1]:hit(t,.9 if t not in(0.2,) else .7)
for t in [6.6,16.6,29.6,41.6,53.0,62.6]:whoosh(t,.6,.45)
for t in (3.4,):
    whoosh(t,.4,.3)
# riser into 54
n=int(6*sr);t=np.arange(n)/sr;f=200+1400*(t/6)**2;x=np.sin(2*np.pi*np.cumsum(f)/sr)*.06*(t/6);add(L,48,x);add(R,48,x)
# final fade
y=np.stack([L,R],1)
fade=np.ones(N);fade[-int(2.5*sr):]=np.linspace(1,0,int(2.5*sr))
fade[:int(.1*sr)]=np.linspace(0,1,int(.1*sr))
y*=fade[:,None]
# duck pads lightly: skip. normalize + soft clip
y=np.tanh(y*1.1);y/=np.abs(y).max()/0.89
w=wave.open('music.wav','wb');w.setnchannels(2);w.setsampwidth(2);w.setframerate(sr);w.writeframes((y*32767).astype('<i2').tobytes());w.close()
