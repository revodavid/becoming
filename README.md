# Becoming

A slow, interactive 3D study of two ways to order the five Platonic solids.

Open **index.html** in a modern browser. No installation, build, server, network
connection, or external libraries are required.

## The journey

**Descending vertices:** dodecahedron (20) -> icosahedron (12) -> cube (8) ->
octahedron (6) -> tetrahedron (4) -> triangle (3) -> line (2) -> point (1).

**Increasing faces:** point -> line -> triangle -> tetrahedron (4) -> cube (6) ->
octahedron (8) -> dodecahedron (12) -> icosahedron (20).

The two chapters share one pause at the point. Both timeline rows link to that
same moment; the animation does not repeat it. Vertex counts appear in the first
row, and face counts in the second. The point and line have no faces; the triangle
has one planar face before the three-dimensional solids begin.

When gaining vertices, new points appear at existing edge midpoints before all
vertices move into position. The initial point-to-line duplication is the only
exception, since there is not yet an edge. If more new points are needed than
there are edges, previously bisected segments are bisected again. Each such point
still begins halfway between two vertices already present.

When losing vertices, the construction is reversed: highlighted vertices move
onto edge midpoints, then fade into those edges in reverse birth order. Surviving
vertices move smoothly too. The line's two endpoints finally coincide as a point.
The face-count chapter includes merging as well as growth: more faces need not
mean more vertices.

Each transition has a point-introduction or highlighting pause, a slow morph,
and a generous viewing pause. Merging has an additional settling interval at the
midpoints. Intermediate surfaces are convex hulls of the moving vertices; they
are not themselves Platonic solids. The wireframe blends only the source and
destination edges, never temporary hull triangulation diagonals. Final faces
are actual polygons. Original edges fade early during growth, and late during
merging so the reverse construction remains visible.
The statistics describe the destination shape during a transition.
Captions explore geometric ideas such as dimension, equal lengths, volume, and
the arrangement of regular faces around a vertex.

## Controls

- **Play / Pause**, or **Space** outside form controls.
- **Restart** to return to the beginning.
- Click a shape in either chapter to jump to its transition; both point entries
  jump directly to the shared point pause. Playback state is preserved.
- Scrub the timeline in either direction, including while paused.
- Choose a playback speed from 0.5x to 2x.
- Drag to orbit; scroll to zoom. Dragging disables auto-orbit.
- Focus the canvas and use arrow keys to orbit, plus/minus to zoom.
- **Auto-orbit** toggles the slow camera movement during playback.
- **Reset view** restores the starting camera and zoom.
- **Expand** enters fullscreen if supported by the browser.

The animation starts on a dodecahedron and stops on the completed icosahedron. Reduced-motion preferences
start the experience paused with auto-orbit disabled; playback remains available
on request.

## Implementation

`geometry.js` builds regular solids, matches vertices with minimum-cost
assignment, samples reversible midpoint transitions, and computes convex polygonal hulls.
`animation.js` renders them with a
perspective camera on a high-DPI 2D canvas and handles the timeline and controls.
`styles.css` contains the responsive layout. Everything runs locally.

Open `tests.html` in a browser to run the geometry regression checks, including
both orders, midpoint and subsegment construction, merging, phase boundaries,
regular final faces, and the absence of temporary wireframe diagonals.
