"""Mux frames + music_sfx.wav into the clean master (soft caption track) and a burned-in caption version.
Run after: python3 audio.py && node render.js captions && node render.js frames"""
import json, subprocess
cues = json.load(open('captions/cues.json'))
enc = ['-c:v','libx264','-preset','slow','-crf','18','-pix_fmt','yuv420p','-profile:v','high',
       '-movflags','+faststart','-c:a','aac','-b:a','192k','-t','70']
base = ['ffmpeg','-y','-hide_banner','-loglevel','error','-framerate','30','-i','frames/f%05d.jpg','-i','music_sfx.wav']
subprocess.run(base + ['-i','captions.srt','-map','0:v','-map','1:a','-map','2:s','-c:s','mov_text',
                       '-metadata:s:s:0','language=eng'] + enc + ['kestrel_mobile_70s.mp4'], check=True)
inputs = []
for i in range(len(cues)): inputs += ['-loop','1','-framerate','30','-t','70','-i',f'captions/cap{i:02d}.png']
fg = '[0:v]format=yuv420p[v0];'; prev = 'v0'
for i, (a, e, _) in enumerate(cues):
    fg += f"[{prev}][{i+2}:v]overlay=0:0:enable='between(t,{a},{e})'[v{i+1}];"; prev = f'v{i+1}'
subprocess.run(base + inputs + ['-filter_complex', fg.rstrip(';'), '-map', f'[{prev}]', '-map', '1:a'] + enc
               + ['kestrel_mobile_70s_captioned.mp4'], check=True)
