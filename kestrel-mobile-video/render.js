// Usage:
//   node render.js stills 2.5 7 15.9 ...   -> stills/t<time>.png (review frames)
//   node render.js captions                -> captions/cap<NN>.png (transparent overlays) + captions.srt
//   node render.js frames                  -> frames/f00000.jpg ... (70 s x 30 fps)
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const [,,mode,...rest]=process.argv;const OUT=__dirname;
const FPS=30,DUR=70,N=FPS*DUR,K=4;
const grab=(p,fn,arg,type='image/jpeg',q=.95)=>p.evaluate(([fn,arg,type,q])=>{window[fn](arg);return document.getElementById('c').toDataURL(type,q)},[fn,arg,type,q]);
const save=(f,d)=>fs.writeFileSync(f,Buffer.from(d.split(',')[1],'base64'));
const srtTime=s=>{const ms=Math.round(s*1000);const h=String(Math.floor(ms/3600000)).padStart(2,'0'),m=String(Math.floor(ms/60000)%60).padStart(2,'0'),ss=String(Math.floor(ms/1000)%60).padStart(2,'0'),r=String(ms%1000).padStart(3,'0');return `${h}:${m}:${ss},${r}`};
(async()=>{
  const b=await chromium.launch({args:['--allow-file-access-from-files']});
  const mk=async()=>{const p=await b.newPage({viewport:{width:1080,height:1920}});await p.goto('file://'+path.join(OUT,'scene.html'));await p.waitForFunction('window.ready');return p};
  if(mode==='stills'){const p=await mk();fs.mkdirSync(path.join(OUT,'stills'),{recursive:true});
    for(const t of rest.map(Number))save(path.join(OUT,'stills',`t${t}.png`),await grab(p,'draw',t,'image/png'));}
  else if(mode==='captions'){const p=await mk();const caps=await p.evaluate('window.CAPS');fs.mkdirSync(path.join(OUT,'captions'),{recursive:true});
    let srt='';caps.forEach(([a,e,s],i)=>{srt+=`${i+1}\n${srtTime(a)} --> ${srtTime(e)}\n${s}\n\n`});
    fs.writeFileSync(path.join(OUT,'captions.srt'),srt);
    for(let i=0;i<caps.length;i++)save(path.join(OUT,'captions',`cap${String(i).padStart(2,'0')}.png`),await grab(p,'drawCaption',caps[i][2],'image/png'));
    fs.writeFileSync(path.join(OUT,'captions','cues.json'),JSON.stringify(caps));}
  else if(mode==='frames'){fs.mkdirSync(path.join(OUT,'frames'),{recursive:true});
    await Promise.all([...Array(K).keys()].map(async k=>{const p=await mk();
      for(let i=k;i<N;i+=K)save(path.join(OUT,'frames',`f${String(i).padStart(5,'0')}.jpg`),await grab(p,'draw',i/FPS));}));}
  await b.close();
})();
