import * as THREE from 'three';
import {OrbitControls} from './vendor/three/OrbitControls.js';

export async function initRoomViewer(host){
 const status=host.querySelector('.room3d-status'),canvas=host.querySelector('canvas'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const debug=window.__room3dDebug={ready:false,active:false,frames:0,errors:[]};
 let renderer;
 try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'low-power'});}catch(e){status.textContent='3D is unavailable in this browser. You can still explore the video walkthrough above.';debug.errors.push(e.message);return;}
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0x0d0c0a,1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;renderer.localClippingEnabled=true;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(42,1,.1,100);camera.position.set(8.8,8.8,-4.2);
 const controls=new OrbitControls(camera,canvas);controls.target.set(2.1,.9,-12.05);controls.enableDamping=true;controls.dampingFactor=.075;controls.enablePan=false;controls.minDistance=3;controls.maxDistance=17;controls.minPolarAngle=.25;controls.maxPolarAngle=Math.PI*.49;controls.enabled=false;controls.autoRotate=!reduced.matches;controls.autoRotateSpeed=.4;
 renderer.shadowMap.enabled=false;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 scene.add(new THREE.HemisphereLight(0xfff7e3,0x60574a,1.7));const sun=new THREE.DirectionalLight(0xffead0,3.2);sun.position.set(-4,10,-18);sun.target.position.set(2,0,-12);scene.add(sun.target);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-9,right:9,top:9,bottom:-9,near:.5,far:35});sun.shadow.bias=-.001;sun.shadow.normalBias=.035;scene.add(sun);const fill=new THREE.DirectionalLight(0xffffff,.8);fill.position.set(7,5,-5);scene.add(fill);
 const clipping=[new THREE.Plane(new THREE.Vector3(1,0,0),1.05),new THREE.Plane(new THREE.Vector3(-1,0,0),5.4),new THREE.Plane(new THREE.Vector3(0,1,0),-.15),new THREE.Plane(new THREE.Vector3(0,-1,0),3.55),new THREE.Plane(new THREE.Vector3(0,0,1),15.7),new THREE.Plane(new THREE.Vector3(0,0,-1),-8.5)];
 canvas.style.touchAction='pan-y';
 const mats={ivory:{color:0xe5dac4,roughness:.84},dark:{color:0x25211c,roughness:.5},wood:{color:0x927049,roughness:.7},fabric:{color:0xd7cbb4,roughness:1},glass:{color:0xabbed0,transparent:true,opacity:.12,depthWrite:false},gold:{color:0xb69250,metalness:.55,roughness:.38}};
 let meshes=[],engaged=false,visible=false,raf=0,last=0,tween=null;
 const base=new THREE.Mesh(new THREE.BoxGeometry(6.7,.16,7.45),new THREE.MeshBasicMaterial({color:0xb69960,wireframe:true,transparent:true,opacity:.4}));base.position.set(2.175,.09,-12.1);scene.add(base);
 const pedestal=new THREE.Mesh(new THREE.CylinderGeometry(6.3,6.5,.18,80),new THREE.MeshStandardMaterial({color:0x15130f,metalness:.2,roughness:.65}));pedestal.position.set(2.175,-.12,-12.1);scene.add(pedestal);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(5.7,.012,5,128),new THREE.MeshBasicMaterial({color:0xb39355}));ring.rotation.x=Math.PI/2;ring.position.set(2.175,-.015,-12.1);scene.add(ring);
 function resize(){const r=host.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.fov=r.width<650?58:42;camera.updateProjectionMatrix();requestPaint();}
 function requestPaint(){if(!raf&&visible&&!document.hidden)raf=requestAnimationFrame(paint);}
 function paint(now){raf=0;if(!reduced.matches&&now-last<1000/30){requestPaint();return;}const dt=Math.min(.05,(now-last)/1000||.016);last=now;
  if(tween){const t=Math.min(1,(now-tween.start)/900),e=1-Math.pow(1-t,3);camera.position.lerpVectors(tween.from,tween.to,e);controls.target.lerpVectors(tween.targetFrom,tween.targetTo,e);if(t===1)tween=null;}
  controls.update(dt);renderer.render(scene,camera);debug.frames++;debug.camera=camera.position.toArray();debug.active=engaged;
  if(visible&&!document.hidden&&(!reduced.matches||engaged||tween))requestPaint();
 }
 new ResizeObserver(resize).observe(host);
 const visibility=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible){last=performance.now();requestPaint()}else{cancelAnimationFrame(raf);raf=0;}},{threshold:.05});visibility.observe(host);
 document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;}else requestPaint()});
 controls.addEventListener('change',requestPaint);
 const engage=document.getElementById('room3d-explore');
 function setEngaged(on){engaged=on;controls.enabled=on;controls.autoRotate=!on&&!reduced.matches;canvas.style.touchAction=on?'none':'pan-y';host.classList.toggle('exploring',on);engage.setAttribute('aria-pressed',String(on));engage.textContent=on?'Done exploring':'Explore in 3D';host.querySelector('.room3d-hint').textContent=on?'Drag to rotate · pinch to zoom':'A living space, from every angle';debug.active=on;requestPaint();}
 engage.onclick=()=>setEngaged(!engaged);
 canvas.addEventListener('keydown',e=>{if(e.key==='Escape'){setEngaged(false);engage.focus();}if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const v=camera.position.clone().sub(controls.target);v.applyAxisAngle(new THREE.Vector3(0,1,0),e.key==='ArrowLeft'?.15:-.15);camera.position.copy(controls.target).add(v);requestPaint();}});
 canvas.addEventListener('wheel',e=>{if(!engaged)return;e.preventDefault();},{passive:false});
 function view(pos,target,inside=false){controls.autoRotate=false;controls.maxPolarAngle=inside?Math.PI*.65:Math.PI*.49;controls.minDistance=inside?1.2:3;controls.maxDistance=inside?5:17;const to=new THREE.Vector3(...pos),targetTo=new THREE.Vector3(...target);if(reduced.matches){camera.position.copy(to);controls.target.copy(targetTo);}else tween={from:camera.position.clone(),to,targetFrom:controls.target.clone(),targetTo,start:performance.now()};requestPaint();}
 document.querySelectorAll('[data-room3d-view]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-room3d-view]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));const inside=b.dataset.room3dView==='inside';setEngaged(true);view(inside?[3.8,1.65,-9.8]:[8.8,8.8,-4.2],inside?[.3,1.5,-13.1]:[2.1,.9,-12.05],inside);});
 document.getElementById('room3d-reset').onclick=()=>{setEngaged(true);view([8.8,8.8,-4.2],[2.1,.9,-12.05]);document.querySelectorAll('[data-room3d-view]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.room3dView==='orbit')));};
 try{
  const [meta,buffer]=await Promise.all([fetch('assets/room3d/living.json').then(r=>{if(!r.ok)throw Error('Model description unavailable');return r.json()}),fetch('assets/room3d/living.bin').then(r=>{if(!r.ok)throw Error('Model unavailable');return r.arrayBuffer()})]);
  for(const group of meta.groups){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(buffer,group.offset,group.vertices*3),3));geo.computeVertexNormals();const props=mats[group.kind]||mats.ivory;const material=new THREE.MeshBasicMaterial({color:0xd5b573,wireframe:true,transparent:true,opacity:.55,side:THREE.DoubleSide,clippingPlanes:clipping,depthWrite:false});const mesh=new THREE.Mesh(geo,material);mesh.castShadow=group.kind!=='glass';mesh.receiveShadow=true;mesh.userData.color=material.color.getHex();mesh.userData.opacity=material.opacity;meshes.push(mesh);scene.add(mesh);}
  setEngaged(true);debug.wireframeOnly=true;debug.ready=true;debug.triangles=meta.triangles;debug.bytes=meta.bytes;status.hidden=true;host.classList.add('model-ready');document.querySelectorAll('.room3d-controls button').forEach(b=>b.disabled=false);resize();
 }catch(e){debug.errors.push(e.message);status.textContent='The 3D room could not load. Reload the page to try again.';}
 return {renderer,controls};
}
