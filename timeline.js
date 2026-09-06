// Non-destructive edit of the approved 897-frame master: remove the opening
// hold (0..61) and six trailing frames of scene one (271..276).
export const SOURCE_FRAMES = Array.from({ length: 897 }, (_, frame) => frame)
  .filter(frame => frame >= 62 && (frame <= 270 || frame >= 277));
export const LAST_FRAME = SOURCE_FRAMES.length - 1;
export function editedFrame(source) {
  if (source < 62) return 0;
  if (source <= 270) return source - 62;
  if (source < 277) return 208;
  return source - 68;
}
// Boundaries of the four stitched scenes, not the smaller scroll viewpoints.
// Scene one stops on its own last retained frame, never on scene two's first.
export const PART_BOUNDARIES = [0, editedFrame(270), editedFrame(480), editedFrame(666), LAST_FRAME];
export function nextPartBoundary(frame, direction = 1) {
  return direction > 0
    ? (PART_BOUNDARIES.find(boundary => boundary > frame + 0.5) ?? LAST_FRAME)
    : ([...PART_BOUNDARIES].reverse().find(boundary => boundary < frame - 0.5) ?? 0);
}
export const VIEWPOINTS = [
  { frame: 62, label: 'The arrival', dwell: 0 },
  { frame: 121, label: 'The entrance', dwell: 170 },
  { frame: 152, label: 'A view above', dwell: 140 },
  { frame: 230, label: 'The chandelier', dwell: 140 },
  { frame: 276, label: 'The living room', dwell: 190 },
  { frame: 309, label: 'The living room', dwell: 160 },
  { frame: 340, label: 'The kitchen', dwell: 240 },
  { frame: 370, label: 'The wine cellar', dwell: 300 },
  { frame: 423, label: 'A door unfolds', dwell: 190 },
  { frame: 475, label: 'Beyond the kitchen', dwell: 260 },
  { frame: 541, label: 'Around the kitchen', dwell: 240 },
  { frame: 572, label: 'The return hall', dwell: 150 },
  { frame: 665, label: 'The staircase', dwell: 190 },
  { frame: 711, label: 'The landing', dwell: 180 },
  { frame: 804, label: 'The office', dwell: 320 },
  { frame: 896, label: 'The whole picture', dwell: 450 },
].map(point => ({ ...point, frame: editedFrame(point.frame) }));
export const CHAPTERS = [
  { frame: 0, label: 'Arrival' }, { frame: 276, label: 'Living' },
  { frame: 340, label: 'Kitchen' }, { frame: 711, label: 'Office' },
  { frame: 896, label: 'Exterior' },
].map(point => ({ ...point, frame: editedFrame(point.frame) }));

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
  let result = 0;
  for (let i = 0; i < CHAPTERS.length; i++) if (frame >= CHAPTERS[i].frame - 1) result = i;
  return result;
}

export function viewpointAtFrame(frame) {
  return VIEWPOINTS.reduce((selected, point) => frame >= point.frame - 1 ? point : selected, VIEWPOINTS[0]);
}
