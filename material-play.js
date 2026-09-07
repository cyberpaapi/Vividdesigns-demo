import * as THREE from 'three';
export async function initMaterialPlay(host){
 const canvas=host.querySelector('canvas'),reduced=matchMedia('(prefers-reduced-motion: reduce)');let renderer;
 try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'low-power'});}catch{host.querySelector('.material-play-status').textContent='Live material preview requires WebGL.';return;}
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0x0e0d0b,1);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(35,1,.1,30);camera.position.set(0,.5,6.8);
 const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d'),data=ctx.createImageData(256,256);let seed=23;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};for(let i=0;i<data.data.length;i+=4){const v=170+rand()*75;data.data[i]=data.data[i+1]=data.data[i+2]=v;data.data[i+3]=255;}ctx.putImageData(data,0,0);const grain=new THREE.CanvasTexture(c);grain.wrapS=grain.wrapT=THREE.RepeatWrapping;grain.repeat.set(6,6);
 const material=new THREE.MeshPhysicalMaterial({color:0xd0a75a,metalness:.72,roughness:.26,bumpMap:grain,bumpScale:.009,clearcoat:.3});
 const sculpture=new THREE.Mesh(new THREE.TorusKnotGeometry(1,.31,170,24,2,3),material);scene.add(sculpture);
 scene.add(new THREE.HemisphereLight(0xfff1d4,0x4b4540,2));const key=new THREE.DirectionalLight(0xffe2ab,5);key.position.set(-3,4,4);scene.add(key);const rim=new THREE.DirectionalLight(0xffffff,4);rim.position.set(3,1,-1);scene.add(rim);const fill=new THREE.DirectionalLight(0xfff6e5,2);fill.position.set(-3,-2,2);scene.add(fill);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(1.8,.008,6,100),new THREE.MeshBasicMaterial({color:0x907544,transparent:true,opacity:.5}));ring.rotation.set(.25,.4,0);scene.add(ring);
 const presets={brass:{color:0xd0a75a,metalness:.72,roughness:.26,bump:.009,title:'A little brilliance.',copy:'Brushed brass catches the light. Watch its highlights move as you turn the sculpture.'},stone:{color:0xe1d8c5,metalness:0,roughness:.92,bump:.055,title:'Quietly sculptural.',copy:'A mineral finish diffuses the light into soft, grounded shadows.'},ink:{color:0x282724,metalness:.32,roughness:.42,bump:.016,title:'Depth in the details.',copy:'Dark metal reveals its edges in the light. A small contrast changes the whole feeling.'}};
 let target=new THREE.Color(presets.brass.color),selected='brass',visible=false,raf=0,last=0,drag=null,userX=0,userY=0,angle=0;
 window.__materialPlayDebug={ready:true,selected};
 function request(){if(!raf&&visible&&!document.hidden)raf=requestAnimationFrame(paint)}
 function paint(now){raf=0;if(now-last<33&&!reduced.matches){request();return}const dt=Math.min(.06,(now-last)/1000||.016);last=now;if(!reduced.matches&&!drag)angle+=dt*.16;sculpture.rotation.set(userY+.22,angle+userX,.16);material.color.lerp(target,reduced.matches?1:.15);const p=presets[selected];material.metalness=THREE.MathUtils.lerp(material.metalness,p.metalness,.18);material.roughness=THREE.MathUtils.lerp(material.roughness,p.roughness,.18);renderer.render(scene,camera);if(!reduced.matches||drag)request();}
 new ResizeObserver(()=>{const r=host.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();request()}).observe(host);
 new IntersectionObserver(([e])=>{visible=e.isIntersecting;if(visible)request();else{cancelAnimationFrame(raf);raf=0}},{threshold:.02}).observe(host);
 document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0}else request()});
 document.querySelectorAll('[data-finish]').forEach(b=>b.onclick=()=>{selected=b.dataset.finish;const p=presets[selected];target.set(p.color);material.bumpScale=p.bump;if(reduced.matches){material.color.copy(target);material.metalness=p.metalness;material.roughness=p.roughness;}document.getElementById('finish-title').textContent=p.title;document.getElementById('finish-copy').textContent=p.copy;document.querySelectorAll('[data-finish]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));window.__materialPlayDebug.selected=selected;request();});
 const slider=document.getElementById('finish-light');slider.oninput=()=>{const a=Number(slider.value)/100*Math.PI;key.position.set(Math.cos(a)*5,2+Math.sin(a)*3,3);window.__materialPlayDebug.light=Number(slider.value);request()};
 canvas.style.touchAction='pan-y';canvas.onpointerdown=e=>{drag={x:e.clientX,y:e.clientY,ux:userX,uy:userY};if(e.pointerType==='mouse')canvas.setPointerCapture(e.pointerId)};
 canvas.onpointermove=e=>{if(!drag)return;userX=drag.ux+(e.clientX-drag.x)*.013;userY=drag.uy+(e.clientY-drag.y)*.007;request()};canvas.onpointerup=canvas.onpointercancel=()=>{drag=null};
 canvas.onkeydown=e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();userX+=e.key==='ArrowLeft'?-.2:.2;request()}};
 host.querySelector('.material-play-status').hidden=true;
}
