// Edit existing frames only: arrive, look up-left, retrace that tilt, then
// match back to the settled forward view. Omit the upward-forward sweep.
// The original opening hold and six trailing scene-one frames stay removed.
const range = (from, to) => Array.from({length: Math.abs(to-from)+1}, (_, i) => from+i*Math.sign(to-from));
export const SOURCE_FRAMES = [
  ...range(62,152),
  ...range(151,118),
  ...range(257,270),
  ...range(277,896),
];
export const LAST_FRAME = SOURCE_FRAMES.length - 1;
export function editedFrame(source) {
  // For reused entrance frames, navigation refers to the first occurrence.
  const exact = SOURCE_FRAMES.indexOf(source);
  if (exact >= 0) return exact;
  if (source < 62) return 0;
  if (source > 896) return LAST_FRAME;
  return source < 257 ? SOURCE_FRAMES.indexOf(152) : SOURCE_FRAMES.indexOf(270);
}
// Navigation and one-swipe playback share the camera's approved pause points.
export function nextPartBoundary(frame, direction = 1) {
  return direction > 0
    ? (PART_BOUNDARIES.find(boundary => boundary > frame + 0.5) ?? LAST_FRAME)
    : ([...PART_BOUNDARIES].reverse().find(boundary => boundary < frame - 0.5) ?? 0);
}
// Anchors sit inside the settled camera pose, after incoming easing and before
// the next move accelerates. Source-frame inspection: 118, 261 and 797.
// Keep broad section names, but stop swipe playback at every settled viewpoint.
export const CHAPTERS = [
  { frame: 62, label: 'Arrival' },
  { frame: 118, label: 'Entrance' },
  { frame: 261, label: 'Foyer' },
  { frame: 475, label: 'Living & kitchen' },
  { frame: 665, label: 'Kitchen to stairs' },
  { frame: 797, label: 'Landing & office' },
  { frame: 896, label: 'Exterior' },
].map(point => ({ ...point, frame: editedFrame(point.frame) }));
export const VIEWPOINTS = [
  { frame: 62, label: 'The arrival', nav: 'Arrival', dwell: 0 },
  { frame: 118, label: 'The entrance', nav: 'Entrance', dwell: 170 },
  { frame: 152, label: 'A view above', nav: 'Above', dwell: 140 },
  { frame: 261, label: 'The foyer', nav: 'Foyer', dwell: 190 },
  { frame: 309, label: 'The living room', nav: 'Living', dwell: 160 },
  { frame: 340, label: 'The wine cellar', nav: 'Wine cellar', dwell: 300 },
  { frame: 423, label: 'At the kitchen door', nav: 'Kitchen door', dwell: 180 },
  { frame: 475, label: 'Beyond the kitchen', nav: 'Door reveal', dwell: 260 },
  { frame: 541, label: 'Around the kitchen', nav: 'Kitchen loop', dwell: 240 },
  { frame: 572, label: 'The return hall', nav: 'Hall', dwell: 150 },
  { frame: 665, label: 'The staircase', nav: 'Stairs', dwell: 190 },
  { frame: 711, label: 'The landing', nav: 'Landing', dwell: 180 },
  { frame: 797, label: 'The office', nav: 'Office', dwell: 320 },
  { frame: 896, label: 'The whole picture', nav: 'Exterior', dwell: 450 },
].map(point => ({ ...point, frame: editedFrame(point.frame) }));
export const PART_BOUNDARIES = VIEWPOINTS.map(point => point.frame);

export function createTimeline(pixelsPerFrame = 17) {
  const segments = [];
  let position = 0;
  for (let i = 0; i < VIEWPOINTS.length; i++) {
    const point = VIEWPOINTS[i];
    // Keep stationary poses as scroll plateaus, not a timed auto-play action.
    if (point.dwell > 0) segments.push({ start: position, end: position + point.dwell, from: point.frame, to: point.frame });
    position += point.dwell;
    if (i < VIEWPOINTS.length - 1) {
      const next = VIEWPOINTS[i + 1];
      const from = point.frame;
      const distance = (next.frame - from) * pixelsPerFrame;
      segments.push({ start: position, end: position + distance, from, to: next.frame });
      position += distance;
    }
  }
  return { segments, length: position };
}

export function frameAtScroll(scroll, timeline) {
  const x = Math.max(0, Math.min(timeline.length, scroll));
  const segment = timeline.segments.find(s => x <= s.end) ?? timeline.segments.at(-1);
  const fraction = Math.max(0, Math.min(1, (x - segment.start) / (segment.end - segment.start)));
  return segment.from + (segment.to - segment.from) * fraction;
}

export function scrollAtFrame(frame, timeline) {
  const hold = timeline.segments.find(s => s.from === frame && s.to === frame);
  if (hold) return (hold.start + hold.end) / 2;
  const segment = timeline.segments.find(s => s.from <= frame && s.to >= frame);
  return segment ? segment.start + (frame - segment.from) / (segment.to - segment.from) * (segment.end - segment.start) : 0;
}

export function chapterAtFrame(frame) {
  // Mark the group currently being traversed; its anchor is its final pause.
  const index = CHAPTERS.findIndex(point => frame <= point.frame);
  return index < 0 ? CHAPTERS.length - 1 : index;
}

export function viewpointAtFrame(frame) {
  return VIEWPOINTS.reduce((selected, point) => frame >= point.frame - 1 ? point : selected, VIEWPOINTS[0]);
}
