import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextPartBoundary, editedFrame, SOURCE_FRAMES, VIEWPOINTS, CHAPTERS, PART_BOUNDARIES, chapterAtFrame } from '../timeline.js';
test('seven sections merge the requested groups through their final pauses',()=>{
  assert.equal(CHAPTERS.length,7);
  assert.deepEqual(PART_BOUNDARIES,[62,118,261,475,665,797,896].map(editedFrame));
  assert.deepEqual(PART_BOUNDARIES,CHAPTERS.map(p=>p.frame));
  for(const source of [152,230,309,340,370,541,572,711]) {
    assert.ok(!PART_BOUNDARIES.includes(editedFrame(source)));
    assert.equal(VIEWPOINTS.find(p=>p.frame===editedFrame(source)).dwell,0);
  }
  assert.ok(!PART_BOUNDARIES.includes(editedFrame(423)));
  for(let i=0;i<PART_BOUNDARIES.length-1;i++) {
    assert.equal(nextPartBoundary(PART_BOUNDARIES[i]),PART_BOUNDARIES[i+1]);
    assert.equal(nextPartBoundary(PART_BOUNDARIES[i+1],-1),PART_BOUNDARIES[i]);
  }
  assert.equal(SOURCE_FRAMES[nextPartBoundary(0)],118);
  assert.equal(nextPartBoundary(editedFrame(370)),editedFrame(475));
  assert.equal(nextPartBoundary(editedFrame(423)),editedFrame(475));
  assert.equal(nextPartBoundary(0,-1),0);
  assert.equal(nextPartBoundary(PART_BOUNDARIES.at(-1)),PART_BOUNDARIES.at(-1));
  for(const [source,group] of [[118,1],[119,2],[152,2],[230,2],[261,2],[262,3],[309,3],[340,3],[370,3],[475,3],[541,4],[572,4],[665,4],[711,5],[797,5],[798,6]]) assert.equal(chapterAtFrame(editedFrame(source)),group);
});
test('the three corrected stops hand the very next retained frame to the next section',()=>{
  for(const [source,next] of [[118,261],[261,475],[797,896]]){
    const end=editedFrame(source);
    assert.equal(SOURCE_FRAMES[end],source);
    assert.equal(SOURCE_FRAMES[end+1],source+1);
    assert.equal(nextPartBoundary(end),editedFrame(next));
    assert.equal(nextPartBoundary(end+1),editedFrame(next));
  }
});
