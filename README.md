# Mashini — Vivid Designs

A static, natural-scroll architectural walkthrough, published with GitHub Pages.

The approved 29.9-second film supplies the WebP frames. The current edit uses 829
frames (27.63 seconds): the opening 62-frame hold and six trailing frames of scene
one are excluded. The first scene stops on source frame 270, before the cut into
scene two. The source packets remain unchanged so existing browser caches work.
Both playback modes use the same edited frame map. Wheel, touch,
trackpad, keyboard, and the accessible timeline all control the same position.
Scrolling backward reverses the walkthrough. There is no third-party runtime or
video seeking in the playback path. Free-scroll mode does not intercept gestures.

One-gesture playback is the default. The top-right Scroll mode switch enables
free scrolling when turned on and returns to one-gesture playback when turned off.
In the default mode, swipe up or
scroll down to play the next section at 30 frames per second. Seven sections group
the viewpoints: Arrival; Entrance; Above / Chandelier / Foyer; Living / Kitchen /
Wine cellar / Door reveal; Kitchen loop / Hall / Stairs; Landing / Office; Exterior.
Each group plays continuously to its last pause; intermediate views remain in the
film without requiring another swipe or extra scroll dwell.
Entrance, Foyer, and Landing & Office now stop at source frames 112, 252, and 788,
before the following motion begins. Their following frames belong to the next
section; this boundary correction removes no additional frames from the film.
The closed kitchen-cabinet stop is excluded, keeping approach and door opening
together. Swipe down to reverse to the previous pause. Inputs
during playback are consumed, not queued. The arrow buttons and keyboard also work.
Enabling Scroll mode stops playback and restores natural scrolling at the current position.
Playback pauses while the page is hidden. This mode has no extra media downloads.

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

The `main` workflow publishes `dist/` to GitHub Pages. Frame media is stored in this repository,
so the live site does not depend on Higgsfield or on the laptop being online.

The motion and scene transitions are from the approved generated film. Scroll presentation does
not remove any visual inconsistencies already in that film. Playback performance also depends
on the viewer's device; first-load time depends on their connection.
