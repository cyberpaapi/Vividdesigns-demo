import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createTimeline,frameAtScroll,scrollAtFrame,VIEWPOINTS,LAST_FRAME,chapterAtFrame} from '../timeline.js';
for(const scale of [12,17]){
  const timeline=createTimeline(scale);
  test(`every approved viewpoint holds in both scroll directions at scale ${scale}`,()=>{
    for(const stop of VIEWPOINTS){
      const center=scrollAtFrame(stop.frame,timeline);
      assert.equal(frameAtScroll(center,timeline),stop.frame);
      assert.equal(frameAtScroll(center-20,timeline),stop.frame);
      assert.equal(frameAtScroll(center+20,timeline),stop.frame);
    }
  });
  test(`scroll mapping is monotonic and clamps at both ends at scale ${scale}`,()=>{
    let last=-1;
    for(let x=-100;x<=timeline.length+100;x+=3){
      const frame=frameAtScroll(x,timeline);assert.ok(frame>=last && frame>=0 && frame<=LAST_FRAME);last=frame;
    }
    assert.equal(frameAtScroll(-100,timeline),0);
    assert.equal(frameAtScroll(timeline.length+100,timeline),896);
  });
  test(`door animation remains continuous between closed and open stops at scale ${scale}`,()=>{
    const closed=scrollAtFrame(423,timeline),open=scrollAtFrame(475,timeline);
    const frames=new Set();
    for(let x=closed;x<=open;x+=1)frames.add(Math.round(frameAtScroll(x,timeline)));
    for(let frame=423;frame<=475;frame++)assert.ok(frames.has(frame));
  });
}
test('the full-house final frame belongs to the exterior chapter',()=>assert.equal(chapterAtFrame(896),4));
