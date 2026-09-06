import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextPartBoundary, editedFrame, SOURCE_FRAMES } from '../timeline.js';
test('alternate mode follows four original scene cuts and resumes mid-scene',()=>{
  for(const [frame,direction,end] of [[62,1,270],[121,1,270],[270,1,480],[423,1,480],[480,1,666],[666,1,896],[896,1,896],[480,-1,270],[400,-1,270],[62,-1,62]]) assert.equal(nextPartBoundary(editedFrame(frame),direction),editedFrame(end));
  assert.equal(SOURCE_FRAMES[nextPartBoundary(0)],270);
});
