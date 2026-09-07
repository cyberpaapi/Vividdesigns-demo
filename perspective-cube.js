export function initPerspectiveCube(){
 const cube=document.querySelector('.room-cube'),stage=cube.closest('.cube-stage'),buttons=[...document.querySelectorAll('[data-cube]')],reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let yaw=-18,pitch=-8,drag=null,vx=0,vy=0,raf=0,last=0,visible=true;
 const debug=window.__cubeDebug={yaw,pitch,dragging:false};
 cube.tabIndex=0;cube.setAttribute('role','group');cube.setAttribute('aria-roledescription','interactive 3D cube');cube.setAttribute('aria-label','Room perspective cube. Drag to rotate, use arrow keys to turn, or Home to reset.');
 cube.insertAdjacentHTML('beforeend','<div class="cube-face cube-cap cube-top" aria-hidden="true"><i>V</i></div><div class="cube-face cube-cap cube-bottom" aria-hidden="true"><i>V</i></div>');
 function paint(){cube.style.transform=`rotateX(${pitch}deg) rotateY(${yaw}deg)`;const face=((Math.round(-yaw/90)%4)+4)%4;buttons.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===face)));Object.assign(debug,{yaw,pitch,dragging:!!drag,face});}
 function stop(){cancelAnimationFrame(raf);raf=0;vx=vy=0;cube.classList.remove('coasting');}
 function coast(now){raf=0;const dt=Math.min(32,now-last||16);last=now;const friction=Math.pow(.91,dt/16);vx*=friction;vy*=friction;yaw+=vx*dt;pitch=Math.max(-70,Math.min(70,pitch+vy*dt));if(Math.abs(pitch)===70)vy=0;paint();if(visible&&!document.hidden&&(Math.abs(vx)+Math.abs(vy)>.004))raf=requestAnimationFrame(coast);else stop();}
 cube.addEventListener('pointerdown',e=>{if(e.button!==0||drag)return;stop();cube.classList.remove('snapping');drag={id:e.pointerId,x:e.clientX,y:e.clientY,time:e.timeStamp};cube.setPointerCapture(e.pointerId);cube.classList.add('dragging');paint();});
 cube.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;const dt=Math.max(8,e.timeStamp-drag.time),dx=(e.clientX-drag.x)*.45,dy=-(e.clientY-drag.y)*.35;yaw+=dx;pitch=Math.max(-70,Math.min(70,pitch+dy));vx=Math.max(-.65,Math.min(.65,dx/dt));vy=Math.max(-.35,Math.min(.35,dy/dt));drag={id:e.pointerId,x:e.clientX,y:e.clientY,time:e.timeStamp};paint();});
 function release(e){if(!drag||e.pointerId!==drag.id)return;const stale=e.timeStamp-drag.time>100;drag=null;cube.classList.remove('dragging');if(cube.hasPointerCapture(e.pointerId))cube.releasePointerCapture(e.pointerId);paint();if(e.type==='pointerup'&&!stale&&!reduced.matches){cube.classList.add('coasting');last=performance.now();raf=requestAnimationFrame(coast)}else stop();}
 cube.addEventListener('pointerup',release);cube.addEventListener('pointercancel',release);cube.addEventListener('lostpointercapture',e=>{if(drag?.id===e.pointerId){drag=null;cube.classList.remove('dragging');stop();paint();}});
 function select(i){stop();cube.classList.add('snapping');const desired=-i*90;yaw=desired+Math.round((yaw-desired)/360)*360;pitch=-8;paint();}
 buttons.forEach((b,i)=>b.onclick=()=>select(i));document.getElementById('cube-reset').onclick=()=>select(0);
 cube.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key))return;e.preventDefault();stop();cube.classList.add('snapping');if(e.key==='Home'){select(0);return;}yaw+=e.key==='ArrowLeft'?20:e.key==='ArrowRight'?-20:0;pitch=Math.max(-70,Math.min(70,pitch+(e.key==='ArrowUp'?15:e.key==='ArrowDown'?-15:0)));paint();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});new IntersectionObserver(([e])=>{visible=e.isIntersecting;if(!visible)stop()}).observe(stage);paint();
}
