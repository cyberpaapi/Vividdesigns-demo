const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{
 for(const style of ['experimental','experiential']){
  const p=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(`http://127.0.0.1:4180/Vividdesigns-demo/?style=${style}&v=materials-20260909`);
  await p.waitForFunction(()=>window.__heroDebug?.ready);
  const manifest=await p.evaluate(()=>fetch('./media/mobile/manifest.json?v=materials-20260909').then(r=>r.json()));
  assert.equal(manifest.revision,'materials-20260909');
  const cdp=await p.context().newCDPSession(p);
  async function swipe(from,to){
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:190,y:from}]});
   for(let i=1;i<=5;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:190,y:from+(to-from)*i/5}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }
  await p.evaluate(()=>__heroDebug.seek(200));await p.waitForFunction(()=>__heroDebug.frame===200);
  await swipe(580,340);await p.waitForFunction(()=>!__heroDebug.playing&&__heroDebug.frame===275);
  await p.waitForTimeout(400);assert.equal(await p.evaluate(()=>__heroDebug.frame),275);
  await swipe(580,340);await p.waitForFunction(()=>!__heroDebug.playing&&__heroDebug.frame===337);
  await swipe(340,580);await p.waitForFunction(()=>!__heroDebug.playing&&__heroDebug.frame===275);
  assert.deepEqual(errors,[]);assert.deepEqual(await p.evaluate(()=>__heroDebug.errors),[]);
  assert.equal(await p.evaluate(()=>scrollY),0);
  console.log(`${style}: real touch swipe skips removed viewport, stops before door opening, completes reveal and reverses correctly.`);
  await p.close();
 }
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
