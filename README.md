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
are actual polygons. New destination edges appear at full normal brightness
once their endpoints are visible and they become actual surface edges of the
changing shape. Future diagonals across flat faces and chords through the
interior are not introduced during highlighting or movement. Existing edges
that will become destination edges stay visible until their successors reach
the surface; coincident connections resolve into a single edge at convergence.
Only outgoing connectivity fades throughout the movement, reaching zero at arrival.
Shared edges stay at normal brightness. Mid-transition reversal blends edge
visibility along with the vertex redirection, without a sudden brightness change.
During the viewing pause, the solid becomes more opaque as vertex highlights
recede. Occluded edges, vertices, and their glows remain only barely visible;
exposed corners and silhouette edges retain their normal brightness.
Focusing for the next transition smoothly restores the transparent view so
the full construction is visible during movement. These opacity changes follow
the timeline in either direction and remain continuous during a manual reversal.
The timeline highlight and left-hand description and statistics stay with the
last completed shape during introductions, morphs, and merges. They switch only
when the next shape is complete, including after a mid-transition reversal.
The Platonic solids have fixed Roman numerals in increasing face-count order:
tetrahedron I, cube II, octahedron III, dodecahedron IV, and icosahedron V.
Captions and highlights follow the actual direction of travel, including when
the geometry is played backward. They explore dimension, equal lengths, volume,
and the arrangement of regular faces around a vertex.
Transition captions remain visible through the morph instead of changing with
every short phase. Each completed object's caption begins with its name.
Each transition has its own direction-specific caption describing the change,
with supporting geometry facts, rather than borrowing the destination's caption.
At normal pace, viewing pauses allow at least five seconds
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
- The **speaker icon** enables/disables the original soundtrack; every page
  load starts muted. Use your device's volume controls to adjust loudness.
  Enabling music joins the current position and does not start a paused animation.
  Status text appears only while audio is starting or needs attention.
- Drag in the object display area to orbit; scroll over that area to zoom.
  Dragging disables auto-orbit. Swipes over the introductory text, shape
  details, captions, or surrounding page scroll normally, including on phones
  in landscape orientation.
- Focus the object display area and use arrow keys to orbit, plus/minus to zoom.
- **Auto-orbit** toggles the slow camera movement during playback. Its rotation
  rate stays constant through 3D focusing, movement, defocusing, and viewing,
  regardless of how many vertices are changing; Pace scales it with playback.
- **Reset view** restores the starting camera and zoom.
- **Expand** enters fullscreen if supported by the browser.

The arrow beside the clock shows travel direction. The clock measures progress
through one repeating round trip, starting from the center heading right.
Reduced-motion preferences start at the center paused with auto-orbit disabled;
playback remains available on request.

## Original soundtrack

Piano and flute lead four original classical movements, supported by orchestral
strings, cello, violin, bass, timpani, and percussion. Each has its own rhythmic and melodic character,
with shape-completion cadences linking the music to the geometry.

| Journey | Theme and key | Arrangement |
| --- | --- | --- |
| Point to Dodecahedron | I. First Light, D major | Flute invocation, then piano-led dotted phrases and growing chords |
| Dodecahedron to Point | II. The Long Shadow, D minor | Elegiac piano, suspensions, and diminishing ensemble |
| Point to Icosahedron | III. Air and Water, G major | Flute-led pastoral triplets and expanding string harmony |
| Icosahedron to Point | IV. Constellations at Rest, G minor | Winding nocturne, softening to open intervals |

Each of the **28 directed shape transitions**, including Point, Line, and
Triangle, has a MIDI arrival marker. Its cadence and destination instrumentation
coincide with geometric completion and the new object caption/timeline highlight,
not the timeline button's viewing-pause center. Face-path intensity follows faces
even when vertices move in the opposite numerical direction. A sparse solo-flute
opening gives Point a spacious, expectant character. Quiet flute-led passages
connect the movements, and ordinary loops retain release tails without
restarting audio.

The four movements have their own melodic shapes, articulations, and
accompaniments: a piano-led outward vertex journey, its darker returning
movement, a contrasting flute-led face journey, and a quieter minor return.
Long notes, dotted rhythms, short runs, and breathing rests replace a uniform
stream of equal-length notes. Larger shapes receive fuller piano and string
chords rather than only faster single notes.

The object captions now provide rhythmic inspiration. Written syllables and
stresses, such as **tet-ra-HE-dron. FOUR FA-ces in PER-fect BAL-ance.**, shape
note lengths and accents; punctuation introduces breathing rests. The original
pitch sequences and harmonies remain the melodic thread of each movement.
This is instrumental phrasing, not speech synthesis or a sung transcription.

Orchestration expands with the active path's count: cello and bass at four,
the fuller string ensemble at six, violin and triangle at eight, then timpani,
bass drum, and snare at twelve. Cymbals mark the largest arrivals. The layers
withdraw at the corresponding counts on the return journey. Bowed voices swell
gently and are more prominent in the mix without replacing the main melody.

Each outer endpoint has its own composed modulation. Borrowed minor harmony,
suspensions, and a dominant chord prepare the return's minor tonic, rather than
switching scales abruptly at the bounce. The vertex and face endpoints use
different cadential gestures. This is an original composition drawing on
classical phrasing and orchestration, not a transcription of a game or film score.

