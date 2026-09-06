import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextPartBoundary, editedFrame, SOURCE_FRAMES, VIEWPOINTS, CHAPTERS, PART_BOUNDARIES } from '../timeline.js';
test('each camera pause is both a section and a swipe boundary, except the cabinet',()=>{
  assert.equal(CHAPTERS.length,15);
  assert.deepEqual(CHAPTERS.map(p=>p.frame),VIEWPOINTS.map(p=>p.frame));
  assert.deepEqual(PART_BOUNDARIES,VIEWPOINTS.map(p=>p.frame));
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
});
