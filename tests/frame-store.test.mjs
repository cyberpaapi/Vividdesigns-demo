import {test} from 'node:test';
import assert from 'node:assert/strict';
import {FrameStore} from '../frame-store.js';
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
test('decoded memory remains bounded through forward and reverse traversal',async()=>{
  const manifest={frames:300,map:Array.from({length:300},(_,i)=>i),images:[]};
  const store=new FrameStore(manifest,'',{limit:26,concurrency:3});
  store.decode=async id=>({id,closed:false,close(){this.closed=true;}});
  for(const frame of [0,20,60,150,299,250,120,40,0]){
    store.focusOn(frame,frame<150?-1:1);
    const image=await store.ensure(frame);
    store.pin(frame);
    await wait(5);
    assert.equal(store.get(frame),image);
    assert.equal(image.closed,false);
    assert.ok(store.cache.size<=26);
  }
  assert.ok(store.maxCache<=26);
  assert.equal(store.decodeErrors,0);
  store.destroy();
  assert.equal(store.cache.size,0);
});
test('concurrent requests for the same frame share a single decode',async()=>{
  const store=new FrameStore({frames:1,map:[0],images:[]},'');let count=0;
  store.decode=async()=>{count++;await wait(5);return{close(){}};};
  const [a,b]=await Promise.all([store.ensure(0),store.ensure(0)]);
  assert.equal(a,b);assert.equal(count,1);store.destroy();
});
