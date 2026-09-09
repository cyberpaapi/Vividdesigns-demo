import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextPartBoundary, editedFrame, SOURCE_FRAMES, VIEWPOINTS, CHAPTERS, PART_BOUNDARIES, chapterAtFrame } from '../timeline.js';
test('each settled viewpoint is a swipe destination in both directions',()=>{
  assert.equal(CHAPTERS.length,7);
  assert.deepEqual(PART_BOUNDARIES,[62,118,152,261,309,340,423,475,541,572,665,711,797,896].map(editedFrame));
  assert.deepEqual(PART_BOUNDARIES,VIEWPOINTS.map(p=>p.frame));
  assert.ok(VIEWPOINTS.slice(1).every(p=>p.dwell>0));
  for(let i=0;i<PART_BOUNDARIES.length-1;i++) {
    assert.equal(nextPartBoundary(PART_BOUNDARIES[i]),PART_BOUNDARIES[i+1]);
    assert.equal(nextPartBoundary(PART_BOUNDARIES[i+1],-1),PART_BOUNDARIES[i]);
  }
  assert.equal(SOURCE_FRAMES[nextPartBoundary(0)],118);
  assert.equal(nextPartBoundary(editedFrame(370)),editedFrame(423));
  assert.equal(nextPartBoundary(editedFrame(340)),editedFrame(423));
  assert.equal(nextPartBoundary(editedFrame(423),-1),editedFrame(340));
  assert.equal(nextPartBoundary(editedFrame(423)),editedFrame(475));
  assert.equal(nextPartBoundary(0,-1),0);
  assert.equal(nextPartBoundary(PART_BOUNDARIES.at(-1)),PART_BOUNDARIES.at(-1));
  for(const [source,group] of [[118,1],[119,2],[152,2],[261,2],[262,3],[309,3],[340,3],[370,3],[475,3],[541,4],[572,4],[665,4],[711,5],[797,5],[798,6]]) assert.equal(chapterAtFrame(editedFrame(source)),group);
});
test('the three corrected stops hand the very next retained frame to the next section',()=>{
  for(const [source,next] of [[118,152],[261,309],[797,896]]){
    const end=editedFrame(source);
    assert.equal(SOURCE_FRAMES[end],source);
    assert.equal(SOURCE_FRAMES[end+1],source+1);
    assert.equal(nextPartBoundary(end),editedFrame(next));
    assert.equal(nextPartBoundary(end+1),editedFrame(next));
  }
});
