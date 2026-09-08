# Becoming

A slow, interactive 3D study of two ways to order the five Platonic solids.

Open **index.html** in a modern browser. No installation, build, server, network
connection, or external libraries are required.

## Live site and deployment

Visit **[revodavid.github.io/becoming](https://revodavid.github.io/becoming/)**.

GitHub Pages automatically publishes the repository root after each push to
`main`. The repository's **Settings > Pages** uses **Deploy from a branch** with
`main` and `/ (root)` as the source. The `.nojekyll` file disables Jekyll processing,
so the HTML, CSS, and JavaScript are published directly without a build step.

To publish an update, commit the changes and run `git push origin main`.
Deployment progress is available in the repository's Actions tab.

## The journey

The single-row timeline has one shared **point at its center**, with the
icosahedron at the far left and the dodecahedron at the far right.

**To the right, increasing vertices:** point (1) -> line (2) -> triangle (3) ->
tetrahedron (4) -> octahedron (6) -> cube (8) -> icosahedron (12) -> dodecahedron (20).

**To the left, increasing faces:** point -> line -> triangle -> tetrahedron (4) -> cube (6) ->
octahedron (8) -> dodecahedron (12) -> icosahedron (20).

On page load, playback begins at the center point and travels right. At the
dodecahedron it reverses, retraces the vertex path to the point, then continues
left along the face path to the icosahedron. It reverses there and repeats
continuously. Endpoint viewing pauses are shared across each bounce rather than
doubled. Passing through the origin never restarts the loop or skips a path.

Vertex counts appear on the right and face counts on the left. The point and line
have no faces; the triangle has one planar face before the solids begin. On narrow
screens, the timeline stays on one row and scrolls horizontally, following the
active shape. The center point is initially centered in the visible area.
Both path headings and their arrows reflect the current travel direction: moving
left decreases vertices on the right-hand path and increases faces on the left;
moving right does the opposite.

When gaining vertices, new points appear at existing edge midpoints before all
vertices move into position. The initial point-to-line duplication is the only
exception, since there is not yet an edge. If more new points are needed than
there are edges, previously bisected segments are bisected again. Each such point
still begins halfway between two vertices already present.

When losing vertices, highlighted vertices converge on existing surviving
vertices, then disappear only after they coincide. Surviving vertices move
smoothly too. Each removed vertex follows a nearby survivor, never an edge
midpoint. The line's two endpoints finally coincide as a point.
The face-count path includes merging as well as growth: more faces need not
mean more vertices.

Each transition has a point-introduction or highlighting pause, a slow morph,
and a generous viewing pause. Merging has an additional settling interval at the
receiving vertices. The top-right status badge names the displayed shape during
viewing pauses. Intermediate surfaces are convex hulls of the moving vertices; they
are not themselves Platonic solids. The wireframe blends only the source and
destination edges, never temporary hull triangulation diagonals. Final faces
are actual polygons. Original edges fade early during growth, and late during
merging so changes in connectivity remain readable.
The timeline highlight and left-hand description and statistics stay with the
last completed shape during introductions, morphs, and merges. They switch only
when the next shape is complete, including after a mid-transition reversal.
The Platonic solids have fixed Roman numerals in increasing face-count order:
tetrahedron I, cube II, octahedron III, dodecahedron IV, and icosahedron V.
Captions and highlights follow the actual direction of travel, including when
the geometry is played backward. They explore dimension, equal lengths, volume,
and the arrangement of regular faces around a vertex.
Transition captions remain visible through the morph instead of changing with
every short phase. At normal pace, viewing pauses allow at least five seconds
and a reading budget based on caption length; the opening point gets a full
reading pause as well.

## Controls

- **Play / Pause**, or **Space** outside form controls.
- **Reverse** to switch travel direction at the current position without changing
  whether playback is running or paused. Endpoint bounces still keep the loop
  within the timeline. Since additions and removals follow different paths,
  reversing mid-transition smoothly redirects the visible vertices before the
  timeline continues. A paused reversal waits for Play to do this; points do not
  jump or disappear while being redirected.
- **Restart** to return to the shared point, reset the loop clock, and play rightward.
- Click any shape to jump to its viewing pause, preserving playback state and
  direction. At an endpoint, direction turns inward.
- Scrub the timeline in either direction, including while paused.
- Choose a playback speed from 0.5x to 2x.
- Drag to orbit; scroll to zoom. Dragging disables auto-orbit.
- Focus the canvas and use arrow keys to orbit, plus/minus to zoom.
- **Auto-orbit** toggles the slow camera movement during playback.
- **Reset view** restores the starting camera and zoom.
- **Expand** enters fullscreen if supported by the browser.

The arrow beside the clock shows travel direction. The clock measures progress
through one repeating round trip, starting from the center heading right.
Reduced-motion preferences start at the center paused with auto-orbit disabled;
playback remains available on request.

## Implementation

`geometry.js` builds regular solids, matches vertices with minimum-cost
assignment, samples midpoint additions and vertex-to-vertex merges, maps the centered timeline,
reflects playback at its endpoints, and computes convex polygonal hulls.
`animation.js` renders them with a
perspective camera on a high-DPI 2D canvas and handles the timeline and controls.
`styles.css` contains the responsive layout. Everything runs locally.

Open `tests.html` in a browser to run the geometry regression checks, including
both orders and directions, midpoint and subsegment construction, merging,
phase boundaries, centered positioning, repeated endpoint bounces, regular final
faces, and the absence of temporary wireframe diagonals.

## License

Copyright (C) 2026 David Smith.

Becoming is licensed under the GNU General Public License, version 2 only
(`GPL-2.0-only`). See [LICENSE](LICENSE) for the complete terms.
