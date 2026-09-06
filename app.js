import { FrameStore } from './frame-store.js';
import { SOURCE_FRAMES, LAST_FRAME, VIEWPOINTS, CHAPTERS, nextPartBoundary, createTimeline, frameAtScroll, scrollAtFrame, chapterAtFrame, viewpointAtFrame } from './timeline.js';

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
let alternate = false, playback = null, touch = null, wheelLast = 0, wheelDistance = 0, wheelUsed = false;

function modeLabels() {
  debug.alternate = alternate;
  debug.playing = Boolean(playback);
  const instruction = playback ? 'Playing · stops at next scene' : 'Swipe up to play the next scene';
  $('mode-help').textContent = alternate ? instruction : 'Turn your phone sideways for a wider view.';
  $('scroll-cue').firstElementChild.textContent = alternate
    ? (playback ? 'Playing scene' : 'Swipe to play')
    : (painted >= LAST_FRAME - 1 ? 'You have arrived' : 'Scroll to explore');
}

function playPart(direction = 1) {
  // Inputs received during a scene are consumed, never queued for the next one.
  if (!ready || !alternate || playback || document.hidden) return;
  const end = nextPartBoundary(current, direction);
  if (Math.abs(end - current) < 0.5) return;
  playback = { from: current, end, direction, started: performance.now(), hiddenAt: null };
  debug.partEnd = end;
  modeLabels();
  requestTick();
}

function setAlternate(enabled) {
  if (!ready) return;
  playback = null;
  current = Math.max(0, painted);
  alternate = enabled;
  touch = null;
  wheelDistance = 0;
  wheelUsed = false;
  wheelLast = 0;
  document.body.classList.toggle('alternate', enabled);
  $('alternate-play').setAttribute('aria-checked', String(enabled));
  window.scrollTo({ top: scrollAtFrame(current, timeline), behavior: 'instant' });
  previousTime = 0;
  modeLabels();
  requestTick();
}

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
  modeLabels();
}

function tick(time) {
  raf = 0;
  if (!ready || document.hidden) return;
  const dt = Math.min(0.04, previousTime ? (time - previousTime) / 1000 : 1 / 60);
  previousTime = time;
  if (alternate) {
    target = playback ? playback.from + playback.direction * (time - playback.started) * 0.03 : current;
    if (playback) target = playback.direction > 0 ? Math.min(target, playback.end) : Math.max(target, playback.end);
  } else target = frameAtScroll(window.scrollY, timeline);
  debug.target = target;
  const difference = target - current;
  const direction = Math.sign(difference) || 1;
  const easing = alternate || reduceMotion ? 1 : 1 - Math.exp(-dt / 0.055);
  const step = difference * easing;
  const proposed = Math.abs(difference) < 0.08 ? target : current + step;
  const wantedFrame = Math.max(0, Math.min(LAST_FRAME, Math.round(proposed)));
  store.focusOn(wantedFrame, direction);
  const bitmap = store.get(wantedFrame);
  if (bitmap) {
    current = proposed;
    if (painted !== wantedFrame || resizing) draw(wantedFrame, bitmap);
    if (alternate && playback && Math.abs(current - playback.end) < 0.01) {
      playback = null;
      window.scrollTo({ top: scrollAtFrame(current, timeline), behavior: 'instant' });
    }
    updateLabels(wantedFrame);
  } else {
    debug.stalls++;
    // Keep the last valid frame on screen while the next bitmap finishes decoding.
    store.ensure(wantedFrame).then(requestTick).catch(showError);
  }
  if (playback || Math.abs(target - current) > 0.08 || resizing) requestTick();
  else previousTime = 0;
}

function goToFrame(frame) {
  if (!ready) return;
  playback = null;
  if (alternate) { current = frame; resizing = true; }
  window.scrollTo({ top: scrollAtFrame(frame, timeline), behavior: 'instant' });
  requestTick();
}

