import {initHero} from './hero-player.js?v=kitchen-flow-1';
const requested=new URLSearchParams(location.search).get('style');
const style=['experimental','experiential'].includes(requested)?requested:'experimental';
const experientialModule=style==='experiential'?await import('./experiential.js?v=3'):null;
const expModule=style==='experimental'?await import('./experimental.js?v=six-1'):null;
document.body.dataset.style=style;
document.querySelector(`.review-bar a[data-style="${style}"]`).setAttribute('aria-current','page');
document.title=`Vivid / ${style} — Virtual experience`;
const arrow='<span aria-hidden="true">↗</span>';
const img=(name,alt,extra='')=>`<img src="assets/${name}.webp" alt="${alt}" width="1672" height="941" loading="lazy" decoding="async" ${extra}>`;
const brand=`<img src="assets/vivid-logo.png" alt="Vivid Design Studio" width="500" height="144">`;
const titles={experimental:['A little wonder.','A lot of feeling.'],experiential:['Beyond imagination.','Into your world.']};
const hero=`<section class="film-hero is-locked" aria-label="Mashini interactive video walkthrough" id="main"><canvas id="hero-film" role="img" aria-label="The Mashini walkthrough. Swipe or use the next viewpoint button to move through the home."></canvas><div class="film-poster"></div><div class="film-vignette"></div><header class="film-header"><a class="brand" href="https://www.vividdesignstudio.com/" aria-label="Vivid Design Studio home">${brand}</a><span class="film-project">MASHINI RESIDENCE <i>VIRTUAL WALKTHROUGH</i></span><div class="film-tools"><button id="film-mode" aria-pressed="false">Scroll mode <span class="toggle-track"></span></button><button id="film-fullscreen" aria-pressed="false" aria-label="Toggle fullscreen"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/></svg><span>Fullscreen</span></button></div></header><div class="hero-caption"><span class="eyebrow">A VIVID PERSPECTIVE</span><h1>${titles[style][0]}<br><em>${titles[style][1]}</em></h1></div><div class="film-ready-note"><span id="film-status" role="status">Preparing your first view…</span><button id="film-retry" hidden>Retry</button></div><div class="film-side-number" aria-hidden="true">V / 01</div><div class="hero-decor" aria-hidden="true"><span>+</span><span>+</span><span>+</span><span>+</span></div><footer class="film-controls"><div class="film-control-top"><div class="film-viewpoint"><span id="film-index">01 / 07</span><h2 id="film-room">Arrival</h2></div><div class="film-guidance"><span class="motion-cue" aria-hidden="true">↓</span><p id="film-instruction">One swipe. One new perspective.</p></div><div class="film-step-buttons"><button id="film-prev" aria-label="Play previous viewpoint in reverse" disabled>←</button><button id="film-next" aria-label="Play to next viewpoint" disabled>→</button></div></div><nav id="film-chapters" aria-label="Walkthrough viewpoints"></nav><input id="film-seek" aria-label="Walkthrough position" type="range" min="0" max="828" value="0"><div class="film-bottom-note"><span>SCROLL OR SWIPE TO EXPLORE</span><button data-leave-film>Explore design <span aria-hidden="true">↓</span></button></div></footer><div class="film-progress-track"><span id="film-progress"></span></div></section>`;

document.getElementById('site').innerHTML=`${hero}<main class="design-content">${style==='experimental'?expModule.content:experientialModule.content}</main><button class="back-tour" data-back-tour aria-label="Back to the video walkthrough"><span>↑</span> Back to the walkthrough</button>`;
const player=initHero();
expModule?.initExperimental(player);
experientialModule?.initExperiential(player);
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const fine=matchMedia('(hover:hover) and (pointer:fine)');
document.querySelectorAll('[data-back-tour],[data-room]').forEach(el=>el.addEventListener('click',e=>{
  e.preventDefault();window.scrollTo({top:0,behavior:'instant'});if(el.dataset.room)player.goTo(Number(el.dataset.room));
  document.getElementById('film-next').focus({preventScroll:true});
}));
const revealObserver=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('revealed');revealObserver.unobserve(e.target)}}),{threshold:.08});
document.querySelectorAll('[data-reveal]').forEach(el=>{if(reduced.matches)el.classList.add('revealed');else revealObserver.observe(el)});
document.body.classList.add('animations-ready');

