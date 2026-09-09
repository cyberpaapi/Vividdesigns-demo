const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const assert=require('node:assert/strict');
const base=process.env.CHECK_BASE||'http://127.0.0.1:4180/Vividdesigns-demo/';
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 for(const mobile of [true,false]){
  const p=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(base+'?style=experimental&v=entrance-1');await p.waitForFunction(()=>window.__heroDebug?.ready);
  const boundaries=[0,56,90,129,171,202,232,285,337,403,434,527,573,659,758];
  // Exercise the whole entrance in real time, including the reverse tilt.
  for(const expected of boundaries.slice(1,4)){
   await p.locator('#film-next').click();
   await p.waitForFunction(n=>!__heroDebug.playing&&__heroDebug.frame===n,expected);
   await p.waitForTimeout(200);assert.equal(await p.evaluate(()=>__heroDebug.frame),expected);
  }
  for(let i=4;i<boundaries.length;i++){
   await p.locator('#film-seek').evaluate((e,n)=>{e.value=n;e.dispatchEvent(new Event('input',{bubbles:true}))},String(boundaries[i]-4));
   await p.waitForFunction(n=>__heroDebug.frame===n,boundaries[i]-4);
   await p.locator('#film-next').click();
   await p.waitForFunction(n=>!__heroDebug.playing&&__heroDebug.frame===n,boundaries[i]);
   await p.waitForTimeout(150);assert.equal(await p.evaluate(()=>__heroDebug.frame),boundaries[i]);
  }
  for(let i=boundaries.length-2;i>=0;i--){
   await p.locator('#film-seek').evaluate((e,n)=>{e.value=n;e.dispatchEvent(new Event('input',{bubbles:true}))},String(boundaries[i]+4));
   await p.waitForFunction(n=>__heroDebug.frame===n,boundaries[i]+4);
   await p.locator('#film-prev').click();
   await p.waitForFunction(n=>!__heroDebug.playing&&__heroDebug.frame===n,boundaries[i]);
  }
  assert.deepEqual(errors,[]);assert.deepEqual(await p.evaluate(()=>__heroDebug.errors),[]);
  assert.equal(await p.locator('#film-chapters:visible').count(),0);
  console.log(`${mobile?'Phone':'Desktop'}: entrance reverse edit and all 14 destinations pause correctly, forward and backward.`);
  await p.close();
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
