const {chromium}=require('playwright');const fs=require('fs');
const words=JSON.parse(fs.readFileSync(__dirname+'/words.json'));
const world=JSON.parse(fs.readFileSync(__dirname+'/node_modules/world-atlas/countries-110m.json'));
const [,, mode, ...rest]=process.argv;
const FPS=30,TOTAL=60,N=TOTAL*FPS;const S0=+process.env.S0||0,E0=+process.env.E0||N;
(async()=>{const b=await chromium.launch({args:['--no-sandbox']});
 const mk=async()=>{const p=await b.newPage({viewport:{width:1080,height:1920}});p.on('pageerror',e=>console.log('ERR',e.message));p.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text())});await p.goto('file://'+__dirname+'/scene.html');await p.waitForFunction('typeof anime!=="undefined"&&typeof d3!=="undefined"');await p.evaluate(([w,wd])=>window.init(w,wd),[words,world]);await p.waitForFunction('window.ready');return p};
 if(mode==='stills'){const p=await mk();fs.mkdirSync('stills',{recursive:true});for(const t of rest.map(Number)){await p.evaluate(t=>draw(t),t);await p.screenshot({path:`stills/t${t}.jpg`,type:'jpeg',quality:88})}await b.close();return}
 fs.mkdirSync('frames',{recursive:true});const K=4;
 await Promise.all([...Array(K).keys()].map(async k=>{const p=await mk();for(let i=S0+((k-S0%K)%K+K)%K;i<E0;i+=K){await p.evaluate(t=>draw(t),i/FPS);await p.screenshot({path:`frames/f${String(i).padStart(5,'0')}.jpg`,type:'jpeg',quality:93})}}));
 await b.close()})();
