const {chromium}=require('playwright');const fs=require('fs');
const words=JSON.parse(fs.readFileSync(__dirname+'/words.json'));
const [,, mode, ...rest]=process.argv;
const FPS=30,TOTAL=34,N=TOTAL*FPS;
(async()=>{const b=await chromium.launch({args:['--no-sandbox']});
 const mk=async()=>{const p=await b.newPage({viewport:{width:1080,height:1920}});p.on('pageerror',e=>console.log('ERR',e.message));await p.goto('file://'+__dirname+'/scene.html');await p.evaluate(w=>window.init(w),words);await p.waitForFunction('window.ready');return p};
 if(mode==='stills'){const p=await mk();fs.mkdirSync('stills',{recursive:true});for(const t of rest.map(Number)){await p.evaluate(t=>draw(t),t);await p.screenshot({path:`stills/t${t}.jpg`,type:'jpeg',quality:88})}await b.close();return}
 fs.mkdirSync('frames',{recursive:true});const K=4;
 await Promise.all([...Array(K).keys()].map(async k=>{const p=await mk();for(let i=k;i<N;i+=K){await p.evaluate(t=>draw(t),i/FPS);await p.screenshot({path:`frames/f${String(i).padStart(5,'0')}.jpg`,type:'jpeg',quality:93})}}));
 await b.close()})();
