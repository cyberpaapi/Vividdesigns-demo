const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});const results=[];
 for(const mobile of [true,false]){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:4173/Vividdesigns-demo/');
  await page.waitForFunction(()=>window.__walkthroughDebug?.ready);
  assert.equal(await page.evaluate(()=>window.__walkthroughDebug.sourceFrame(0)),62);
  assert.equal(await page.locator('#alternate-play').getAttribute('aria-checked'),'false');
  assert.equal(await page.locator('#alternate-play').textContent(),'Scroll mode');
  assert.equal(await page.evaluate(()=>window.__walkthroughDebug.alternate),true);
  const client=await context.newCDPSession(page);
  async function gesture(up=true){
   if(!mobile){await page.mouse.move(600,400);await page.mouse.wheel(0,up?120:-120);return;}
   await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:180,y:up?500:300}]});
   await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:180,y:up?300:500}]});
   await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }
  const started=Date.now();await gesture();
  await page.waitForFunction(()=>window.__walkthroughDebug.playing);
  await page.waitForTimeout(1000);
  const frame=await page.evaluate(()=>window.__walkthroughDebug.frame);
  assert.ok(frame>=25&&frame<=40,`Expected 30fps after 1s; got ${frame}`);
  await gesture();
  await page.waitForFunction(()=>!window.__walkthroughDebug.playing&&window.__walkthroughDebug.frame===50,{},{timeout:12000});
  const elapsed=Date.now()-started;assert.ok(elapsed>=1600&&elapsed<2600,`Part duration ${elapsed}`);
  await page.waitForTimeout(700);assert.equal(await page.evaluate(()=>window.__walkthroughDebug.frame),50);
  assert.equal(await page.evaluate(()=>window.__walkthroughDebug.sourceFrame(window.__walkthroughDebug.frame)),112);
  assert.equal(await page.locator('[data-chapter]').count(),7);
  await page.screenshot({path:`test-results/alternate-${mobile?'mobile':'desktop'}.png`});
  await gesture();await page.waitForFunction(()=>window.__walkthroughDebug.partEnd===190&&window.__walkthroughDebug.playing);
  await page.waitForTimeout(700);await page.locator('#alternate-play').click();
  assert.equal(await page.locator('#alternate-play').getAttribute('aria-checked'),'true');
  const stopped=await page.evaluate(()=>window.__walkthroughDebug.frame);
  await page.waitForTimeout(500);assert.ok(Math.abs(await page.evaluate(()=>window.__walkthroughDebug.frame)-stopped)<=1);
  await page.evaluate(()=>window.scrollBy(0,500));await page.waitForTimeout(600);
  assert.ok(await page.evaluate(()=>window.__walkthroughDebug.frame)>stopped);
  await page.locator('#alternate-play').click();
  await page.locator('[data-chapter="2"]').click();
  await page.waitForFunction(()=>window.__walkthroughDebug.frame===190);
  await gesture();
  await page.waitForFunction(()=>window.__walkthroughDebug.frame>=355&&window.__walkthroughDebug.playing);
  assert.equal(await page.evaluate(()=>window.__walkthroughDebug.partEnd),407);
  await page.waitForFunction(()=>window.__walkthroughDebug.frame===407&&!window.__walkthroughDebug.playing);
  await gesture(false);
  await page.waitForFunction(()=>window.__walkthroughDebug.playing&&window.__walkthroughDebug.partEnd===190);
  await page.waitForFunction(()=>!window.__walkthroughDebug.playing&&window.__walkthroughDebug.frame===190);
  await page.locator('[data-chapter="4"]').click();
  await page.waitForFunction(()=>window.__walkthroughDebug.frame===597);
  await gesture();
  await page.waitForFunction(()=>!window.__walkthroughDebug.playing&&window.__walkthroughDebug.frame===720);
  assert.equal(await page.evaluate(()=>window.__walkthroughDebug.sourceFrame(window.__walkthroughDebug.frame)),788);
  await page.waitForTimeout(400);
  assert.equal(await page.evaluate(()=>window.__walkthroughDebug.frame),720);
  await page.locator('[data-chapter="6"]').click();
  await page.waitForFunction(()=>window.__walkthroughDebug.frame===828);
  assert.equal(await page.locator('#scene-number').textContent(),'07 / 7');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const visible=await page.locator('[data-chapter="6"]').boundingBox();
  assert.ok(visible.x>=0&&visible.x+visible.width<= (mobile?390:1440));
  assert.deepEqual(errors,[]);
  results.push({device:mobile?'phone touch':'desktop wheel',firstPartMilliseconds:elapsed,frameAt1Second:frame,queuedSwipes:'ignored',toggleResume:'passed',errors});
  await context.close();
 }
 console.log(JSON.stringify(results,null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
