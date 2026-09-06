import { FrameStore } from './frame-store.js';
import { LAST_FRAME, VIEWPOINTS, CHAPTERS, createTimeline, frameAtScroll, scrollAtFrame, chapterAtFrame, viewpointAtFrame } from './timeline.js';

const $ = id => document.getElementById(id);
const canvas = $('film');
const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const timeline = createTimeline(matchMedia('(pointer: coarse)').matches ? 12 : 17);
const chapters = [...document.querySelectorAll('[data-chapter]')];
const debug = { ready: false, frame: 0, target: 0, drawCount: 0, drawMilliseconds: [], stalls: 0, errors: [] };
window.__walkthroughDebug = debug;
let store, manifest, ready = false, current = 0, painted = -1, target = 0;
let raf = 0, previousTime = 0, lastChapter = -1, caption = '', resizing = true, controller;

function setScrollHeight() {
  $('scroll-space').style.height = `${timeline.length + window.innerHeight}px`;
}

function measure() {
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(devicePixelRatio || 1, 2);
  // Native source resolution is the ceiling; do not allocate a 4K canvas for 1080p frames.
  const scale = Math.min(ratio, 1920 / Math.max(rect.width, 1), 1080 / Math.max(rect.height, 1));
  canvas.width = Math.max(1, Math.round(rect.width * scale));
  canvas.height = Math.max(1, Math.round(rect.height * scale));
  ctx.fillStyle = '#111311';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  resizing = true;
  setScrollHeight();
  requestTick();
}

function requestTick() {
  if (ready && !raf && !document.hidden) raf = requestAnimationFrame(tick);
}

