const {chromium}=require('playwright');const {spawn}=require('child_process');
(async()=>{const fps=30,dur=15.5,n=Math.round(fps*dur);
const b=await chromium.launch();const pg=await b.newPage({viewport:{width:940,height:1672}});
await pg.goto('file://'+process.cwd()+'/anim.html');
await pg.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));
const only=process.argv[2];
if(only){for(const t of only.split(',')){await pg.evaluate(t=>render(+t),t);await pg.screenshot({path:`f_${t}.png`})}await b.close();return}
const ff=spawn('ffmpeg',['-y','-f','image2pipe','-framerate',String(fps),'-i','-','-c:v','libx264','-pix_fmt','yuv420p','-crf','16','-preset','medium','-movflags','+faststart','out.mp4'],{stdio:['pipe','inherit','inherit']});
for(let i=0;i<n;i++){await pg.evaluate(t=>render(t),i/fps);const buf=await pg.screenshot({type:'png'});if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r))}
ff.stdin.end();await new Promise(r=>ff.on('close',r));await b.close()})();
