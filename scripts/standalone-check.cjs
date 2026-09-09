const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{
 for(const mobile of [true,false]){
  const p=await b.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile});const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.setContent('<style>html,body{margin:0;height:100%;overflow:hidden}iframe{display:block;width:100%;height:100%;border:0}</style><iframe src="http://127.0.0.1:4180/Vividdesigns-demo/walkthrough.html" allow="fullscreen" allowfullscreen></iframe>');
  await p.waitForFunction(()=>document.querySelector('iframe'));
  let f;for(let i=0;i<50;i++){f=p.frames().find(f=>f.url().includes('walkthrough.html'));if(f)break;await p.waitForTimeout(100)}
  await f.waitForFunction(()=>window.__heroDebug?.ready);
  assert.equal(await f.locator('button:visible').count(),1);assert.equal(await f.locator('.review-bar,.hero-caption,#after-film').count(),0);
  assert.equal(await f.evaluate(()=>document.documentElement.scrollHeight<=innerHeight),true);
  await f.evaluate(()=>__heroDebug.seek(129));await f.waitForFunction(()=>__heroDebug.frame===129);
  if(mobile){const cdp=await p.context().newCDPSession(p);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:190,y:580}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:190,y:350}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
  else await p.mouse.wheel(0,160);
  await f.waitForFunction(()=>!__heroDebug.playing&&__heroDebug.frame===176);
  await f.evaluate(()=>__heroDebug.seek(764));await f.waitForFunction(()=>__heroDebug.frame===764);await f.evaluate(()=>__heroDebug.step(1));
  assert.equal(await f.evaluate(()=>__heroDebug.locked&&__heroDebug.frame===764),true);
  await f.evaluate(()=>__heroDebug.seek(670));await f.waitForFunction(()=>__heroDebug.frame===670);await f.evaluate(()=>__heroDebug.step(-1));await f.waitForFunction(()=>!__heroDebug.playing&&__heroDebug.frame===667);
  await f.locator('#film-fullscreen').click();await f.waitForFunction(()=>!!document.fullscreenElement||document.querySelector('.film-hero').classList.contains('expanded'));
  assert.deepEqual(errors,[]);assert.deepEqual(await f.evaluate(()=>__heroDebug.errors),[]);
  console.log(`${mobile?'Phone':'Desktop'}: single-button player, iframe swipe/wheel playback, end hold, reverse and fullscreen passed.`);await p.close();
 }
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