// Keep long stories pinned using native CSS sticky. No wheel interception here.
const spatial=document.querySelector('.spatial-story');
const cinemaElement=document.querySelector('.cinematic-sequence');
let scrollRAF=0;
const clamp=x=>Math.max(0,Math.min(1,x));
function scrollPaint(){
  scrollRAF=0;document.querySelector('.back-tour').classList.toggle('visible',scrollY>innerHeight*.85);
  if(reduced.matches)return;
  const inset=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--review-height'));
  if(spatial){const r=spatial.getBoundingClientRect();const p=clamp((-r.top+inset)/(r.height-innerHeight+inset));spatial.style.setProperty('--progress',p.toFixed(4));}
  if(cinemaElement){
    const r=cinemaElement.getBoundingClientRect();const p=clamp((-r.top+inset)/(r.height-innerHeight+inset));const scaled=p*2.999;const index=Math.min(2,Math.floor(scaled));
    const images=cinemaElement.querySelectorAll('.cinematic-image');
    images.forEach((el,i)=>{const incoming=clamp(scaled-i+.25);el.style.clipPath=i===0?'none':`inset(0 ${100-incoming*100}% 0 0)`;el.style.setProperty('--zoom',1.045-(scaled-i)*.012)});
    cinemaElement.querySelectorAll('.cinematic-word').forEach((el,i)=>el.classList.toggle('active',i===index));
    cinemaElement.querySelector('.cinematic-count').textContent=`0${index+1} / 03`;
    cinemaElement.querySelector('.cinematic-meter span').style.transform=`scaleX(${p})`;
  }
}
window.addEventListener('scroll',()=>{if(!scrollRAF)scrollRAF=requestAnimationFrame(scrollPaint)},{passive:true});
window.addEventListener('resize',scrollPaint,{passive:true});scrollPaint();
document.querySelectorAll('[data-tilt]').forEach(el=>{
  let pending=0,lastPoint;
  el.addEventListener('pointermove',event=>{
    if(!fine.matches||reduced.matches)return;lastPoint={x:event.clientX,y:event.clientY};
    if(pending)return;pending=requestAnimationFrame(()=>{pending=0;const r=el.getBoundingClientRect();const x=(lastPoint.x-r.left)/r.width-.5,y=(lastPoint.y-r.top)/r.height-.5;el.style.setProperty('--rx',`${-y*4}deg`);el.style.setProperty('--ry',`${x*5}deg`);el.style.setProperty('--mx',`${(x+.5)*100}%`);el.style.setProperty('--my',`${(y+.5)*100}%`);});
  });
  el.addEventListener('pointerleave',()=>{el.style.setProperty('--rx','0deg');el.style.setProperty('--ry','0deg')});
});
document.querySelectorAll('.room-panel').forEach(panel=>{
  const select=()=>{panel.parentElement.querySelectorAll('.room-panel').forEach(el=>el.classList.toggle('active',el===panel))};
  panel.addEventListener('pointerenter',()=>{if(fine.matches)select()});panel.addEventListener('focusin',select);panel.addEventListener('click',select);
});

if(style==='experimental'){
  const stage=document.getElementById('reveal-stage'),source=document.getElementById('built-plan'),canvas=document.getElementById('blueprint-canvas');
  let prepared=false,full=false,lensX=55,lensY=27,pending=0;
  document.getElementById('reveal-position').value=lensX;
  function position(x,y){lensX=clamp(x)*100;lensY=clamp(y)*100;if(pending)return;pending=requestAnimationFrame(()=>{pending=0;stage.style.setProperty('--x',`${lensX}%`);stage.style.setProperty('--y',`${lensY}%`);document.getElementById('reveal-position').value=lensX;});}
  stage.addEventListener('pointermove',event=>{if(full)return;const r=stage.getBoundingClientRect();position((event.clientX-r.left)/r.width,(event.clientY-r.top)/r.height)});
  stage.addEventListener('pointerdown',event=>{if(full)return;const r=stage.getBoundingClientRect();position((event.clientX-r.left)/r.width,(event.clientY-r.top)/r.height)});
  document.getElementById('reveal-position').addEventListener('input',e=>position(Number(e.target.value)/100,.5));
  document.getElementById('reveal-all').addEventListener('click',event=>{full=!full;stage.classList.toggle('show-all',full);event.currentTarget.setAttribute('aria-pressed',String(full));event.currentTarget.innerHTML=full?'Return to blueprint ↙':`Reveal whole home ${arrow}`;});
  async function prepare(){
    if(prepared)return;prepared=true;
    try{
      await source.decode();const w=1100,h=Math.round(w*source.naturalHeight/source.naturalWidth);canvas.width=w;canvas.height=h;
      const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.filter='blur(1.6px)';ctx.drawImage(source,0,0,w,h);ctx.filter='none';
      const input=ctx.getImageData(0,0,w,h),gray=new Float32Array(w*h);
      for(let i=0;i<gray.length;i++)gray[i]=input.data[i*4]*.299+input.data[i*4+1]*.587+input.data[i*4+2]*.114;
      const magnitudes=new Float32Array(w*h),angles=new Float32Array(w*h);
      for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
        const i=y*w+x;const gx=-gray[i-w-1]-2*gray[i-1]-gray[i+w-1]+gray[i-w+1]+2*gray[i+1]+gray[i+w+1];const gy=-gray[i-w-1]-2*gray[i-w]-gray[i-w+1]+gray[i+w-1]+2*gray[i+w]+gray[i+w+1];
        magnitudes[i]=Math.sqrt(gx*gx+gy*gy);angles[i]=(Math.atan2(gy,gx)*180/Math.PI+180)%180;
      }
      const output=ctx.createImageData(w,h);
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){
        const i=y*w+x;let edge=0;
        if(x>0&&x<w-1&&y>0&&y<h-1){
          const a=angles[i],offset=a<22.5||a>=157.5?1:a<67.5?w+1:a<112.5?w:w-1;
          if(magnitudes[i]>=magnitudes[i-offset]&&magnitudes[i]>=magnitudes[i+offset])edge=clamp((magnitudes[i]-30)/50);
        }
        const o=i*4;output.data[o]=10+edge*167;output.data[o+1]=34+edge*175;output.data[o+2]=51+edge*177;output.data[o+3]=255;
      }
      ctx.putImageData(output,0,0);stage.classList.add('plan-ready');stage.querySelector('.plan-loading').textContent='';
      window.__blueprintDebug={ready:true,width:w,height:h,sourceWidth:source.naturalWidth,sourceHeight:source.naturalHeight};
    }catch{stage.classList.add('show-all');stage.querySelector('.plan-loading').textContent='Plan view unavailable. Showing the furnished view.';}
  }
  const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){prepare();observer.disconnect()}},{rootMargin:'300px'});observer.observe(stage);
}
