const {chromium}=require('playwright');const fs=require('fs');
const [,, mode, ...rest]=process.argv;
(async()=>{const b=await chromium.launch({args:['--no-sandbox']});
 const mk=async()=>{const p=await b.newPage({viewport:{width:1080,height:1920}});await p.goto('file://'+__dirname+'/scene.html');await p.waitForFunction('window.ready');return p};
 if(mode==='stills'){const p=await mk();fs.mkdirSync('stills',{recursive:true});for(const t of rest.map(Number)){const d=await p.evaluate(t=>{draw(t);return document.getElementById('c').toDataURL('image/jpeg',.85)},t);fs.writeFileSync(`stills/t${t}.jpg`,Buffer.from(d.split(',')[1],'base64'))}await b.close();return}
 const FPS=30,N=70*FPS;fs.mkdirSync('frames',{recursive:true});const K=4;
 await Promise.all([...Array(K).keys()].map(async k=>{const p=await mk();for(let i=k;i<N;i+=K){const d=await p.evaluate(t=>{draw(t);return document.getElementById('c').toDataURL('image/jpeg',.93)},i/FPS);fs.writeFileSync(`frames/f${String(i).padStart(5,'0')}.jpg`,Buffer.from(d.split(',')[1],'base64'))}}));
 await b.close()})();
