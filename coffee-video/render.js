// node render.js stills 3 12 44   -> stills/*.jpg      |   node render.js  -> frames/*.jpg
const {chromium}=require('playwright');const fs=require('fs');
const [,, mode, ...rest]=process.argv;
(async()=>{const b=await chromium.launch({args:['--allow-file-access-from-files']});
 const mk=async()=>{const p=await b.newPage({viewport:{width:1920,height:1080}});
   await p.goto('file://'+__dirname+'/scene.html?render');await p.waitForFunction('window.ready',null,{timeout:60000});return p};
 const grab=(p,t,q)=>p.evaluate(([t,q])=>{draw(t);return document.getElementById('c').toDataURL('image/jpeg',q)},[t,q]);
 const save=(f,d)=>fs.writeFileSync(f,Buffer.from(d.split(',')[1],'base64'));
 if(mode==='stills'){const p=await mk();fs.mkdirSync('stills',{recursive:true});
   for(const t of rest.map(Number)) save(`stills/t${t}.jpg`,await grab(p,t,.85));await b.close();return}
 const FPS=30,N=Math.round(46.5*FPS),K=4;fs.mkdirSync('frames',{recursive:true});
 await Promise.all([...Array(K).keys()].map(async k=>{const p=await mk();
   for(let i=k;i<N;i+=K) save(`frames/f${String(i).padStart(5,'0')}.jpg`,await grab(p,i/FPS,.93))}));
 await b.close()})();
