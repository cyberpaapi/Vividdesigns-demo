# Native Squarespace walkthrough

Use `Squarespace-Native.html` in an HTML Code Block on `/virtual`, with Display Source disabled. This inserts a native custom element, not an iframe. It contains only the walkthrough, previous/next arrows and its short swipe hint. The existing media and viewpoint pauses are reused.

In the Squarespace editor, give this section full width and remove its section/block padding. Keep or remove the site's header/footer through the page settings as the client prefers. If keeping a header, adjust `--walkthrough-height` to subtract its measured height, for example `calc(100svh - 80px)`. Verify on both desktop and phone; do not assume the header has the same height on both.

The plan must allow custom JavaScript (Core or higher on current plans; applicable legacy plans also support it). If scripts do not run inside the editor, check the saved page outside edit mode. The script may alternatively be placed in the page's code injection field; keep the custom element in the Code Block.

Styles are isolated inside the element. Wheel and touch navigation are handled only inside the player, leaving the site's other navigation and page controls alone. GitHub Pages continues to serve the player code and frame files; the visitor stays on the Squarespace URL. Removing the Code Block removes the integration.

Prepared and tested separately from the client's Squarespace page. Final section sizing, header/footer settings, and the client's JavaScript plan availability must be checked in their editor.
