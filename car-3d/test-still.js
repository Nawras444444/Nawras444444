const { chromium } = require('playwright');const http=require('http'),fs=require('fs'),path=require('path');
const srv=http.createServer((q,r)=>{const f=path.join(__dirname,decodeURIComponent(q.url.split('?')[0]));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);return r.end()}r.writeHead(200,{'Content-Type':f.endsWith('.js')?'text/javascript':f.endsWith('.html')?'text/html':f.endsWith('.glb')?'model/gltf-binary':'application/octet-stream'});r.end(d)})}).listen(8766);
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const p=await b.newPage({viewport:{width:1080,height:1920}});
p.on('pageerror',e=>console.error('ERR',e.message));p.on('response',r=>{if(r.status()>=400)console.log('HTTP',r.status(),r.url())});p.on('console',m=>console.log('LOG',m.text()));
await p.goto('http://localhost:8766/model-test.html');await p.waitForFunction(()=>window.ready===true,null,{timeout:60000});
console.log('dims',await p.evaluate(()=>window.dims));await p.evaluate(()=>render(0.6));await p.screenshot({path:path.join(__dirname,'test-toycar.png')});await b.close();srv.close();})();
