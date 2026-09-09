import {FrameStore} from './frame-store.js';
import {SOURCE_FRAMES, LAST_FRAME, CHAPTERS, nextPartBoundary} from './timeline.js?v=entrancefix-20260909';

// Keep the approved frame edit and chapter boundaries, but fetch packs on demand.
// A visitor can start moving without waiting for the entire film to download.
class StreamingFrames extends FrameStore {
  constructor(manifest,base,options){super(manifest,base,options);this.packetCache=new Map();this.fetches=new Map();this.bytes=0;}
  async packet(index){
    if(this.packetCache.has(index)){const buffer=this.packetCache.get(index);this.packetCache.delete(index);this.packetCache.set(index,buffer);return buffer;}
    if(this.fetches.has(index))return this.fetches.get(index);
    const request=(async()=>{
      const response=await fetch(`${this.base}/${this.manifest.packs[index].file}`);
      if(!response.ok)throw Error('The walkthrough could not load. Please retry.');
      const buffer=await response.arrayBuffer();
      this.bytes+=buffer.byteLength;this.packetCache.set(index,buffer);
      while(this.packetCache.size>6)this.packetCache.delete(this.packetCache.keys().next().value);
      return buffer;
    })().finally(()=>this.fetches.delete(index));
    this.fetches.set(index,request);return request;
  }
  async decode(id){
    const [pack,offset,length]=this.manifest.images[id];
    const buffer=await this.packet(pack);
    const blob=new Blob([new Uint8Array(buffer,offset,length)],{type:'image/webp'});
    if(typeof createImageBitmap==='function')return createImageBitmap(blob);
    const url=URL.createObjectURL(blob);const image=new Image();image.src=url;
    try{await image.decode();image.close=()=>{image.src=''};return image;}finally{URL.revokeObjectURL(url);}
  }
}