function draw(frame, bitmap) {
  const started = performance.now();
  const scale = Math.min(canvas.width / bitmap.width, canvas.height / bitmap.height);
  const width = bitmap.width * scale, height = bitmap.height * scale;
  ctx.drawImage(bitmap, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
  painted = frame;
  store.pin(frame);
  resizing = false;
  debug.frame = frame;
  debug.drawCount++;
  debug.drawMilliseconds.push(performance.now() - started);
  if (debug.drawMilliseconds.length > 600) debug.drawMilliseconds.shift();
}

function updateLabels(frame) {
  const chapter = chapterAtFrame(frame);
  if (chapter !== lastChapter) {
    chapters.forEach((button, index) => index === chapter ? button.setAttribute('aria-current', 'step') : button.removeAttribute('aria-current'));
    $('scene-number').textContent = `0${chapter + 1} / 05`;
    lastChapter = chapter;
  }
  const point = viewpointAtFrame(frame);
  if (point.label !== caption) { $('scene-name').textContent = point.label; caption = point.label; }
  $('previous').disabled = frame < 1;
  $('next').disabled = frame >= LAST_FRAME - 1;
  $('seek').value = String(Math.round(frame / LAST_FRAME * 1000));
  $('seek').setAttribute('aria-valuetext', `${point.label}, ${Math.round(frame / LAST_FRAME * 100)} percent`);
  $('tour-progress-fill').style.transform = `scaleX(${frame / LAST_FRAME})`;
  $('scroll-cue').firstElementChild.textContent = frame >= LAST_FRAME - 1 ? 'You have arrived' : 'Scroll to explore';
}

function tick(time) {
  raf = 0;
  if (!ready || document.hidden) return;
  const dt = Math.min(0.04, previousTime ? (time - previousTime) / 1000 : 1 / 60);
  previousTime = time;
  target = frameAtScroll(window.scrollY, timeline);
  debug.target = target;
  const difference = target - current;
  const direction = Math.sign(difference) || 1;
  const easing = reduceMotion ? 1 : 1 - Math.exp(-dt / 0.055);
  const step = difference * easing;
  const proposed = Math.abs(difference) < 0.08 ? target : current + step;
  const wantedFrame = Math.max(0, Math.min(LAST_FRAME, Math.round(proposed)));
  store.focusOn(wantedFrame, direction);
  const bitmap = store.get(wantedFrame);
  if (bitmap) {
    current = proposed;
    if (painted !== wantedFrame || resizing) draw(wantedFrame, bitmap);
    updateLabels(wantedFrame);
  } else {
    debug.stalls++;
    // Keep the last valid frame on screen while the next bitmap finishes decoding.
    store.ensure(wantedFrame).then(requestTick).catch(showError);
  }
  if (Math.abs(target - current) > 0.08 || resizing) requestTick();
  else previousTime = 0;
}

function goToFrame(frame) {
  if (!ready) return;
  window.scrollTo({ top: scrollAtFrame(frame, timeline), behavior: 'instant' });
  requestTick();
}

function stepViewpoint(direction) {
  const source = frameAtScroll(scrollY, timeline);
  const point = direction > 0 ? VIEWPOINTS.find(p => p.frame > source + 1) : [...VIEWPOINTS].reverse().find(p => p.frame < source - 1);
  goToFrame(point?.frame ?? (direction > 0 ? LAST_FRAME : 0));
}

function showError(error) {
  debug.errors.push(String(error));
  ready = false;
  document.body.classList.remove('ready');
  document.body.classList.add('loading');
  $('load-title').textContent = 'Let’s try that again.';
  $('load-copy').textContent = 'The walkthrough could not finish loading. Check your connection and retry.';
  $('retry').hidden = false;
}

async function start() {
  controller?.abort();
  controller = new AbortController();
  store?.destroy();
  $('retry').hidden = true;
  $('load-title').textContent = 'A home, at your pace.';
  $('load-copy').innerHTML = 'Preparing your walkthrough <span id="load-percent">0%</span>';
  try {
    const mobile = innerWidth < 1000 || (navigator.deviceMemory && navigator.deviceMemory < 4) || navigator.connection?.saveData;
    const variant = mobile ? 'mobile' : 'hd';
    debug.quality = variant;
    const base = new URL(`./media/${variant}`, location.href).pathname.replace(/\/$/, '');
    const response = await fetch(`${base}/manifest.json`, { signal: controller.signal });
    if (!response.ok) throw new Error('The walkthrough is temporarily unavailable.');
    manifest = await response.json();
    store = new FrameStore(manifest, base, { limit: mobile ? 32 : 26, concurrency: 3, onAvailable: requestTick });
    await store.load(fraction => {
      const percent = Math.min(99, Math.round(fraction * 100));
      $('load-percent').textContent = `${percent}%`;
      $('load-fill').style.transform = `scaleX(${fraction})`;
      $('load-progress').setAttribute('aria-valuenow', String(percent));
    }, controller.signal);
    current = frameAtScroll(scrollY, timeline);
    store.focusOn(current);
    await Promise.all(Array.from({ length: 12 }, (_, i) => store.ensure(Math.round(current) + i)));
    ready = true;
    debug.ready = true;
    debug.loadedBytes = manifest.packs.reduce((sum, p) => sum + p.bytes, 0);
    debug.cacheStats = () => ({ decoded: store.cache.size, maxDecoded: store.maxCache, limit: store.limit, active: store.active, errors: store.decodeErrors });
    document.body.classList.remove('loading');
    document.body.classList.add('ready');
    $('load-progress').setAttribute('aria-valuenow', '100');
    measure();
    requestTick();
  } catch (error) { if (!controller.signal.aborted) showError(error); }
}

window.addEventListener('scroll', requestTick, { passive: true });
window.addEventListener('resize', measure, { passive: true });
document.addEventListener('visibilitychange', () => { previousTime = 0; requestTick(); });
new ResizeObserver(measure).observe($('stage'));
chapters.forEach(button => button.addEventListener('click', () => goToFrame(CHAPTERS[Number(button.dataset.chapter)].frame)));
$('previous').addEventListener('click', () => stepViewpoint(-1));
$('next').addEventListener('click', () => stepViewpoint(1));
$('seek').addEventListener('input', event => goToFrame(Number(event.target.value) / 1000 * LAST_FRAME));
$('retry').addEventListener('click', start);
document.querySelector('.brand').addEventListener('click', event => { event.preventDefault(); goToFrame(0); });
document.addEventListener('keydown', event => {
  if (['INPUT', 'BUTTON', 'A'].includes(document.activeElement?.tagName)) return;
  if (event.key === 'ArrowRight') { event.preventDefault(); stepViewpoint(1); }
  if (event.key === 'ArrowLeft') { event.preventDefault(); stepViewpoint(-1); }
  if (event.key === 'Home') { event.preventDefault(); goToFrame(0); }
  if (event.key === 'End') { event.preventDefault(); goToFrame(LAST_FRAME); }
});
window.addEventListener('pagehide', () => { if (raf) cancelAnimationFrame(raf); });
window.addEventListener('pageshow', () => { previousTime = 0; requestTick(); });
setScrollHeight();
start();
