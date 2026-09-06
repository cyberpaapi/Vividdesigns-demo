import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createTimeline,frameAtScroll,scrollAtFrame,VIEWPOINTS,LAST_FRAME,chapterAtFrame,editedFrame,SOURCE_FRAMES} from '../timeline.js';
for(const scale of [12,17]){
  const timeline=createTimeline(scale);
  test(`every approved viewpoint holds in both scroll directions at scale ${scale}`,()=>{
    for(const stop of VIEWPOINTS.filter(point=>point.dwell>0)){
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
    assert.equal(frameAtScroll(timeline.length+100,timeline),LAST_FRAME);
  });
  test(`door animation remains continuous between closed and open stops at scale ${scale}`,()=>{
    const closed=scrollAtFrame(editedFrame(423),timeline),open=scrollAtFrame(editedFrame(475),timeline);
    const frames=new Set();
    for(let x=closed;x<=open;x+=1)frames.add(Math.round(frameAtScroll(x,timeline)));
    for(let frame=editedFrame(423);frame<=editedFrame(475);frame++)assert.ok(frames.has(frame));
  });
}
test('the full-house final frame belongs to the exterior chapter',()=>assert.equal(chapterAtFrame(LAST_FRAME),4));
test('both trims exclude only the intended source frames and start scrolling immediately',()=>{
  assert.equal(SOURCE_FRAMES.length,829);
  assert.equal(SOURCE_FRAMES[0],62);
  assert.equal(SOURCE_FRAMES[208],270);
  assert.equal(SOURCE_FRAMES[209],277);
  assert.equal(SOURCE_FRAMES.at(-1),896);
  assert.ok(frameAtScroll(17,createTimeline())>0);
  assert.ok(SOURCE_FRAMES.every(f=>f>=62 && (f<=270 || f>=277)));
});
