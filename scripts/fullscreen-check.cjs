const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});const results=[];
 for(const fallback of [false,true]){
  const context=await browser.newContext({viewport:fallback?{width:320,height:740}:{width:1440,height:900},isMobile:fallback,hasTouch:fallback});
  if(fallback)await context.addInitScript(()=>{
   Element.prototype.requestFullscreen=undefined;
   Element.prototype.webkitRequestFullscreen=undefined;
  });
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:4173/Vividdesigns-demo/');
  await page.waitForFunction(()=>window.__walkthroughDebug?.ready);
  const before=await page.evaluate(()=>window.__walkthroughDebug.frame);
  const toggle=page.locator('#fullscreen-toggle');
  const initialBox=await toggle.boundingBox();assert.ok(initialBox.x>=0&&initialBox.x+initialBox.width<=(fallback?320:1440));
  await toggle.click();
  await page.waitForFunction(()=>document.body.classList.contains('is-fullscreen'));
  await page.waitForTimeout(250);
  assert.equal(await toggle.getAttribute('aria-pressed'),'true');
  assert.equal(await page.evaluate(()=>window.__walkthroughDebug.fullscreenFallback),fallback);
  if(!fallback)assert.equal(await page.evaluate(()=>Boolean(document.fullscreenElement)),true);
  const dimensions=await page.evaluate(()=>({height:document.getElementById('stage').getBoundingClientRect().height,viewport:innerHeight}));
  assert.ok(Math.abs(dimensions.height-dimensions.viewport)<2);
  assert.equal(await page.evaluate(()=>window.__walkthroughDebug.frame),before);
  await page.screenshot({path:`test-results/fullscreen-${fallback?'phone-fallback':'desktop'}.png`});
  await page.locator('#alternate-play').click();assert.equal(await page.locator('#alternate-play').getAttribute('aria-checked'),'true');
  await toggle.click();await page.waitForFunction(()=>!document.body.classList.contains('is-fullscreen'));
  assert.equal(await toggle.getAttribute('aria-pressed'),'false');
  assert.equal(await page.locator('.tour-footer').isVisible(),true);
  await toggle.click();await page.waitForFunction(()=>document.body.classList.contains('is-fullscreen'));
  if(fallback)await page.keyboard.press('Escape');else await page.evaluate(()=>document.exitFullscreen());
  await page.waitForFunction(()=>!document.body.classList.contains('is-fullscreen'));
  assert.equal(await toggle.getAttribute('aria-pressed'),'false');
  assert.deepEqual(errors,[]);
  results.push({mode:fallback?'phone fallback':'native desktop',enterExit:'passed',externalExit:'passed',scrollToggle:'passed',framePreserved:true});
  await context.close();
 }
 console.log(JSON.stringify(results,null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
