const {chromium}=require('playwright');const fs=require('fs');const http=require('http');const path=require('path');
// tiny static server: ES modules (three.js) need http://, not file://
const PORT=8765;
const srv=http.createServer((q,s)=>{
 const f=path.join(__dirname,decodeURIComponent(q.url.split('?')[0]));
 fs.readFile(f,(e,d)=>{if(e){s.writeHead(404);return s.end()}
   s.writeHead(200,{'Content-Type':f.endsWith('.js')?'text/javascript':f.endsWith('.html')?'text/html':'application/octet-stream'});s.end(d)});
}).listen(PORT);
(async()=>{
 const b=await chromium.launch({args:['--no-sandbox']});
 const p=await b.newPage({viewport:{width:1080,height:1920}});
 p.on('pageerror',e=>console.error('PAGE ERROR:',e.message));
 await p.goto(`http://localhost:${PORT}/scene.html`);await p.waitForFunction('window.ready',null,{timeout:30000});
 const FPS=30,N=20*FPS;fs.mkdirSync('frames',{recursive:true});
 for(let i=0;i<N;i++){
   const d=await p.evaluate(t=>{draw(t);return document.getElementById('c').toDataURL('image/png')},i/FPS);
   fs.writeFileSync(`frames/f${String(i).padStart(4,'0')}.png`,Buffer.from(d.split(',')[1],'base64'));
 }
 await b.close();srv.close();
})();
