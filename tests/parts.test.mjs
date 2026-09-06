import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextPartBoundary, editedFrame, SOURCE_FRAMES, VIEWPOINTS, CHAPTERS, PART_BOUNDARIES, chapterAtFrame } from '../timeline.js';
test('seven sections merge the requested groups through their final pauses',()=>{
  assert.equal(CHAPTERS.length,7);
  assert.deepEqual(PART_BOUNDARIES,[62,121,276,475,665,804,896].map(editedFrame));
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
  assert.equal(SOURCE_FRAMES[nextPartBoundary(0)],121);
  assert.equal(nextPartBoundary(editedFrame(370)),editedFrame(475));
  assert.equal(nextPartBoundary(editedFrame(423)),editedFrame(475));
  assert.equal(nextPartBoundary(0,-1),0);
  assert.equal(nextPartBoundary(PART_BOUNDARIES.at(-1)),PART_BOUNDARIES.at(-1));
  for(const [source,group] of [[152,2],[230,2],[309,3],[340,3],[370,3],[475,3],[541,4],[572,4],[665,4],[711,5],[804,5]]) assert.equal(chapterAtFrame(editedFrame(source)),group);
});
