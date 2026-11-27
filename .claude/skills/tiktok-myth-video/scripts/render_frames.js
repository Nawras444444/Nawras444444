// Usage: NODE_PATH=<global node_modules> node render_frames.js <index.html abs path> <outDir> <workerIdx> <numWorkers> [durationSec=57.2] [fps=30]
// Run N workers in parallel (&; wait). Output: outDir/00000.jpg ...
const {chromium}=require('playwright');
const [html,out,W,NW,DUR,FPS]=[process.argv[2],process.argv[3],+process.argv[4],+process.argv[5],+(process.argv[6]||57.2),+(process.argv[7]||30)];
const TOTAL=Math.round(FPS*DUR);
(async()=>{
 const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920}});
 await p.goto('file://'+html);
 await p.evaluate(()=>document.fonts.load('900 40px CairoX','تجربة 25'));await p.evaluate(()=>document.fonts.ready);
 await p.waitForTimeout(800); // let <img> decode
 for(let f=W;f<TOTAL;f+=NW){await p.evaluate(t=>render(t),f/FPS);await p.screenshot({path:`${out}/${String(f).padStart(5,'0')}.jpg`,type:'jpeg',quality:95});}
 await b.close();})();
