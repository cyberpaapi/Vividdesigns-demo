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

export function initHero({standalone=false,native=false,reverseScroll=false,root=document,mediaBase='./media'}={}){
  const events=new AbortController();let disposed=false;
  const listen=(target,type,handler,options={})=>target.addEventListener(type,handler,{...options,signal:events.signal});
  const hero=root.querySelector('.film-hero');
  const canvas=root.getElementById('hero-film');
  if(reverseScroll)canvas.setAttribute('aria-label','Home walkthrough. Swipe down to advance to the next view; swipe up to go back.');
  const ctx=canvas.getContext('2d',{alpha:false,desynchronized:true});
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let store,ready=false,frame=0,painted=-1,playback=null,scrubTarget=0,mode='steps',raf=0,last=0;
  let locked=native||scrollY<2,touch=null,wheelLast=0,wheelTotal=0,wheelUsed=false,resize=true,loadingFrame=false;
  let immersive=false,lastLabelKey='',lastProgressFrame=-1;
  const status=root.getElementById('film-status');
  const fullscreenButton=root.getElementById('film-fullscreen');
  const debug=window.__heroDebug={ready:false,frame:0,playing:false,locked,errors:[],mode};
  const nav=root.getElementById('film-chapters');
  nav.innerHTML=CHAPTERS.map((p,i)=>`<button data-chapter="${i}" aria-label="Go to ${p.label}" title="${p.label}"><span class="chapter-line"></span><span class="chapter-label">${String(i+1).padStart(2,'0')} ${p.label}</span></button>`).join('');
  function labels(){
    let index=CHAPTERS.findIndex(p=>frame<=p.frame+.5);if(index<0)index=CHAPTERS.length-1;
    debug.frame=painted;debug.playing=!!playback;debug.locked=locked;debug.mode=mode;
    debug.downloadedBytes=store?.bytes||0;debug.cachedPackets=store?.packetCache.size||0;
    if(lastProgressFrame!==painted){
      root.getElementById('film-progress').style.transform=`scaleX(${frame/LAST_FRAME})`;
      root.getElementById('film-seek').value=Math.round(frame);lastProgressFrame=painted;
    }
    const finished=frame>=LAST_FRAME-1;
    const key=`${index}:${!!playback}:${mode}:${finished}:${frame>5}:${frame<1}:${ready}`;
    if(key===lastLabelKey)return;lastLabelKey=key;
    root.getElementById('film-room').textContent=CHAPTERS[index].label;
    root.getElementById('film-index').textContent=`${String(index+1).padStart(2,'0')} / 07`;
    nav.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-current',i===index?'step':'false'));
    root.getElementById('film-instruction').textContent=finished?(standalone?(reverseScroll?'Swipe up to look back.':'Swipe down to look back.'):'Continue scrolling to discover more'):playback?'Moving to the next viewpoint':mode==='scrub'?'Scroll to move through the home':'One swipe. One new perspective.';
    root.getElementById('film-next').setAttribute('aria-label',finished?(standalone?'Final viewpoint':'Continue to the next section'):'Play to next viewpoint');
    if(standalone)root.getElementById('film-next').disabled=finished||!ready;
    root.getElementById('film-prev').disabled=frame<1||!ready;
    hero.classList.toggle('has-moved',frame>5);
    root.getElementById('film-seek').setAttribute('aria-valuetext',CHAPTERS[index].label);
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
  function request(){if(!disposed&&ready&&!raf&&!document.hidden)raf=requestAnimationFrame(tick);}
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
  function fail(error){if(disposed)return;debug.errors.push(String(error));status.textContent=standalone?'Couldn’t load the tour. Tap Retry.':'Couldn’t load the tour. Tap Retry, or continue below.';root.getElementById('film-retry').hidden=false;hero.classList.remove('film-ready');ready=false;}
  async function start(){
    status.textContent='Preparing your first view…';root.getElementById('film-retry').hidden=true;
    try{
      const mobile=matchMedia('(max-width:800px)').matches||navigator.connection?.saveData;
      const base=`${mediaBase}/${mobile?'mobile':'hd'}`;
      const response=await fetch(`${base}/manifest.json?v=entrancefix-20260909`);if(!response.ok)throw Error('Manifest unavailable');
      const manifest=await response.json();if(disposed)return;manifest.map=SOURCE_FRAMES.map(f=>manifest.map[f]);manifest.frames=SOURCE_FRAMES.length;
      store?.destroy();store=new StreamingFrames(manifest,base,{limit:mobile?24:20,concurrency:3,onAvailable:request});
      await store.ensure(0);if(disposed)return;ready=true;debug.ready=true;debug.quality=mobile?'mobile':'1080p';
      hero.classList.add('film-ready');status.textContent='';measure();labels();
      store.focusOn(0);root.getElementById('film-next').disabled=false;
    }catch(error){fail(error);}
  }
  function setLocked(value){locked=value;hero.classList.toggle('is-locked',value);debug.locked=value;}
  function release(){
    if(native){playback=null;labels();window.scrollTo({top:scrollY+hero.getBoundingClientRect().bottom,behavior:reduced.matches?'instant':'smooth'});return;}
    if(standalone){playback=null;labels();return;}
    playback=null;setLocked(false);labels();
    const after=root.getElementById('after-film');
    window.scrollTo({top:after.offsetTop-parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--review-height')),behavior:reduced.matches?'instant':'smooth'});
  }
  function step(direction){
    if(!ready||playback)return;
    if(direction>0&&frame>=LAST_FRAME-1){release();return;}
    if(native&&direction<0&&frame<1){window.scrollTo({top:Math.max(0,scrollY+hero.getBoundingClientRect().top-innerHeight*.8),behavior:reduced.matches?'instant':'smooth'});return;}
    const end=nextPartBoundary(frame,direction);
    if(Math.abs(end-frame)<.5)return;
    if(native){const rect=hero.getBoundingClientRect();if(rect.top<0||rect.bottom>innerHeight)hero.scrollIntoView({block:'center',behavior:reduced.matches?'instant':'smooth'});}
    playback={end,direction};scrubTarget=end;last=0;labels();request();
  }
  function goTo(next){
    if(!ready)return;playback=null;frame=Math.max(0,Math.min(LAST_FRAME,next));scrubTarget=frame;resize=true;
    labels();request();
  }
  function gesture(delta){
    if(reverseScroll)delta=-delta;
    if(mode==='steps'){step(delta>0?1:-1);return;}
    if(delta>0&&frame>=LAST_FRAME-1&&scrubTarget>=LAST_FRAME){release();return;}
    scrubTarget=Math.max(0,Math.min(LAST_FRAME,scrubTarget+delta*.5));request();
  }
  const isControl=target=>!!target.closest('button,a,input');
  listen(native?hero:window,'wheel',event=>{
    if(!locked||(!native&&scrollY>2)||event.ctrlKey||Math.abs(event.deltaX)>Math.abs(event.deltaY))return;
    event.preventDefault();
    const now=performance.now();if(now-wheelLast>280){wheelUsed=false;wheelTotal=0;}wheelLast=now;
    if(playback){wheelUsed=true;return;}
    const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?innerHeight:1);
    if(mode==='scrub'){gesture(delta);return;}
    if(wheelUsed)return;wheelTotal+=delta;
    if(Math.abs(wheelTotal)>32){wheelUsed=true;gesture(wheelTotal);}
  },{passive:false});
  listen(hero,'touchstart',event=>{
    touch=locked&&event.touches.length===1&&!isControl(event.target)?{x:event.touches[0].clientX,y:event.touches[0].clientY,lastY:event.touches[0].clientY,blocked:!!playback}:null;
  },{passive:true});
  listen(hero,'touchmove',event=>{
    if(!touch||event.touches.length!==1)return;
    if(event.cancelable)event.preventDefault();
    if(mode==='scrub'&&!touch.blocked){gesture((touch.lastY-event.touches[0].clientY)*2);touch.lastY=event.touches[0].clientY;}
  },{passive:false});
  listen(hero,'touchend',event=>{
    const start=touch;touch=null;if(!start||start.blocked||!event.changedTouches.length||mode!=='steps')return;
    const dx=event.changedTouches[0].clientX-start.x,dy=start.y-event.changedTouches[0].clientY;
    if(Math.abs(dy)>35&&Math.abs(dy)>Math.abs(dx)*1.2)gesture(dy);
  },{passive:true});
  listen(hero,'touchcancel',()=>{touch=null});
  let oldY=scrollY;
  if(!native)listen(window,'scroll',()=>{if(scrollY<=2&&oldY>2){setLocked(true);wheelUsed=false;wheelLast=performance.now();}if(scrollY>hero.offsetHeight*.9){playback=null;labels();}oldY=scrollY;},{passive:true});
  root.getElementById('film-prev').onclick=()=>step(-1);
  root.getElementById('film-next').onclick=()=>step(1);
  root.querySelectorAll('[data-leave-film]').forEach(b=>b.onclick=release);
  root.getElementById('film-retry').onclick=start;
  root.getElementById('film-mode').onclick=event=>{
    playback=null;mode=mode==='steps'?'scrub':'steps';scrubTarget=frame;
    event.currentTarget.setAttribute('aria-pressed',String(mode==='scrub'));labels();
  };
  root.getElementById('film-seek').max=LAST_FRAME;
  root.getElementById('film-seek').oninput=e=>goTo(Number(e.target.value));
  listen(nav,'click',e=>{const button=e.target.closest('button');if(button)goTo(CHAPTERS[Number(button.dataset.chapter)].frame)});
  listen(native?hero:document,'keydown',event=>{
    if(event.key==='Escape'&&immersive){immersive=false;hero.classList.remove('expanded');fullscreenButton?.setAttribute('aria-pressed','false');measure();return;}
    if(isControl(event.target)||!locked||(!native&&scrollY>2))return;
    if(['ArrowDown','PageDown',' ','ArrowUp','PageUp'].includes(event.key)){event.preventDefault();if(!event.repeat)step(['ArrowUp','PageUp'].includes(event.key)||event.shiftKey?-1:1);}
    if(event.key==='Escape')release();
  });
  if(fullscreenButton)fullscreenButton.onclick=async()=>{
    try{
      if(document.fullscreenElement)await document.exitFullscreen();
      else if(immersive){immersive=false;hero.classList.remove('expanded');}
      else if(hero.requestFullscreen)await hero.requestFullscreen();
      else{immersive=true;hero.classList.add('expanded');}
    }catch{immersive=!immersive;hero.classList.toggle('expanded',immersive);}
    fullscreenButton.setAttribute('aria-pressed',String(!!document.fullscreenElement||immersive));measure();
  };
  if(fullscreenButton)listen(document,'fullscreenchange',()=>{fullscreenButton.setAttribute('aria-pressed',String(!!document.fullscreenElement));measure();});
  listen(document,'visibilitychange',()=>{last=0;if(document.hidden){if(raf)cancelAnimationFrame(raf);raf=0;}else request();});
  const observer=new ResizeObserver(measure);observer.observe(hero);setLocked(locked);start();
  debug.seek=goTo;debug.step=step;debug.release=release;
  return {goTo,hero,destroy(){disposed=true;ready=false;playback=null;events.abort();observer.disconnect();if(raf)cancelAnimationFrame(raf);store?.destroy();}};
}
