// node render.js stills 2 9 33   -> stills/*.jpg   |   node render.js -> frames/*.jpg (30fps)
const {chromium}=require('playwright');const fs=require('fs');
const [,, mode, ...rest]=process.argv;
(async()=>{const b=await chromium.launch();
 const mk=async()=>{const p=await b.newPage({viewport:{width:1000,height:563},deviceScaleFactor:1.92});
   await p.goto('file://'+__dirname+'/index.html?render');await p.waitForFunction('window.ready',null,{timeout:60000});return p};
 const shot=async(p,t,f)=>{await p.evaluate(t=>renderAt(t),t);await p.screenshot({path:f,type:'jpeg',quality:93,clip:{x:0,y:0,width:1000,height:562.5}})};
 if(mode==='stills'){const p=await mk();fs.mkdirSync('stills',{recursive:true});for(const t of rest.map(Number))await shot(p,t,`stills/t${t}.jpg`);await b.close();return}
 const FPS=30,N=Math.round(46.5*FPS),K=4,C=Math.ceil(N/K);fs.mkdirSync('frames',{recursive:true});
 await Promise.all([...Array(K).keys()].map(async k=>{const p=await mk();
   for(let i=k*C;i<Math.min(N,(k+1)*C);i++) await shot(p,i/FPS,`frames/f${String(i).padStart(5,'0')}.jpg`)}));
 await b.close()})();
