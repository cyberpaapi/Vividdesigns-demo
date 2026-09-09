# Walkthrough media — 9 September 2026

Replaced the kitchen approach, kitchen loop/hall, and stairs/office/exterior footage with the corrected 1080p Genjutsu results. The existing entrance look-up-left and reverse edit remains intact. At the entrance join, six previously trimmed approach frames are restored; the new clip shares the original ending frame and its opening framing is aligned, easing out during the forward motion. The door and staircase joins retain their short transitions. No additional video generation was used for these edits.

Playback uses 765 frames, 25.5 seconds, including the restored 0.2 seconds of approach. Desktop serves 1920×1080 frames; phones retain the optimized 960×540 delivery. Duplicate decoded video frames share assets. Versioned pack filenames and manifest requests avoid mixing cached old frames with the new footage.

Swipe destinations correspond to settled poses in the new clips. In particular, the wine-cellar view continues directly to the closed kitchen door; the next swipe plays the door opening. Hallway, landing, and office destinations have been aligned to the generated footage. Pauses are controlled by the website, with no added video hold frames.

Validation: timeline and frame-cache tests; complete forward/reverse destination checks on phone and desktop; real touch-input kitchen/door checks in both Experimental and Experiential; pack byte-range checks; 1080p MP4 decode verification.