Pause releases sound; resume continues at the retained position. Seeking and
shape clicks cancel obsolete cues, joining the new harmony with a soft entry.
Paused seeking/reversal stays silent. Reverse uses a forward-playing composition
in the other key, **never backward audio**. During a mid-morph route redirection,
the actual timeline and musical progression hold for 1.5 animation seconds
(scaled by Pace), with a quiet bridge. Double reversals and further seeks cancel
the abandoned route's audio. Pace changes tempo and note/envelope timing without
changing pitch. Restart preserves the music on/off choice, returns to quiet
Point, and starts playback. Hidden tabs freeze geometry and suspend/release audio.

Sound requires Web Audio and an explicit Music-button gesture. If the browser
blocks or suspends audio, a status message explains the problem; toggle Music to
retry. Geometry remains usable without audio. No microphone, MIDI-device
permission, internet connection, samples, soundfonts, or audio downloads are
needed. The decaying-partial piano, layered bowed voices, tuned timpani,
orchestral percussion, and flute with soft breath and delayed vibrato are small synthesized instruments,
**not realistic sampled acoustic instruments**.

## Implementation

`geometry.js` builds regular solids, matches vertices with minimum-cost
assignment, samples midpoint additions and vertex-to-vertex merges, maps the centered timeline,
reflects playback at its endpoints, and computes convex polygonal hulls.
`animation.js` renders them with a
perspective camera on a high-DPI 2D canvas and handles the timeline and controls.
`styles.css` contains the responsive layout. Everything runs locally.

`midi.js` validates and decodes the embedded Standard MIDI File, including PPQ
timing, running status, metadata, and paired note releases. `music.js` derives
completion times using the same geometry semantics as the captions, maps each
MIDI arrival interval to its live animation interval, and synthesizes the decoded
notes with Web Audio. The visual clock remains authoritative: scheduling looks
ahead at most **80 ms** beyond its latest accepted update, with capped future
projections, discontinuity generations, bounded 48-voice polyphony, gain ramps,
and node cleanup. A render stall does not let audio advance indefinitely.

### Score source and regeneration

- `music/becoming.mid` is the canonical nine-track, type-1 MIDI score, with
  section/phrase/arrival markers, key/time signatures, tempo, programs, and
  explicit releases. It can also be opened independently in a MIDI editor.
- `music/score-data.js` embeds **exactly the same MIDI bytes** as base64. Classic
  script loading avoids `file:` fetch restrictions; the browser parses this MIDI,
  rather than playing a separately maintained JavaScript note list.
- `music/compose.py` defines the original themes, caption scansion, and
  deterministic arrangement. It checks its written syllables against the
  actual object captions in `geometry.js`; if a caption changes, update its
  scansion before regenerating. Caption and scansion MIDI markers make this
  association inspectable without maintaining a second runtime note list.
  To regenerate both artifacts with Python 3.10+ (standard library only), run
  `python music\compose.py` from the project directory. Repeated runs produce
  byte-identical files. Python is an optional authoring tool, not a playback or
  deployment requirement.

The canonical MIDI, deliberate base64 duplication, decoder, and player remain
below the 200 KiB music-asset budget; the composer reports and enforces their
combined size. No mandatory build step or Pages
configuration change is needed; the new files publish with the other static files.

### Regression checks

Open `tests.html` in a browser to run the geometry regression checks, including
both orders and directions, midpoint and subsegment construction, merging,
phase boundaries, centered positioning, repeated endpoint bounces, regular final
faces, destination-edge visibility, focus/defocus opacity, perspective occlusion,
and the absence of temporary wireframe diagonals.

Open `music-tests.html` for parser rejection cases, all 28 completion/caption
arrivals and their instrument layers, caption/scansion correspondence, expressive
note/rest lengths, distinct movement contours, prepared endpoint modulations,
flute/string/percussion synthesis and cleanup, changed
timeline durations, count-based intensity, every pace, repeated complete loops, capped-clock stalls, transport
cancellation, and OfflineAudioContext sample/voice-cleanup checks. It also tests
audio failure messages, desktop/narrow playback controls, actual hidden-geometry
rendering, opacity-preserving reversals, and consistent auto-orbit. HTTP hosting allows
the test page to inspect its application iframe; some browsers isolate `file:`
iframes, so those control checks are explicitly skipped there. The actual
application still works by opening `index.html` directly, without browser flags.
For the complete control suite, optionally run `python -m http.server 8000`
and open `http://localhost:8000/music-tests.html` with audio allowed. A browser
that blocks the test's automated Music click instead checks the explicit failure
message and reports that live audio controls were not exercised. Use a foreground browser;
headless virtual-time dumping may end before offline rendering finishes.

Offline-rendered excerpts cover the opening, both climaxes, both minor returns,
endpoint modulations, and the final-to-first seam, checking finite samples,
conservative levels, and release of all voices. Automated tests **do not
establish musical quality**. After composition changes, listen for flute/piano
balance, musical phrasing, endpoint cadences, and the looping seam.

## License

Copyright (C) 2026 David Smith.

Becoming is licensed under the GNU General Public License, version 2 only
(`GPL-2.0-only`), including the original composition, MIDI, generated embedding,
composer, and synthesizer. See [LICENSE](LICENSE) for the complete terms.
