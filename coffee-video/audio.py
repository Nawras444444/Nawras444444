"""Warm ambient music bed (A minor pad + soft plucks), then mix it under the voiceover."""
import numpy as np, wave, subprocess
SR, DUR = 48000, 46.5
t = np.arange(int(SR*DUR))/SR
def note(n): return 440*2**((n-69)/12)
CH = [[57,60,64,71],[53,57,60,67],[48,55,60,64],[55,59,62,67]]   # Am(add9) F C G
mix = np.zeros_like(t); L = 5.8                                   # seconds per chord
for i in range(int(DUR/L)+1):
    s, e = i*L, min(DUR, i*L+L+1.5)
    m = (t>=s)&(t<e); tt = t[m]-s
    env = np.clip(tt/1.8,0,1)*np.clip((e-s-tt)/1.5,0,1)
    for n in CH[i%4]:
        f = note(n-12)
        mix[m] += env*(np.sin(2*np.pi*f*tt)+.5*np.sin(2*np.pi*f*1.003*tt)+.18*np.sin(2*np.pi*2*f*tt))
    for j,n in enumerate(CH[i%4]+[CH[i%4][1]+12]):              # gentle arpeggio
        st = s + .4 + j*1.1
        mm = (t>=st)&(t<st+2.5); tp = t[mm]-st
        mix[mm] += .55*np.exp(-tp*2.2)*np.sin(2*np.pi*note(n+12)*tp)*np.clip(tp/.01,0,1)
mix = np.convolve(mix, np.ones(24)/24, 'same')                    # soften highs
mix *= np.clip(t/2,0,1)*np.clip((DUR-t)/2.5,0,1)
mix = mix/np.abs(mix).max()*.9
st = np.stack([mix, np.roll(mix, 380)],1)
with wave.open('music.wav','wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((st*32767).astype('<i2').tobytes())
# music ducks under the voice, swells for the end card
subprocess.run(['ffmpeg','-y','-loglevel','error','-i','voiceover.wav','-i','music.wav','-filter_complex',
  "[0:a]aresample=48000,pan=stereo|c0=c0|c1=c0,apad=whole_dur=46.5,volume=1.15,asplit[v][sc];"
  "[1:a]volume='if(lt(t,41.8),0.16,0.16+min((t-41.8)/1.2,1)*0.22)':eval=frame[m];"
  "[m][sc]sidechaincompress=threshold=0.04:ratio=6:attack=20:release=400[md];"
  "[v][md]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[out]",
  '-map','[out]','-t','46.5','final_audio.wav'], check=True)
