const {chromium}=require('playwright');const fs=require('fs');
(async()=>{
 const b=await chromium.launch({args:['--no-sandbox']});
 const p=await b.newPage({viewport:{width:1080,height:1920}});
 await p.goto('file://'+__dirname+'/scene.html');await p.waitForFunction('window.ready');
 const FPS=30,N=20*FPS;fs.mkdirSync('frames',{recursive:true});
 for(let i=0;i<N;i++){
   const d=await p.evaluate(t=>{draw(t);return document.getElementById('c').toDataURL('image/png')},i/FPS);
   fs.writeFileSync(`frames/f${String(i).padStart(4,'0')}.png`,Buffer.from(d.split(',')[1],'base64'));
 }
 await b.close();
})();
