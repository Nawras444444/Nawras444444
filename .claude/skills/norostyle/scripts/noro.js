/* norostyle entrance engine
   38 techniques x 8 directions x 4 easings = 1216 entrance variants.
   Every element enters with a seeded, non-repeating combination; schedule exported for audio. */
(function(){
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const EASE={
  cubic:p=>1-Math.pow(1-p,3),
  quint:p=>1-Math.pow(1-p,5),
  back:p=>{const k=1.3,c=k+1;return 1+c*Math.pow(p-1,3)+k*Math.pow(p-1,2)},
  elastic:p=>p>=1?1:1-Math.exp(-6*p)*Math.cos(p*Math.PI*3.2)
};
const io=p=>-(Math.cos(Math.PI*p)-1)/2;
const DIRS={E:[1,0],W:[-1,0],N:[0,-1],S:[0,1],NE:[.707,-.707],NW:[-.707,-.707],SE:[.707,.707],SW:[-.707,.707]};
const TECH={
 outside:['slide','spin','arc','slam','stop','flip','zoom','stretch','tumble','pendulum'],
 reveal:['wipe','iris','torn','blur','flicker','pop','stamp','flipX','mosaic','pixel','shutter','draw','glow'],
 form:['stretchF','unfold','rubber','grow','slices'],
 text:['type','mosaicT','blurT','stampT','slicesT','marker','flipT','drop','spinT','glitch']
};
const SOUND={slide:'whoosh',spin:'whoosh',arc:'whoosh',slam:'slam',stop:'stop',flip:'flap',zoom:'whoosh',stretch:'whoosh',tumble:'whoosh',pendulum:'whoosh',
 wipe:'swish',iris:'pop',torn:'rip',blur:'shimmer',flicker:'buzz',pop:'pop',stamp:'thud',flipX:'flap',mosaic:'sparkle',pixel:'sparkle',shutter:'clicks',draw:'marker',glow:'shimmer',
 stretchF:'stretch',unfold:'flap',rubber:'boing',grow:'pop',slices:'sparkle',
 type:'type',mosaicT:'sparkle',blurT:'shimmer',stampT:'thud',slicesT:'sparkle',marker:'marker',flipT:'flap',drop:'drop',spinT:'pop',glitch:'glitch'};
let seed=1;const rnd=()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646};
const hash=n=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s)};
const hist={tech:[],dir:[]};
function pick(cls,opts={}){
  const pool=(opts.techs||TECH[cls]).filter(t=>!hist.tech.slice(-4).includes(t));
  const tech=(pool.length?pool:TECH[cls])[Math.floor(rnd()*(pool.length||TECH[cls].length))];
  const dn=Object.keys(DIRS).filter(d=>d!==hist.dir[hist.dir.length-1]&&d!==hist.dir[hist.dir.length-2]);
  const dir=opts.dir||dn[Math.floor(rnd()*dn.length)];
  const ease=opts.ease||['cubic','quint','back','elastic'][Math.floor(rnd()*4)];
  hist.tech.push(tech);hist.dir.push(dir);return {cls,tech,dir,ease};
}
// half-plane clip of rect (w,h) keeping points with dot(p-c,d) <= th, optional jagged edge
function halfPlane(w,h,d,q,jag,sd){
  const cx=w/2,cy=h/2,ext=(Math.abs(d[0])*w+Math.abs(d[1])*h)/2+jag*2;
  const th=-ext+2*ext*q; // reveal grows from the side the element comes FROM (+d side)
  const corners=[[0,0],[w,0],[w,h],[0,h]];const f=p=>-((p[0]-cx)*d[0]+(p[1]-cy)*d[1])-(-th); // keep where dot(p-c,d) >= -th ... from +d side
  const inside=p=>((p[0]-cx)*d[0]+(p[1]-cy)*d[1])>=ext-2*ext*q;
  const out=[];
  for(let i=0;i<4;i++){const a=corners[i],b=corners[(i+1)%4];const ia=inside(a),ib=inside(b);
    const da=(a[0]-cx)*d[0]+(a[1]-cy)*d[1],db=(b[0]-cx)*d[0]+(b[1]-cy)*d[1],L=ext-2*ext*q;
    if(ia)out.push(a);
    if(ia!==ib){const t=(L-da)/(db-da);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t])}}
  if(out.length<3)return 'polygon(0 0,0 0,0 0)';
  if(jag>0){ // densify the cut line with noise
    const L=ext-2*ext*q,res=[];
    for(let i=0;i<out.length;i++){const a=out[i],b=out[(i+1)%out.length];res.push(a);
      const da=(a[0]-cx)*d[0]+(a[1]-cy)*d[1],db=(b[0]-cx)*d[0]+(b[1]-cy)*d[1];
      if(Math.abs(da-L)<1&&Math.abs(db-L)<1){const n=24;for(let k=1;k<n;k++){const t=k/n,j=(hash(sd+k)-.5)*jag;res.push([a[0]+(b[0]-a[0])*t+d[0]*j,a[1]+(b[1]-a[1])*t+d[1]*j])}}}
    return 'polygon('+res.map(p=>p[0].toFixed(1)+'px '+p[1].toFixed(1)+'px').join(',')+')';}
  return 'polygon('+out.map(p=>p[0].toFixed(1)+'px '+p[1].toFixed(1)+'px').join(',')+')';
}
const NORO={EASE,DIRS,TECH,SOUND,pick,hash,schedule:[],setSeed:s=>{seed=s}};
NORO.count=()=>(TECH.outside.length+TECH.reveal.length+TECH.form.length+TECH.text.length)*8*4;
/* sprite: {el,img,x,y,w,h,canvas?} ; spec from pick ; returns nothing, applies styles for progress p */
NORO.apply=function(sp,spec,p,t,stage){
  const el=sp.el,{w,h}=sp,d=DIRS[spec.dir],E=EASE[spec.ease],tech=spec.tech;
  let q=E(clamp(p));const qc=EASE.cubic(clamp(p));
  let tx=0,ty=0,rot=0,sx=1,sy=1,op=1,clip='none',filter='',org='50% 50%',pre='',mask='none';
  const useCanvas=['mosaic','pixel','slices','mosaicT','slicesT'].includes(tech);
  if(sp.canvas){sp.canvas.style.display=(useCanvas&&p>0&&p<1)?'block':'none'}
  if(p<=0){el.style.opacity=0;return}
  if(useCanvas&&p<1){el.style.opacity=0;NORO.drawBlocks(sp,spec,p);return}
  // offscreen travel for outside techniques
  const ox=d[0]>0?stage.W-sp.x+60:d[0]<0?-(sp.x+w+60):0, oy=d[1]>0?stage.H-sp.y+60:d[1]<0?-(sp.y+h+60):0;
  const OX=Math.abs(d[0])>.1?ox:0,OY=Math.abs(d[1])>.1?oy:0;
  const sgn=(d[0]+d[1])>=0?1:-1;
  switch(tech){
   case 'slide':tx=(1-q)*OX;ty=(1-q)*OY;break;
   case 'spin':tx=(1-q)*OX;ty=(1-q)*OY;rot=(1-q)*28*sgn;break;
   case 'arc':{tx=(1-q)*OX;ty=(1-q)*OY;const pr=Math.sin(Math.PI*clamp(p))*140;tx+=-d[1]*pr;ty+=d[0]*pr;rot=(1-q)*-12*sgn;break}
   case 'slam':{q=EASE.back(clamp(p));tx=(1-q)*OX;ty=(1-q)*OY;const l=clamp((p-.55)/.45);const sq=Math.sin(l*Math.PI)*.08;sx=1+sq*Math.abs(d[1])-sq*Math.abs(d[0]);sy=1+sq*Math.abs(d[0])-sq*Math.abs(d[1]);break}
   case 'stop':{const ps=Math.floor(clamp(p)*9)/9;q=EASE.cubic(ps);tx=(1-q)*OX;ty=(1-q)*OY;rot=p<1?(hash(Math.floor(p*9)+sp.x)-.5)*5:0;break}
   case 'flip':tx=(1-q)*OX;ty=(1-q)*OY;pre=`perspective(1200px) rotateY(${(1-qc)*85*sgn}deg) `;break;
   case 'zoom':tx=(1-q)*OX*.7;ty=(1-q)*OY*.7;sx=sy=1+(1-q)*.7;op=clamp(p*3);break;
   case 'stretch':{tx=(1-q)*OX;ty=(1-q)*OY;const st=(1-qc)*.6;sx=1+st*Math.abs(d[0]);sy=1+st*Math.abs(d[1]);break}
   case 'tumble':tx=(1-q)*OX;ty=(1-q)*OY;rot=(1-qc)*360*sgn;break;
   case 'pendulum':{tx=(1-qc)*OX;ty=(1-qc)*OY;org='50% 0%';rot=Math.sin(clamp(p)*Math.PI*3)*(1-clamp(p))*22;break}
   case 'wipe':case 'draw':case 'marker':{const qq=tech==='draw'?io(clamp(p)):q;clip=halfPlane(w,h,d,clamp(qq),0,1)||'none';break}
   case 'torn':clip=halfPlane(w,h,d,clamp(q),26,sp.x)||'none';break;
   case 'iris':{const cxp=50+d[0]*40,cyp=50+d[1]*40;clip=`circle(${clamp(q)*150}% at ${cxp}% ${cyp}%)`;break}
   case 'blur':case 'blurT':filter=`blur(${(1-qc)*18}px)`;op=clamp(p*2);sx=sy=1.08-.08*qc;ty=tech==='blurT'?(1-qc)*24:0;break;
   case 'flicker':{const pts=[.08,.16,.22,.34,.4,.55,.62];let on=1;for(let i=0;i<pts.length;i++)if(p<pts[i]){on=i%2;break}op=p>=.62?1:on;filter=`brightness(${1+(1-qc)*.8})`;break}
   case 'pop':sx=sy=q;rot=(1-qc)*-15;op=clamp(p*4);break;
   case 'stamp':case 'stampT':sx=sy=1+(1-qc)*1.6;rot=(1-qc)*-12;op=clamp(p*6);break;
   case 'flipX':case 'flipT':org=d[1]<0?'50% 0%':'50% 100%';pre=`perspective(900px) rotateX(${(1-q)*90*(d[1]<0?-1:1)}deg) `;op=clamp(p*3);break;
   case 'shutter':{const ang=Math.atan2(d[1],d[0])*180/Math.PI+90,X=(clamp(qc)*26).toFixed(1);mask=`repeating-linear-gradient(${ang}deg,#000 0 ${X}px,transparent ${X}px 26px)`;if(p>=1)mask='none';break}
   case 'glow':filter=`brightness(${1+(1-qc)*2}) blur(${(1-qc)*6}px)`;op=clamp(p*2);sx=sy=.9+.1*qc;break;
   case 'stretchF':{org=`${50-d[0]*50}% ${50-d[1]*50}%`;const s0=clamp(q);sx=Math.abs(d[0])>.1?s0:1;sy=Math.abs(d[1])>.1?s0:1;if(Math.abs(d[0])>.1&&Math.abs(d[1])>.1){sx=sy=s0}break}
   case 'unfold':{const a=EASE.cubic(clamp(p*2)),b=EASE.back(clamp(p*2-1));sy=.04+.96*a;sx=.04+.96*b;op=clamp(p*5);break}
   case 'rubber':{const qq=EASE.back(clamp(p));tx=(1-qq)*d[0]*320;ty=(1-qq)*d[1]*320;const st=(1-qc)*.8;sx=1+st*Math.abs(d[0]);sy=1+st*Math.abs(d[1]);org=`${50-d[0]*50}% ${50-d[1]*50}%`;op=clamp(p*4);break}
   case 'grow':sx=sy=q;rot=(1-qc)*-90;op=clamp(p*4);break;
   case 'type':{const n=10,ps=Math.ceil(clamp(p)*n)/n;clip=`inset(-12px 0 -12px ${(1-ps)*100}%)`;break}
   case 'drop':{const b=p<1?1-Math.abs(Math.cos(clamp(p)*Math.PI*2.5))*Math.pow(1-clamp(p),2):1;ty=-(1-EASE.cubic(clamp(p)))*260+(1-b)*-30;op=clamp(p*5);break}
   case 'spinT':sx=sy=q;rot=(1-qc)*-180;op=clamp(p*4);break;
   case 'glitch':{if(p<.85){const k=Math.floor(p*14);tx=(hash(k+sp.x)-.5)*40;const a=hash(k*3+1)*100,b2=a+hash(k*5+2)*40;clip=`inset(${a.toFixed(0)}% 0 ${Math.max(0,100-b2).toFixed(0)}% 0)`;op=1;if(hash(k*7)>.75)clip='none'}break}
  }
  el.style.opacity=op;el.style.transformOrigin=org;
  el.style.transform=`${pre}translate(${tx}px,${ty}px) rotate(${rot}deg) scale(${sx},${sy})`;
  el.style.clipPath=clip;el.style.filter=filter;el.style.webkitMaskImage=mask;el.style.maskImage=mask;
};
NORO.drawBlocks=function(sp,spec,p){
  const c=sp.canvas,ctx=c.getContext('2d'),pad=sp.pad,d=DIRS[spec.dir],tech=spec.tech,{w,h}=sp;
  ctx.clearRect(0,0,c.width,c.height);const bs=tech.startsWith('slices')?Math.max(14,Math.round(Math.max(w,h)/14)):18;
  if(tech.startsWith('slices')){
    const vert=Math.abs(d[0])>=Math.abs(d[1]);const n=Math.ceil((vert?w:h)/bs);
    for(let i=0;i<n;i++){const lp=clamp((p-i/n*.45)/.55),q=EASE.cubic(lp),side=i%2?1:-1;
      const off=(1-q)*(vert?h:w)*1.2*side;ctx.globalAlpha=clamp(lp*3);
      if(vert)ctx.drawImage(sp.img,i*bs,0,Math.min(bs,w-i*bs),h,pad+i*bs,pad+off,Math.min(bs,w-i*bs),h);
      else ctx.drawImage(sp.img,0,i*bs,w,Math.min(bs,h-i*bs),pad+off,pad+i*bs,w,Math.min(bs,h-i*bs))}
  }else{
    const nx=Math.ceil(w/bs),ny=Math.ceil(h/bs);
    for(let by=0;by<ny;by++)for(let bx=0;bx<nx;bx++){
      const r=hash(bx*31+by*57+sp.x),r2=hash(bx*13+by*7+sp.y);
      const sw=Math.min(bs,w-bx*bs),sh=Math.min(bs,h-by*bs);
      if(tech==='pixel'){const lp=clamp((p-r*.7)/.3);if(lp<=0)continue;ctx.globalAlpha=lp;ctx.drawImage(sp.img,bx*bs,by*bs,sw,sh,pad+bx*bs,pad+by*bs,sw,sh);continue}
      const lp=clamp((p-r*.5)/.5),q=EASE.cubic(lp);if(lp<=0)continue;
      const dist=(120+r2*260)*(1-q);ctx.globalAlpha=clamp(lp*2);
      const s=.3+.7*q;ctx.drawImage(sp.img,bx*bs,by*bs,sw,sh,pad+bx*bs+d[0]*dist+(r-.5)*60*(1-q),pad+by*bs+d[1]*dist+(r2-.5)*60*(1-q),sw*s,sh*s)}
  }
  ctx.globalAlpha=1;
};
window.NORO=NORO;
})();
