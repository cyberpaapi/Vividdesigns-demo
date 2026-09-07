const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const assert=require('node:assert/strict');
const base=process.env.CHECK_BASE||'http://127.0.0.1:4180/Vividdesigns-demo/';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{for(const config of [{width:390,touch:true},{width:320,touch:true,reduced:true},{width:1440,touch:false}]){
  const context=await browser.newContext({viewport:{width:config.width,height:900},isMobile:config.touch,hasTouch:config.touch,reducedMotion:config.reduced?'reduce':'no-preference'});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'?style=experimental&v=cube-2');
  await page.waitForFunction(()=>window.__heroDebug?.ready);
  await page.getByRole('button',{name:'Explore design'}).click();
  await page.waitForFunction(()=>window.__cubeDebug);
  await page.locator('.cube-stage').evaluate(el=>el.scrollIntoView({block:'center'}));
  await page.waitForTimeout(500);
  const box=await page.locator('.room-cube').boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2;
  const before=await page.evaluate(()=>({...__cubeDebug,scroll:scrollY}));
  if(config.touch){const cdp=await context.newCDPSession(page);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
   for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+i*10,y:y+i*6}]});await page.waitForTimeout(18)}
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+80,y+48,{steps:8});await page.mouse.up()}
  const release=await page.evaluate(()=>({...__cubeDebug,scroll:scrollY}));
  assert(Math.abs(release.yaw-before.yaw)>25,'drag must rotate');assert(Math.abs(release.pitch-before.pitch)>10,'drag must tilt');
  assert(Math.abs(release.scroll-before.scroll)<2,'cube drag must not scroll');assert.equal(release.dragging,false);
  await page.waitForTimeout(350);const coast=await page.evaluate(()=>({...__cubeDebug}));
  if(config.reduced)assert.equal(coast.yaw,release.yaw);else assert(Math.abs(coast.yaw-release.yaw)>1,'release should coast');
  await page.locator('#cube-reset').click();await page.waitForTimeout(700);
  assert.equal(await page.evaluate(()=>__cubeDebug.yaw%360),0);assert.equal(await page.evaluate(()=>__cubeDebug.pitch),-8);
  await page.locator('[data-cube="1"]').click();await page.waitForTimeout(700);assert.equal(await page.evaluate(()=>__cubeDebug.face),1);
  await page.locator('.room-cube').focus();await page.keyboard.press('ArrowUp');assert.equal(await page.evaluate(()=>__cubeDebug.pitch),7);
  await page.keyboard.press('Home');
  if(config.touch){await page.locator('.cube-stage').evaluate(el=>el.scrollIntoView({block:'center'}));await page.waitForTimeout(700);const sy=await page.evaluate(()=>scrollY),cdp=await context.newCDPSession(page);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:8,y:650}]});
   for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:8,y:650-i*20}]});await page.waitForTimeout(20)}
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(300);assert(await page.evaluate(()=>scrollY)>sy+40,'outside swipe must scroll');
  }
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
  console.log(`${config.width}px ${config.touch?'touch':'mouse'}${config.reduced?' reduced motion':''}: spin, tilt, release, controls, scrolling passed`);
  await context.close();
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
