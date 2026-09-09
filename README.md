# Mashini — Vivid Designs

The homepage now offers **Experimental** and **Experiential** tabs, both with the
approved video hero. Experimental contains ten interactive image sections.
Experiential contains eight sections about VR, AI-assisted design and client
feedback, including a wireframe living-room model and material sculpture.
The former standalone walkthrough is retained at `legacy.html`.

The room starts with 3D exploration enabled; Done restores scrolling on its canvas.
The 3D viewers load near their sections and pause off-screen. Runtime dependencies,
images and geometry are bundled locally. Warmth / Light / Calm are illustrative
visual effects; the design choices show prepared examples rather than calling an AI
service. The chapter labels and bars are hidden in both homepage tabs.

Use `?style=experimental` or `?style=experiential` to open either tab directly.
`scripts/experiences-check.cjs` checks the built or published site using Playwright;
set CHECK_BASE to the deployed repository URL and PLAYWRIGHT_PATH if needed.

A static, natural-scroll architectural walkthrough, published with GitHub Pages.

The approved 29.9-second film supplies the WebP frames. The website's current edit
uses 759 existing frames (25.3 seconds of motion at 30 fps): the opening hold and
six trailing frames of scene one remain removed. At the entrance, source frames
118–152 look up-left, then 151–118 play in reverse to return to the original view.
Frame 257 resumes the settled forward view; the upward-forward sweep is omitted.
All footage from source frame 277 onward retains its existing order and timing.
The original video and frame packets remain unchanged. No new video or generated
frames are created by this edit.

One-gesture playback is the default. Each swipe plays to the next settled camera
viewpoint and waits there for the next gesture. The 14 destinations are Entrance,
Above, Foyer, Living, Wine cellar, Kitchen, Kitchen door, Door reveal, Kitchen loop,
Hall, Stairs, Landing, Office, and Exterior. These are website viewport stops,
not extra timed holds inserted into the video. Seven broad chapter names remain
internal; their labels and bars stay hidden. The door opening plays continuously
between its closed and open endpoints.

Swipe down reverses to the preceding viewpoint. Inputs during playback are
consumed, not queued. Arrow buttons and keyboard controls also work. The top-right
Scroll mode switch enables continuous scrubbing; turning it off restores step
playback at the current position. Playback pauses while the page is hidden.
Both modes use the same frame edit, without generating or downloading a new video.
`scripts/hero-stops-check.cjs` checks the entrance playback and each destination
in both directions at phone and desktop sizes.

The Fullscreen button beside Scroll mode expands the film and hides the navigation.
Both playback modes remain available, with a visible exit button. Native browser
fullscreen is used when supported; restricted browsers use an expanded viewport
fallback, which cannot hide the browser's own address bar. Escape exits the fallback,
and native fullscreen exit events keep the button state synchronized.

## Playback

- Desktop uses 1920 × 1080 images. Smaller or memory-constrained devices use 960 × 540.
- Compressed frames download before interaction is unlocked, so scrubbing needs no additional requests.
- Frame packets reduce hundreds of HTTP requests to 29 per quality level.
- A bounded, directional decoded-image cache releases old ImageBitmaps.
- The entrance, living room, kitchen turn, wine cellar, door reveal, kitchen loop,
  staircase, landing, office and final exterior retain deliberate scroll plateaus.
- The complete source framing is fitted to the display; the final house and garages are not cropped.
- Native scrolling is preserved. A short 55ms response filter softens discrete mouse-wheel input;
  reduced-motion preferences bypass that filter. Default viewpoint playback starts only after an explicit gesture.

Run `npm run dev` for a local preview, `npm test` for timeline checks, and `npm run build`
to validate frame packs and produce `dist/`. No dependency installation is needed.

Gather, Discover, and Retreat expand automatically as their headings enter the viewport.
Each reveal reserves its expanded height, keeping subsequent sections stable while it opens.
The Experimental perspective cube has six photographic faces, including bedroom and courtyard
on its top and bottom. It supports touch/mouse rotation and tilt, release momentum,
six room presets, and Reset view. Dragging outside the cube preserves page scrolling. Arrow keys
rotate a focused cube; Home resets it. Reduced motion disables momentum and snap animation.
`scripts/cube-check.cjs` checks these interactions with Playwright at phone and desktop sizes.

The `main` workflow publishes `dist/` to GitHub Pages. Frame media is stored in this repository,
so the live site does not depend on Higgsfield or on the laptop being online.

The motion and scene transitions are from the approved generated film. Scroll presentation does
not remove any visual inconsistencies already in that film. Playback performance also depends
on the viewer's device; first-load time depends on their connection.