export function initHero(){
  const hero=document.querySelector('.film-hero');
  const canvas=document.getElementById('hero-film');
  const ctx=canvas.getContext('2d',{alpha:false,desynchronized:true});
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let store,ready=false,frame=0,painted=-1,playback=null,scrubTarget=0,mode='steps',raf=0,last=0;
  let locked=scrollY<2,touch=null,wheelLast=0,wheelTotal=0,wheelUsed=false,resize=true,loadingFrame=false;
  let immersive=false,lastLabelKey='',lastProgressFrame=-1;
  const status=document.getElementById('film-status');
  const debug=window.__heroDebug={ready:false,frame:0,playing:false,locked,errors:[],mode};
  const nav=document.getElementById('film-chapters');
  nav.innerHTML=CHAPTERS.map((p,i)=>`<button data-chapter="${i}" aria-label="Go to ${p.label}" title="${p.label}"><span class="chapter-line"></span><span class="chapter-label">${String(i+1).padStart(2,'0')} ${p.label}</span></button>`).join('');
  function labels(){
    let index=CHAPTERS.findIndex(p=>frame<=p.frame+.5);if(index<0)index=CHAPTERS.length-1;
    debug.frame=painted;debug.playing=!!playback;debug.locked=locked;debug.mode=mode;
    debug.downloadedBytes=store?.bytes||0;debug.cachedPackets=store?.packetCache.size||0;
    if(lastProgressFrame!==painted){
      document.getElementById('film-progress').style.transform=`scaleX(${frame/LAST_FRAME})`;
      document.getElementById('film-seek').value=Math.round(frame);lastProgressFrame=painted;
    }
    const finished=frame>=LAST_FRAME-1;
    const key=`${index}:${!!playback}:${mode}:${finished}:${frame>5}:${ready}`;
    if(key===lastLabelKey)return;lastLabelKey=key;
    document.getElementById('film-room').textContent=CHAPTERS[index].label;
    document.getElementById('film-index').textContent=`${String(index+1).padStart(2,'0')} / 07`;
    nav.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-current',i===index?'step':'false'));
    document.getElementById('film-instruction').textContent=finished?'Continue scrolling to discover more':playback?'Moving to the next viewpoint':mode==='scrub'?'Scroll to move through the home':'One swipe. One new perspective.';
    document.getElementById('film-next').setAttribute('aria-label',finished?'Continue to the next section':'Play to next viewpoint');
    document.getElementById('film-prev').disabled=frame<1||!ready;
    hero.classList.toggle('has-moved',frame>5);
    document.getElementById('film-seek').setAttribute('aria-valuetext',CHAPTERS[index].label);
  }
  function measure(){
    const rect=canvas.getBoundingClientRect();const ratio=Math.min(devicePixelRatio||1,1.5);
    const scale=Math.min(ratio,1920/rect.width,1080/rect.height);
    canvas.width=Math.round(rect.width*scale);canvas.height=Math.round(rect.height*scale);resize=true;request();
  }
  function draw(f,image){
    ctx.fillStyle='#10130f';ctx.fillRect(0,0,canvas.width,canvas.height);
    const scale=Math.min(canvas.width/image.width,canvas.height/image.height);
    const w=image.width*scale,h=image.height*scale;
    ctx.drawImage(image,(canvas.width-w)/2,(canvas.height-h)/2,w,h);
    store.pin(f);painted=f;resize=false;
  }
  function request(){if(ready&&!raf&&!document.hidden)raf=requestAnimationFrame(tick);}
  function tick(time){
    raf=0;const dt=last?Math.min((time-last)/1000,.05):0;last=time;
    let wanted=frame;
    if(playback){wanted=frame+playback.direction*dt*30;wanted=playback.direction>0?Math.min(wanted,playback.end):Math.max(wanted,playback.end);}
    else if(mode==='scrub')wanted=reduced.matches?scrubTarget:frame+(scrubTarget-frame)*(1-Math.exp(-dt/.06));
    const f=Math.max(0,Math.min(LAST_FRAME,Math.round(wanted)));
    store.focusOn(f,Math.sign(wanted-frame)||1);
    const bitmap=store.get(f);
    if(bitmap){
      frame=wanted;if(f!==painted||resize)draw(f,bitmap);
      if(playback&&Math.abs(frame-playback.end)<.05){frame=playback.end;playback=null;}
      labels();
    }else if(!loadingFrame){loadingFrame=true;store.ensure(f).then(()=>{loadingFrame=false;last=0;request();}).catch(fail);}
    if(playback||Math.abs(frame-scrubTarget)>.08&&mode==='scrub'||resize)request();else last=0;
  }
  function fail(error){debug.errors.push(String(error));status.textContent='Couldn’t load the tour. Tap Retry, or continue below.';document.getElementById('film-retry').hidden=false;hero.classList.remove('film-ready');ready=false;}
  async function start(){
    status.textContent='Preparing your first view…';document.getElementById('film-retry').hidden=true;
    try{
      const mobile=matchMedia('(max-width:800px)').matches||navigator.connection?.saveData;
      const base=`./media/${mobile?'mobile':'hd'}`;
      const response=await fetch(`${base}/manifest.json?v=entrancefix-20260909`);if(!response.ok)throw Error('Manifest unavailable');
      const manifest=await response.json();manifest.map=SOURCE_FRAMES.map(f=>manifest.map[f]);manifest.frames=SOURCE_FRAMES.length;
      store?.destroy();store=new StreamingFrames(manifest,base,{limit:mobile?24:20,concurrency:3,onAvailable:request});
      await store.ensure(0);ready=true;debug.ready=true;debug.quality=mobile?'mobile':'1080p';
      hero.classList.add('film-ready');status.textContent='';measure();labels();
      store.focusOn(0);document.getElementById('film-next').disabled=false;
    }catch(error){fail(error);}
  }
  function setLocked(value){locked=value;hero.classList.toggle('is-locked',value);debug.locked=value;}
  function release(){
    playback=null;setLocked(false);labels();
    const after=document.getElementById('after-film');
    window.scrollTo({top:after.offsetTop-parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--review-height')),behavior:reduced.matches?'instant':'smooth'});
  }
  function step(direction){
    if(!ready||playback)return;
    if(direction>0&&frame>=LAST_FRAME-1){release();return;}
    const end=nextPartBoundary(frame,direction);
    if(Math.abs(end-frame)<.5)return;
    playback={end,direction};scrubTarget=end;last=0;labels();request();
  }
  function goTo(next){
    if(!ready)return;playback=null;frame=Math.max(0,Math.min(LAST_FRAME,next));scrubTarget=frame;resize=true;
    labels();request();
  }
  function gesture(delta){
    if(mode==='steps'){step(delta>0?1:-1);return;}
    if(delta>0&&frame>=LAST_FRAME-1&&scrubTarget>=LAST_FRAME){release();return;}
    scrubTarget=Math.max(0,Math.min(LAST_FRAME,scrubTarget+delta*.5));request();
  }
  const isControl=target=>!!target.closest('button,a,input');
  window.addEventListener('wheel',event=>{
    if(!locked||scrollY>2||event.ctrlKey||Math.abs(event.deltaX)>Math.abs(event.deltaY))return;
    event.preventDefault();
    const now=performance.now();if(now-wheelLast>280){wheelUsed=false;wheelTotal=0;}wheelLast=now;
    if(playback){wheelUsed=true;return;}
    const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?innerHeight:1);
    if(mode==='scrub'){gesture(delta);return;}
    if(wheelUsed)return;wheelTotal+=delta;
    if(Math.abs(wheelTotal)>32){wheelUsed=true;gesture(wheelTotal);}
  },{passive:false});
  hero.addEventListener('touchstart',event=>{
    touch=locked&&event.touches.length===1&&!isControl(event.target)?{x:event.touches[0].clientX,y:event.touches[0].clientY,lastY:event.touches[0].clientY,blocked:!!playback}:null;
  },{passive:true});
  hero.addEventListener('touchmove',event=>{
    if(!touch||event.touches.length!==1)return;
    if(event.cancelable)event.preventDefault();
    if(mode==='scrub'&&!touch.blocked){gesture((touch.lastY-event.touches[0].clientY)*2);touch.lastY=event.touches[0].clientY;}
  },{passive:false});
  hero.addEventListener('touchend',event=>{
    const start=touch;touch=null;if(!start||start.blocked||!event.changedTouches.length||mode!=='steps')return;
    const dx=event.changedTouches[0].clientX-start.x,dy=start.y-event.changedTouches[0].clientY;
    if(Math.abs(dy)>35&&Math.abs(dy)>Math.abs(dx)*1.2)step(dy>0?1:-1);
  },{passive:true});
  hero.addEventListener('touchcancel',()=>{touch=null});
  let oldY=scrollY;
  window.addEventListener('scroll',()=>{if(scrollY<=2&&oldY>2){setLocked(true);wheelUsed=false;wheelLast=performance.now();}if(scrollY>hero.offsetHeight*.9){playback=null;labels();}oldY=scrollY;},{passive:true});
  document.getElementById('film-prev').onclick=()=>step(-1);
  document.getElementById('film-next').onclick=()=>step(1);
  document.querySelectorAll('[data-leave-film]').forEach(b=>b.onclick=release);
  document.getElementById('film-retry').onclick=start;
  document.getElementById('film-mode').onclick=event=>{
    playback=null;mode=mode==='steps'?'scrub':'steps';scrubTarget=frame;
    event.currentTarget.setAttribute('aria-pressed',String(mode==='scrub'));labels();
  };
  document.getElementById('film-seek').max=LAST_FRAME;
  document.getElementById('film-seek').oninput=e=>goTo(Number(e.target.value));
  nav.addEventListener('click',e=>{const button=e.target.closest('button');if(button)goTo(CHAPTERS[Number(button.dataset.chapter)].frame)});
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&immersive){immersive=false;hero.classList.remove('expanded');document.getElementById('film-fullscreen').setAttribute('aria-pressed','false');measure();return;}
    if(isControl(event.target)||!locked||scrollY>2)return;
    if(['ArrowDown','PageDown',' ','ArrowUp','PageUp'].includes(event.key)){event.preventDefault();if(!event.repeat)step(['ArrowUp','PageUp'].includes(event.key)||event.shiftKey?-1:1);}
    if(event.key==='Escape')release();
  });
  document.getElementById('film-fullscreen').onclick=async()=>{
    try{
      if(document.fullscreenElement)await document.exitFullscreen();
      else if(immersive){immersive=false;hero.classList.remove('expanded');}
      else if(hero.requestFullscreen)await hero.requestFullscreen();
      else{immersive=true;hero.classList.add('expanded');}
    }catch{immersive=!immersive;hero.classList.toggle('expanded',immersive);}
    document.getElementById('film-fullscreen').setAttribute('aria-pressed',String(!!document.fullscreenElement||immersive));measure();
  };
  document.addEventListener('fullscreenchange',()=>{document.getElementById('film-fullscreen').setAttribute('aria-pressed',String(!!document.fullscreenElement));measure();});
  document.addEventListener('visibilitychange',()=>{last=0;if(document.hidden){if(raf)cancelAnimationFrame(raf);raf=0;}else request();});
  new ResizeObserver(measure).observe(hero);setLocked(locked);start();
  debug.seek=goTo;debug.step=step;debug.release=release;
  return {goTo,hero};
}
