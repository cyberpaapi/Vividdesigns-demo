import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=process.cwd();
const files=['index.html','style.css','app.js','frame-store.js','timeline.js','favicon.svg'];
for(const variant of ['hd','mobile']){
  const dir=path.join(root,'media',variant);
  const manifest=JSON.parse(await fs.readFile(path.join(dir,'manifest.json'),'utf8'));
  assert.equal(manifest.frames,897);
  assert.equal(manifest.map.length,897);
  for(const pack of manifest.packs) assert.equal((await fs.stat(path.join(dir,pack.file))).size,pack.bytes);
  for(const [pack,offset,length] of manifest.images) assert.ok(offset>=0 && length>0 && offset+length<=manifest.packs[pack].bytes);
  for(const id of manifest.map) assert.ok(id>=0 && id<manifest.images.length);
  console.log(`${variant}: ${manifest.frames} timeline frames, ${manifest.images.length} images, ${(manifest.packs.reduce((s,p)=>s+p.bytes,0)/1e6).toFixed(1)} MB`);
}
await fs.mkdir('dist',{recursive:true});
for(const file of files) await fs.copyFile(file,path.join('dist',file));
await fs.cp('media','dist/media',{recursive:true});
await fs.writeFile('dist/.nojekyll','');
console.log('Static site validated and built in dist/');
