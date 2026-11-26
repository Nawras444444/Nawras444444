import numpy as np,json
from scipy.io import wavfile
from scipy.signal import butter,lfilter
SR=44100;S=json.load(open('schedule.json'));D=S['dur'];N=int(SR*D)+SR
out=np.zeros(N,np.float32);rng=np.random.RandomState(11)
def add(t,x,g=1.0):
    i=int(t*SR);j=min(N,i+len(x))
    if 0<=i<N: out[i:j]+=x[:j-i].astype(np.float32)*g
def bp(x,lo,hi,o=2):
    b,a=butter(o,[max(20,lo)/(SR/2),min(hi,SR/2-100)/(SR/2)],'band');return lfilter(b,a,x)
def env(n,a,r): t=np.arange(n)/SR;return np.minimum(t/a,1)*np.exp(-t/r)
def tone(f0,f1,d,decay,a=.004):
    n=int(SR*d);t=np.arange(n)/SR;f=f0+(f1-f0)*t/d;ph=2*np.pi*np.cumsum(f)/SR;return np.sin(ph)*env(n,a,decay)
def noise_sweep(d,lo,hi,shape=.5):
    n=int(SR*d);x=rng.randn(n);out_=np.zeros(n);seg=n//8
    for k in range(8):
        f=lo+(hi-lo)*np.sin(np.pi*(k+.5)/8);out_[k*seg:(k+1)*seg]=bp(x[k*seg:(k+1)*seg+1][:seg],f*.6,f*1.6)
    t=np.linspace(0,1,n);return out_*np.sin(np.pi*t**shape)**2
def S_whoosh(d,size): lo=250+30000/max(size,60);return noise_sweep(min(1.2,d*.9),lo,lo*6)*.45
def S_slam(d,size): return S_whoosh(d,size)*.8+np.pad(tone(90,45,.35,.09),(int(SR*d*.5),0))[:int(SR*d*.5)+int(.35*SR)]*.9
def S_stop(d,size):
    x=np.zeros(int(SR*d));
    for k in range(9): i=int(k/9*d*SR*.9);c=bp(rng.randn(500),800,4000)*env(500,.001,.006);x[i:i+500]+=c*.6
    return x
def S_flap(d,size):
    n=int(SR*.35);x=bp(rng.randn(n),400,2500)*env(n,.01,.07);return x*.7
def S_swish(d,size): return noise_sweep(min(.7,d),1500,6000,.6)*.35
def S_marker(d,size):
    n=int(SR*d*.9);x=bp(rng.randn(n),2500,7000);m=1+.5*np.sin(np.arange(n)/SR*2*np.pi*14);t=np.linspace(0,1,n);return x*m*np.sin(np.pi*t)*.22
def S_rip(d,size):
    n=int(SR*d*.8);x=np.zeros(n)
    for _ in range(int(d*120)): i=rng.randint(0,n-300);x[i:i+300]+=bp(rng.randn(300),1200,6000)*env(300,.0005,.004)*rng.uniform(.3,1)
    return x*np.linspace(.6,1,n)*.5
def S_pop(d,size): return tone(620,300,.16,.04)*.6
def S_shimmer(d,size):
    n=int(SR*1.2);t=np.arange(n)/SR;x=np.zeros(n)
    for k,f in enumerate([1568,2093,2637,3136]): x+=np.sin(2*np.pi*f*t)*np.exp(-np.maximum(t-k*.07,0)/.35)*(t>k*.07)
    return x*.07
def S_buzz(d,size):
    x=np.zeros(int(SR*d))
    for p in [.0,.08,.16,.22,.34,.4,.55]:
        i=int(p*d*SR);n=int(.05*SR);t=np.arange(n)/SR;c=(np.sign(np.sin(2*np.pi*120*t))*.3+bp(rng.randn(n),2000,6000))*env(n,.001,.02);x[i:i+n]+=c*.35
    n=int(.9*SR);t=np.arange(n)/SR;hum=np.sin(2*np.pi*120*t)*.05*np.exp(-t/.6);i=int(.62*d*SR);x=np.pad(x,(0,n));x[i:i+n]+=hum
    return x
def S_thud(d,size): return tone(70,40,.6,.15)*1.0+bp(rng.randn(int(.08*SR)),200,1500)[:int(.6*SR)].tolist().__len__()*0
def S_sparkle(d,size):
    n=int(SR*d);x=np.zeros(n)
    for _ in range(int(d*30)): i=rng.randint(0,n-2000);f=rng.uniform(2500,5000);x[i:i+2000]+=tone(f,f,2000/SR,.012,.001)*rng.uniform(.2,.6)
    return x*.35
def S_clicks(d,size):
    x=np.zeros(int(SR*d))
    for k in range(5): i=int(k/5*d*SR);c=bp(rng.randn(300),3000,8000)*env(300,.0005,.003);x[i:i+300]+=c
    return x*.4
def S_stretch(d,size): return tone(300,700,min(.5,d),.25)*.25
def S_boing(d,size):
    n=int(SR*.6);t=np.arange(n)/SR;f=220*(1+.25*np.sin(2*np.pi*9*t)*np.exp(-t*5));return np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t/.18)*.4
def S_type(d,size):
    x=np.zeros(int(SR*(d+.1)))
    for k in range(6): i=int(k/6*d*SR);c=bp(rng.randn(700),1500,6000)*env(700,.0005,.006);x[i:i+700]+=c*rng.uniform(.6,1)
    return x*.35
def S_drop(d,size): return np.pad(tone(160,60,.3,.06),(int(SR*d*.35),0))*.7
def S_glitch(d,size):
    n=int(SR*d*.8);x=np.zeros(n);seg=int(.04*SR)
    for k in range(0,n-seg,seg):
        if rng.rand()<.6: f=rng.choice([300,600,1200,2400]);x[k:k+seg]=np.sign(np.sin(2*np.pi*f*np.arange(seg)/SR))*.12+bp(rng.randn(seg),3000,8000)*.15
    return x
F={k[2:]:v for k,v in globals().items() if k.startswith('S_')}
for e in S['schedule']:
    f=F.get(e['sound']);
    if f is None: continue
    x=np.asarray(f(e['dur'],e['size']),dtype=np.float32)
    add(e['t'],x,.8*e['gain'])
# soft bed: warm pad that swells after the bulb lights
t=np.arange(N)/SR
bed=(np.sin(2*np.pi*110*t)+.5*np.sin(2*np.pi*165*t)+.3*np.sin(2*np.pi*220*t))*.018
bulbT=[e['t'] for e in S['schedule'] if e['name']=='bulb'][0]
bed*=np.clip(t/2,0,1)*(1+1.2*np.clip((t-bulbT-.6)/1.5,0,1))*np.clip((D-t)/1.2,0,1)
out+=bed.astype(np.float32)
out=out[:int(SR*D)];out=np.tanh(out*1.3)*.8
wavfile.write('audio.wav',SR,(np.stack([out,out],1)*32767).astype(np.int16));print('ok')
