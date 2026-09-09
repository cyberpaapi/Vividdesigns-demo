import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextPartBoundary, editedFrame, SOURCE_FRAMES, VIEWPOINTS, CHAPTERS, PART_BOUNDARIES, chapterAtFrame } from '../timeline.js';
test('each settled viewpoint is a swipe destination in both directions',()=>{
  assert.equal(CHAPTERS.length,7);
  assert.deepEqual(PART_BOUNDARIES,[62,118,152,261,308,338,413,475,541,578,665,712,799,896].map(editedFrame));
  assert.deepEqual(PART_BOUNDARIES,VIEWPOINTS.map(p=>p.frame));
  assert.ok(VIEWPOINTS.slice(1).every(p=>p.dwell>0));
  for(let i=0;i<PART_BOUNDARIES.length-1;i++) {
    assert.equal(nextPartBoundary(PART_BOUNDARIES[i]),PART_BOUNDARIES[i+1]);
    assert.equal(nextPartBoundary(PART_BOUNDARIES[i+1],-1),PART_BOUNDARIES[i]);
  }
  assert.equal(SOURCE_FRAMES[nextPartBoundary(0)],118);
  assert.equal(nextPartBoundary(editedFrame(370)),editedFrame(413));
  assert.equal(nextPartBoundary(editedFrame(338)),editedFrame(413));
  assert.equal(nextPartBoundary(editedFrame(413),-1),editedFrame(338));
  assert.equal(nextPartBoundary(editedFrame(413)),editedFrame(475));
  assert.equal(nextPartBoundary(0,-1),0);
  assert.equal(nextPartBoundary(PART_BOUNDARIES.at(-1)),PART_BOUNDARIES.at(-1));
  for(const [source,group] of [[118,1],[119,2],[152,2],[261,2],[262,3],[308,3],[338,3],[370,3],[475,3],[541,4],[578,4],[665,4],[712,5],[799,5],[800,6]]) assert.equal(chapterAtFrame(editedFrame(source)),group);
});
test('the three corrected stops hand the very next retained frame to the next section',()=>{
  for(const [source,next] of [[118,152],[261,308],[799,896]]){
    const end=editedFrame(source);
    assert.equal(SOURCE_FRAMES[end],source);
    assert.equal(SOURCE_FRAMES[end+1],source+1);
    assert.equal(nextPartBoundary(end),editedFrame(next));
    assert.equal(nextPartBoundary(end+1),editedFrame(next));
  }
});
