// Development QA only; not included in the published site.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('node:fs');
(async()=>{
  fs.mkdirSync('test-results',{recursive:true});
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const results=[];
  for(const mobile of [false,true]){
    const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},deviceScaleFactor:mobile?2:1,isMobile:mobile,hasTouch:mobile});
    const page=await context.newPage();const errors=[];let assetRequests=0;
    page.on('pageerror',e=>errors.push(String(e)));
    page.on('request',r=>{if(r.url().includes('/media/'))assetRequests++;});
    await page.goto(process.env.TEST_URL || 'http://127.0.0.1:4173/Vividdesigns-demo/');
    await page.waitForFunction(()=>window.__walkthroughDebug?.ready,{},{timeout:120000});
    await page.waitForTimeout(300);
    const requestsWhenReady=assetRequests;
    await page.screenshot({path:`test-results/${mobile?'mobile':'desktop'}-arrival.png`});
    const motion=await page.evaluate(async()=>{
      const samples=[];const start=performance.now();
      await new Promise(resolve=>{
        function advance(now){const elapsed=now-start;window.scrollTo(0,elapsed*.75);samples.push({t:elapsed,f:window.__walkthroughDebug.frame});if(elapsed<9000)requestAnimationFrame(advance);else resolve();}
        requestAnimationFrame(advance);
      });return samples;
    });
    await page.waitForTimeout(500);
    const stationary=await page.evaluate(()=>window.__walkthroughDebug.frame);
    await page.waitForTimeout(500);
    if(await page.evaluate(()=>window.__walkthroughDebug.frame)!==stationary)throw Error('Camera moved while scrolling was stopped');
    await context.setOffline(true);
    await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
    await page.waitForFunction(()=>window.__walkthroughDebug.frame===window.__walkthroughDebug.totalFrames-1,{},{timeout:15000});
    await page.screenshot({path:`test-results/${mobile?'mobile':'desktop'}-exterior.png`});
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.waitForFunction(()=>window.__walkthroughDebug.frame===0,{},{timeout:15000});
    const stats=await page.evaluate(()=>({...window.__walkthroughDebug,cache:window.__walkthroughDebug.cacheStats(),cacheStats:undefined}));
    if(errors.length||stats.errors.length||stats.cache.errors)throw Error('Browser errors: '+JSON.stringify({errors,stats}));
    if(stats.cache.maxDecoded>stats.cache.limit)throw Error('Unbounded decoded cache');
    if(assetRequests!==requestsWhenReady)throw Error('Scrolling triggered a network request');
    if(motion.some((s,i)=>i&&s.f<motion[i-1].f))throw Error('A forward scroll jumped backwards');
    const draws=stats.drawMilliseconds.slice().sort((a,b)=>a-b);
    results.push({device:mobile?'mobile':'desktop',quality:stats.quality,loadedMB:stats.loadedBytes/1e6,requests:assetRequests,drawCount:stats.drawCount,decodeWaitTicks:stats.stalls,drawP95:draws[Math.floor(draws.length*.95)],cache:stats.cache,stoppedFrame:stationary,offlineForwardReverse:'passed',errors});
    await context.close();
  }
  console.log(JSON.stringify(results,null,2));fs.writeFileSync('test-results/browser-check.json',JSON.stringify(results,null,2));
  await browser.close();
})().catch(error=>{console.error(error);process.exit(1);});
