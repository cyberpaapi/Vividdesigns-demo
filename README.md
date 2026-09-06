# Mashini — Vivid Designs

A static, natural-scroll architectural walkthrough, published with GitHub Pages.

The approved 29.9-second film is represented by 897 WebP frames. Wheel, touch,
trackpad, keyboard, and the accessible timeline all control the same position.
Scrolling backward reverses the walkthrough. There is no autoplay, wheel-event
interception, third-party runtime, or video seeking in the playback path.

## Playback

- Desktop uses 1920 × 1080 images. Smaller or memory-constrained devices use 960 × 540.
- Compressed frames download before interaction is unlocked, so scrubbing needs no additional requests.
- Frame packets reduce hundreds of HTTP requests to 29 per quality level.
- A bounded, directional decoded-image cache releases old ImageBitmaps.
- The entrance, living room, kitchen turn, wine cellar, door reveal, kitchen loop,
  staircase, landing, office and final exterior retain deliberate scroll plateaus.
- The complete source framing is fitted to the display; the final house and garages are not cropped.
- Native scrolling is preserved. A short 55ms response filter softens discrete mouse-wheel input;
  reduced-motion preferences bypass that filter. There is no timed scene playback.

Run `npm run dev` for a local preview, `npm test` for timeline checks, and `npm run build`
to validate frame packs and produce `dist/`. No dependency installation is needed.

The `main` workflow publishes `dist/` to GitHub Pages. Frame media is stored in this repository,
so the live site does not depend on Higgsfield or on the laptop being online.

The motion and scene transitions are from the approved generated film. Scroll presentation does
not remove any visual inconsistencies already in that film. Playback performance also depends
on the viewer's device; first-load time depends on their connection.
