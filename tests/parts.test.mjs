import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextPartBoundary } from '../timeline.js';
test('alternate mode follows four original scene cuts and resumes mid-scene',()=>{
  for(const [frame,direction,end] of [[0,1,277],[121,1,277],[277,1,480],[423,1,480],[480,1,666],[666,1,896],[896,1,896],[480,-1,277],[400,-1,277],[0,-1,0]]) assert.equal(nextPartBoundary(frame,direction),end);
});