function stepViewpoint(direction) {
  if (alternate) { playPart(direction); return; }
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
    // Both modes share the same edit; keep source packets unchanged and cached.
    manifest.map = SOURCE_FRAMES.map(frame => manifest.map[frame]);
    manifest.frames = SOURCE_FRAMES.length;
    manifest.duration = SOURCE_FRAMES.length / manifest.fps;
    debug.totalFrames = manifest.frames;
    debug.sourceFrame = frame => SOURCE_FRAMES[frame];
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
    $('alternate-play').disabled = false;
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
document.addEventListener('visibilitychange', () => {
  if (playback) {
    if (document.hidden) playback.hiddenAt = performance.now();
    else if (playback.hiddenAt !== null) { playback.started += performance.now() - playback.hiddenAt; playback.hiddenAt = null; }
  }
  previousTime = 0;
  requestTick();
});
$('alternate-play').addEventListener('click', () => setAlternate(!alternate));
const gestureSurface = document.querySelector('.film-shell');
const isControl = target => Boolean(target.closest('button,a,input'));
gestureSurface.addEventListener('touchstart', event => {
  touch = alternate && event.touches.length === 1 && !isControl(event.target)
    ? { x: event.touches[0].clientX, y: event.touches[0].clientY, blocked: Boolean(playback) } : null;
}, { passive: true });
gestureSurface.addEventListener('touchmove', event => {
  if (alternate && touch && event.touches.length === 1 && event.cancelable) event.preventDefault();
  if (event.touches.length !== 1) touch = null;
}, { passive: false });
gestureSurface.addEventListener('touchend', event => {
  const start = touch;
  touch = null;
  if (!alternate || !start || start.blocked || playback || !event.changedTouches.length) return;
  const dx = event.changedTouches[0].clientX - start.x;
  const dy = event.changedTouches[0].clientY - start.y;
  if (Math.abs(dy) >= 35 && Math.abs(dy) > Math.abs(dx) * 1.2) playPart(dy < 0 ? 1 : -1);
}, { passive: true });
gestureSurface.addEventListener('touchcancel', () => { touch = null; }, { passive: true });
window.addEventListener('wheel', event => {
  if (!alternate || event.ctrlKey || isControl(event.target)) return;
  if (event.cancelable) event.preventDefault();
  const now = performance.now();
  if (now - wheelLast > 250) { wheelDistance = 0; wheelUsed = false; }
  wheelLast = now;
  if (playback) { wheelUsed = true; return; }
  if (wheelUsed || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
  wheelDistance += event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
  if (Math.abs(wheelDistance) >= 35) { wheelUsed = true; playPart(wheelDistance > 0 ? 1 : -1); }
}, { passive: false });
new ResizeObserver(measure).observe($('stage'));
chapters.forEach(button => button.addEventListener('click', () => goToFrame(CHAPTERS[Number(button.dataset.chapter)].frame)));
$('previous').addEventListener('click', () => stepViewpoint(-1));
$('next').addEventListener('click', () => stepViewpoint(1));
$('seek').addEventListener('input', event => goToFrame(Number(event.target.value) / 1000 * LAST_FRAME));
$('retry').addEventListener('click', start);
document.querySelector('.brand').addEventListener('click', event => { event.preventDefault(); goToFrame(0); });
document.addEventListener('keydown', event => {
  if (['INPUT', 'BUTTON', 'A'].includes(document.activeElement?.tagName)) return;
  if (alternate && ['ArrowDown', 'PageDown', ' ', 'ArrowUp', 'PageUp'].includes(event.key)) {
    event.preventDefault();
    if (!event.repeat) playPart(['ArrowUp', 'PageUp'].includes(event.key) || (event.key === ' ' && event.shiftKey) ? -1 : 1);
    return;
  }
  if (event.key === 'ArrowRight') { event.preventDefault(); stepViewpoint(1); }
  if (event.key === 'ArrowLeft') { event.preventDefault(); stepViewpoint(-1); }
  if (event.key === 'Home') { event.preventDefault(); goToFrame(0); }
  if (event.key === 'End') { event.preventDefault(); goToFrame(LAST_FRAME); }
});
window.addEventListener('pagehide', () => { if (raf) cancelAnimationFrame(raf); });
window.addEventListener('pageshow', () => { previousTime = 0; requestTick(); });
setScrollHeight();
start();
