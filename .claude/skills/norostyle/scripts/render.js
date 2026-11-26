const {chromium}=require('playwright');const {spawn}=require('child_process');const fs=require('fs');
(async()=>{const fps=30;
const b=await chromium.launch();const pg=await b.newPage({viewport:{width:1086,height:1448}});
pg.on('pageerror',e=>console.log('ERR',e.message));
await pg.goto('file://'+process.cwd()+'/anim.html');
await pg.waitForFunction(()=>window.ready===true,null,{timeout:60000});
const info=await pg.evaluate(()=>({dur:window.DUR,schedule:NORO.schedule,count:NORO.count()}));
fs.writeFileSync('schedule.json',JSON.stringify(info,null,1));
const only=process.argv[2];
if(only){for(const t of only.split(',')){await pg.evaluate(t=>render(+t),t);await pg.screenshot({path:`f_${t}.png`})}await b.close();return}
const n=Math.round(fps*info.dur);
const ff=spawn('ffmpeg',['-y','-loglevel','error','-f','image2pipe','-framerate',String(fps),'-i','-','-c:v','libx264','-pix_fmt','yuv420p','-crf','17','-preset','medium','video_silent.mp4'],{stdio:['pipe','inherit','inherit']});
for(let i=0;i<n;i++){await pg.evaluate(t=>render(t),i/fps);const buf=await pg.screenshot({type:'jpeg',quality:93});if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r))}
ff.stdin.end();await new Promise(r=>ff.on('close',r));await b.close()})();
