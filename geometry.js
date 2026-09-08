"use strict";

window.Geometry = (() => {
  const add = (a, b) => a.map((v, i) => v + b[i]);
  const sub = (a, b) => a.map((v, i) => v - b[i]);
  const scale = (a, s) => a.map(v => v * s);
  const dot = (a, b) => a.reduce((sum, v, i) => sum + v * b[i], 0);
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const length = a => Math.hypot(...a);
  const normalize = a => scale(a, 1 / (length(a) || 1));
  const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const distance2 = (a, b) => dot(sub(a, b), sub(a, b));
  const smooth = t => { t = Math.max(0, Math.min(1, t)); return t * t * t * (t * (t * 6 - 15) + 10); };

  function rotate(p, yaw, pitch, roll = 0) {
    const x = p[0] * Math.cos(roll) - p[1] * Math.sin(roll);
    const y = p[0] * Math.sin(roll) + p[1] * Math.cos(roll);
    const xx = x * Math.cos(yaw) + p[2] * Math.sin(yaw);
    const z = -x * Math.sin(yaw) + p[2] * Math.cos(yaw);
    return [xx, y * Math.cos(pitch) - z * Math.sin(pitch), y * Math.sin(pitch) + z * Math.cos(pitch)];
  }

  // Merge coplanar supporting triangles into true polygonal faces: no cube
  // diagonals or pentagon triangulation edges are exposed by the renderer.
  function hull(points) {
    if (points.length < 3) return { faces: [], edges: points.length === 2 ? [[0, 1]] : [] };
    const epsilon = 1e-6;
    const planes = new Map();
    for (let a = 0; a < points.length - 2; a++) {
      for (let b = a + 1; b < points.length - 1; b++) {
        for (let c = b + 1; c < points.length; c++) {
          let normal = cross(sub(points[b], points[a]), sub(points[c], points[a]));
          if (length(normal) < epsilon) continue;
          normal = normalize(normal);
          let positive = false, negative = false;
          const onPlane = [];
          for (let i = 0; i < points.length; i++) {
            const d = dot(normal, sub(points[i], points[a]));
            if (d > epsilon) positive = true;
            else if (d < -epsilon) negative = true;
            else onPlane.push(i);
          }
          if (positive && negative) continue;
          if (positive) normal = scale(normal, -1);
          const key = onPlane.join(",");
          if (planes.has(key)) continue;
          const origin = points[onPlane[0]];
          const u = normalize(sub(points[onPlane[1]], origin));
          const v = cross(normal, u);
          const planar = onPlane.map(i => ({ i, x: dot(sub(points[i], origin), u), y: dot(sub(points[i], origin), v) }))
            .sort((p, q) => p.x - q.x || p.y - q.y);
          const turn = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
          const half = list => {
            const result = [];
            for (const p of list) {
              while (result.length >= 2 && turn(result[result.length - 2], result[result.length - 1], p) <= epsilon) result.pop();
              result.push(p);
            }
            return result;
          };
          const lower = half(planar), upper = half([...planar].reverse());
          const ids = lower.slice(0, -1).concat(upper.slice(0, -1)).map(p => p.i);
          if (ids.length >= 3) planes.set(key, { ids, normal });
        }
      }
    }
    const faces = [...planes.values()];
    const edges = new Map();
    for (const face of faces) {
      for (let i = 0; i < face.ids.length; i++) {
        const a = face.ids[i], b = face.ids[(i + 1) % face.ids.length];
        const pair = a < b ? [a, b] : [b, a];
        edges.set(pair.join("-"), pair);
      }
    }
    return { faces, edges: [...edges.values()] };
  }

  // Minimum-cost matching keeps vertex identities intact rather than
  // arbitrarily cross-wiring the source and destination solids.
  function assignment(source, target) {
    const n = source.length;
    const u = Array(n + 1).fill(0), v = Array(n + 1).fill(0);
    const p = Array(n + 1).fill(0), way = Array(n + 1).fill(0);
    for (let i = 1; i <= n; i++) {
      p[0] = i;
      let j0 = 0;
      const min = Array(n + 1).fill(Infinity), used = Array(n + 1).fill(false);
      do {
        used[j0] = true;
        const i0 = p[j0];
        let delta = Infinity, j1 = 0;
        for (let j = 1; j <= n; j++) {
          if (used[j]) continue;
          const cost = distance2(source[i0 - 1], target[j - 1]) - u[i0] - v[j];
          if (cost < min[j]) { min[j] = cost; way[j] = j0; }
          if (min[j] < delta) { delta = min[j]; j1 = j; }
        }
        for (let j = 0; j <= n; j++) {
          if (used[j]) { u[p[j]] += delta; v[j] -= delta; }
          else min[j] -= delta;
        }
        j0 = j1;
      } while (p[j0] !== 0);
      do {
        const j1 = way[j0];
        p[j0] = p[j1];
        j0 = j1;
      } while (j0 !== 0);
    }
    const result = Array(n);
    for (let j = 1; j <= n; j++) result[p[j] - 1] = target[j - 1];
    return result;
  }

  function alignedTarget(source, target) {
    let best = null, bestOrder = null, bestCost = Infinity;
    for (let i = 0; i < 72; i++) {
      const angle = i === 0 ? [0, 0, 0] : [i * 2.39996323, Math.asin(2 * ((i * 0.618033989) % 1) - 1), i * 0.754877666];
      const rotated = target.map(p => rotate(p, ...angle));
      const candidate = assignment(source, rotated);
      const cost = candidate.reduce((sum, p, j) => sum + distance2(p, source[j]), 0);
      if (cost < bestCost) {
        bestCost = cost;
        best = candidate;
        bestOrder = candidate.map(p => rotated.indexOf(p));
      }
    }
    return { points: best, order: bestOrder };
  }

  function edgeSeeds(points, count) {
    const vertices = [...points], seeds = [];
    const remaining = hull(points).edges.map(edge => ({ edge, depth: 0 }));
    for (let i = 0; i < count; i++) {
      const depth = Math.min(...remaining.map(candidate => candidate.depth));
      let best = 0, bestScore = -Infinity;
      remaining.forEach((candidate, j) => {
        if (candidate.depth !== depth) return;
        const [a, b] = candidate.edge;
        const position = lerp(vertices[a], vertices[b], 0.5);
        const score = seeds.length
          ? Math.min(...seeds.map(s => distance2(s.position, position)))
          : length(position);
        if (score > bestScore) { best = j; bestScore = score; }
      });
      const { edge: [a, b] } = remaining.splice(best, 1)[0];
      const position = lerp(vertices[a], vertices[b], 0.5);
      const id = vertices.length;
      seeds.push({ position, edge: [a, b] });
      vertices.push(position);
      // Once every original edge is used, bisect the resulting subsegments.
      remaining.push({ edge: [a, id], depth: depth + 1 }, { edge: [id, b], depth: depth + 1 });
    }
    return seeds;
  }

  function makeStages() {
    const phi = (1 + Math.sqrt(5)) / 2;
    const octa = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    const cube = [], ico = [], dodeca = [];
    for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) cube.push([x, y, z]);
    for (const a of [-1, 1]) for (const b of [-1, 1]) {
      ico.push([0, a, b * phi], [a, b * phi, 0], [b * phi, 0, a]);
      dodeca.push([0, a / phi, b * phi], [a / phi, b * phi, 0], [b * phi, 0, a / phi]);
    }
    dodeca.push(...cube.map(p => [...p]));
    const radius = 1.48;
    const spherical = points => points.map(p => scale(normalize(p), radius));
    const r = 1.25, h = r / Math.sqrt(8);
    const triangle = [[-r * Math.sqrt(3) / 2, -r / 2, 0], [r * Math.sqrt(3) / 2, -r / 2, 0], [0, r, 0]];
    const definitions = [
      { name: "Point", vertices: 1, edges: 0, faces: 0, kind: "THE ORIGIN", description: "Position, without length, width or depth.", target: [[0, 0, 0]], add: 0, morph: 0, hold: 4,
        captions: ["A point marks a place.", "It has a position, but no size."] },
      { name: "Line", vertices: 2, edges: 1, faces: 0, kind: "ONE DIMENSION", description: "Two points. The first connection.", target: [[-0.78, 0, 0], [0.78, 0, 0]], add: 3, morph: 5, hold: 4,
        adding: ["What does it take to have length?", "Two endpoints give a line segment its extent."],
        moving: ["Length is our first dimension.", "The shortest path between two points is a straight line segment."],
        captions: ["The first dimension.", "Two vertices, connected by a single edge."] },
      { name: "Triangle", vertices: 3, edges: 3, faces: 1, kind: "TWO DIMENSIONS", description: "Three equal sides open up a plane.", target: triangle, add: 3.5, morph: 6, hold: 5,
        adding: ["Halfway is a special place.", "A midpoint divides a segment into two equal lengths."],
        moving: ["Length meets width.", "Three points that are not all on one line enclose an area."],
        captions: ["Balance, in two dimensions.", "Three equal edges. Three equal angles."] },
      { name: "Tetrahedron", vertices: 4, edges: 6, faces: 4, kind: "Platonic Solid I", description: "Four equilateral triangles. The simplest solid.", target: [...triangle.map(p => [p[0], p[1], -h]), [0, 0, 3 * h]], add: 4, morph: 7, hold: 8,
        adding: ["A midpoint offers a new possibility.", "Halfway along an edge, the distances to its two ends are equal."],
        moving: ["Beyond the plane lies volume.", "Four points can enclose space when they do not all lie in one plane."],
        captions: ["Tetrahedron. Four faces in perfect balance.", "Three equilateral triangles meet at every vertex."] },
      { name: "Octahedron", vertices: 6, edges: 12, faces: 8, kind: "Platonic Solid III", description: "Eight equilateral triangles, paired at an equator.", target: spherical(octa), add: 4.5, morph: 8, hold: 8,
        adding: ["How else can triangles enclose space?", "The tetrahedron is only the first of three Platonic solids with triangular faces."],
        moving: ["A different meeting of triangles.", "In an octahedron, four equilateral triangles meet at each vertex."],
        captions: ["Octahedron. Eight facets, one rhythm.", "Six vertices. Twelve equal edges. Eight equilateral triangles."] },
      { name: "Cube", vertices: 8, edges: 12, faces: 6, kind: "Platonic Solid II", description: "Six squares. A familiar kind of perfection.", target: spherical(cube), add: 4.5, morph: 8, hold: 8,
        adding: ["More corners need not mean more faces.", "The octahedron has 6 vertices and 8 faces; the cube has 8 vertices and 6 faces."],
        moving: ["A familiar symmetry takes shape.", "Three square faces meet at each corner of a cube."],
        captions: ["Cube. Six faces, beautifully familiar.", "Eight vertices. Twelve equal edges. Six perfect squares."] },
      { name: "Icosahedron", vertices: 12, edges: 30, faces: 20, kind: "Platonic Solid V", description: "Twenty triangles. A step closer to a sphere.", target: spherical(ico), add: 5.5, morph: 9, hold: 9,
        adding: ["How many triangles can meet at a corner?", "Five can fold around a vertex; six would lie flat."],
        moving: ["More faces, the same regularity.", "Five equilateral triangles meet at every vertex of an icosahedron."],
        captions: ["Icosahedron. Twenty windows on symmetry.", "Twelve vertices. Thirty equal edges. Twenty triangular faces."] },
      { name: "Dodecahedron", vertices: 20, edges: 30, faces: 12, kind: "Platonic Solid IV", description: "Twelve pentagons. Three meet at every corner.", target: spherical(dodeca), add: 7, morph: 10, hold: 11,
        adding: ["One more kind of face is possible.", "Regular pentagons have five equal sides and five equal angles."],
        moving: ["Five sides to a face. Three faces to a corner.", "Three regular pentagons meet at each vertex of a dodecahedron."],
        captions: ["Dodecahedron. Twelve pentagonal faces.", "Twenty vertices. Thirty equal edges. Twelve regular pentagons."] }
    ];
    definitions.forEach((stage, index) => {
      stage.dimension = Math.min(index, 3);
      stage.seeds = [];
      if (index) {
        const previous = definitions[index - 1].target;
        if (index === 1) stage.seeds = [{ position: [...previous[0]], edge: null }];
        else stage.seeds = edgeSeeds(previous, stage.vertices - previous.length);
        stage.source = [...previous.map(p => [...p]), ...stage.seeds.map(s => [...s.position])];
        if (index >= 4) stage.target = alignedTarget(stage.source, stage.target).points;
      } else stage.source = stage.target;
      stage.topology = hull(stage.target);
    });

    const descendingCopy = [
      ["Length gives way to position.", "Without separation, two endpoints describe a single place."],
      ["Area gives way to length.", "A straight segment has length, but no width."],
      ["From volume back to area.", "A triangle's three vertices always lie in one plane."],
      ["How few corners can enclose space?", "Four is the minimum for a solid with flat faces."],
      ["Fewer corners, but more faces.", "The cube has 8 vertices and 6 faces; the octahedron has 6 vertices and 8 faces."],
      ["A simpler set of corners.", "Twelve vertices become eight; twenty triangular faces give way to six squares."],
      ["Fewer vertices can mean more faces.", "The dodecahedron has 20 vertices and 12 faces; the icosahedron has 12 vertices and 20 faces."]
    ];
    const stages = [];
    const first = definitions[7];
    stages.push({
      ...first, chapter: "vertices", direction: "still", previousCount: first.vertices,
      source: first.target, destination: first.target, sourceTopology: first.topology,
      fromDimension: 3, seeds: [], add: 0, morph: 0, merge: 0, hold: 10,
      captions: ["Twenty vertices. A journey toward one.", "First, compare the solids by decreasing vertex count."]
    });
    for (let i = 6; i >= 0; i--) {
      const smaller = definitions[i], larger = definitions[i + 1];
      stages.push({
        ...smaller, chapter: "vertices", direction: "shrink",
        previousCount: larger.vertices, fromDimension: larger.dimension,
        source: larger.target, destination: larger.source, sourceTopology: larger.topology,
        seeds: larger.seeds, add: Math.min(4.5, larger.add), morph: larger.morph,
        merge: Math.max(1.8, (larger.seeds.length - 1) * 0.22 + 0.6),
        highlighting: descendingCopy[i], moving: descendingCopy[i],
        pivot: i === 0, hold: i === 0 ? 8 : smaller.hold,
        captions: i === 0
          ? ["Back to a point. A new way to compare.", "Now follow increasing face counts: 4, 6, 8, 12, then 20."]
          : smaller.captions
      });
    }

    for (const id of [1, 2, 3, 5, 4, 7, 6]) {
      const shape = definitions[id], previous = stages[stages.length - 1];
      const growing = shape.vertices > previous.vertices;
      const smaller = growing ? previous.target : shape.target;
      let seeds = smaller.length === 1
        ? [{ position: [...smaller[0]], edge: null }]
        : edgeSeeds(smaller, Math.abs(shape.vertices - previous.vertices));
      const expanded = [...smaller.map(p => [...p]), ...seeds.map(seed => [...seed.position])];
      let source, destination, target;
      if (growing) {
        source = expanded;
        target = id <= 3 ? shape.target : alignedTarget(source, shape.target).points;
        destination = target;
      } else {
        const match = alignedTarget(previous.target, expanded);
        // Reindex, but never move, incoming vertices so survivors occupy the
        // first slots and additional vertices can retire in reverse birth order.
        const order = expanded.map((_, i) => match.order.indexOf(i));
        source = order.map(i => previous.target[i]);
        destination = order.map(i => match.points[i]);
        target = destination.slice(0, shape.vertices);
        seeds = seeds.map((seed, i) => ({ ...seed, position: destination[shape.vertices + i] }));
      }
      stages.push({
        ...shape, chapter: "faces", direction: growing ? "grow" : "shrink",
        previousCount: previous.vertices, fromDimension: previous.dimension,
        source, destination, target, seeds, sourceTopology: hull(source.slice(0, previous.vertices)),
        topology: hull(target), add: Math.max(shape.add, growing ? 2.1 + seeds.length * 0.55 : 3.5),
        morph: Math.max(shape.morph, growing && seeds.length > 8 ? 11 : 0),
        merge: growing ? 0 : Math.max(1.8, (seeds.length - 1) * 0.22 + 0.6)
      });
    }
    const faceStages = stages.filter(stage => stage.chapter === "faces");
    faceStages[3].adding = ["Four faces become six.", "A tetrahedron has four triangular faces; a cube has six square faces."];
    faceStages[4].highlighting = ["More faces, fewer corners.", "The cube's 6 faces and 8 vertices become the octahedron's 8 faces and 6 vertices."];
    faceStages[5].adding = ["Eight faces become twelve.", "Face count is increasing, even though the faces themselves change from triangles to pentagons."];
    faceStages[6].highlighting = ["Twelve faces become twenty.", "The icosahedron has more faces than the dodecahedron, but fewer vertices."];
    faceStages[6].captions = ["Two orders. The same five solids.", "Vertex count and face count reveal different paths through the Platonic solids."];
    let start = 0;
    stages.forEach((stage, index) => {
      stage.index = index;
      stage.start = start;
      stage.changedStart = Math.min(stage.vertices, stage.previousCount);
      stage.shapeCaptions = definitions.find(shape => shape.name === stage.name).captions;
      // Reverse playback uses the first 2.6 seconds of a growth hold to
      // highlight vertices. Keep a full reading pause outside that interval.
      stage.hold = Math.max(stage.hold, captionDuration(stage.shapeCaptions) + (stage.direction === "grow" ? 2.6 : 0));
      if (stage.pivot) stage.hold = Math.max(stage.hold, 2 * Math.max(captionDuration(originCaption(1)), captionDuration(originCaption(-1))));
      stage.duration = stage.add + stage.morph + stage.merge + stage.hold;
      const small = stage.direction === "grow" ? stage.source.slice(0, stage.changedStart) : stage.target;
      const large = stage.direction === "grow" ? stage.target : stage.source;
      stage.mergeTargets = stage.seeds.map((_, i) => {
        const point = large[stage.changedStart + i];
        let nearest = 0;
        for (let j = 1; j < small.length; j++) {
          if (distance2(point, small[j]) < distance2(point, small[nearest])) nearest = j;
        }
        return nearest;
      });
      start += stage.duration;
    });
    return stages;
  }

  function sampleStage(stage, local, motion = stage.direction) {
    const shrinking = stage.direction === "shrink";
    const movingEnd = stage.add + stage.morph;
    const phase = local < stage.add ? (shrinking ? "highlighting" : "adding")
      : local < movingEnd ? "moving"
        : local < movingEnd + stage.merge ? "merging" : "holding";
    const progress = stage.morph ? smooth((local - stage.add) / stage.morph) : 1;
    const points = phase === "holding" ? stage.target : stage.source.map((p, i) => {
      if (motion === "shrink" && i >= stage.changedStart) {
        const receiver = stage.mergeTargets[i - stage.changedStart];
        return shrinking ? lerp(p, stage.target[receiver], progress)
          : lerp(stage.source[receiver], stage.destination[i], progress);
      }
      return lerp(p, stage.destination[i], progress);
    });
    const arrivals = stage.seeds.map((_, i) => {
      const spread = Math.max(0, stage.add - 2.1);
      const at = stage.seeds.length <= 1 ? 0.4 : 0.4 + i * spread / (stage.seeds.length - 1);
      return smooth((local - at) / 0.65);
    });
    const holdTime = Math.max(0, local - movingEnd - stage.merge);
    const visibility = points.map((_, i) => {
      if (i < stage.changedStart || stage.direction === "still") return 1;
      const seedIndex = i - stage.changedStart;
      if (phase === "adding") return arrivals[seedIndex];
      if (phase === "merging") {
        const delay = (stage.seeds.length - 1 - seedIndex) * 0.22;
        return 1 - smooth((local - movingEnd - delay) / 0.6);
      }
      return 1;
    });
    const emphasis = points.map((_, i) => {
      if (i < stage.changedStart || stage.direction === "still") return 0;
      if (phase === "highlighting") return arrivals[i - stage.changedStart];
      return phase === "holding" ? 1 - smooth(holdTime / 2.6) : 1;
    });
    let edges = new Map((phase === "adding" || phase === "highlighting" ? stage.sourceTopology : stage.topology).edges
      .map(([a, b]) => [`${a}-${b}`, 1]));
    if (phase === "moving") {
      const fade = Math.min(1.2, stage.morph * 0.2);
      const blend = smooth((local - stage.add - (shrinking ? stage.morph - fade : 0)) / fade);
      const sourceEdges = new Set(stage.sourceTopology.edges.map(([a, b]) => `${a}-${b}`));
      for (const key of edges.keys()) if (!sourceEdges.has(key)) edges.set(key, blend);
      for (const key of sourceEdges) if (!edges.has(key)) edges.set(key, 1 - blend);
    }
    const fromDepth = stage.fromDimension === 3 ? 1 : 0, toDepth = stage.dimension === 3 ? 1 : 0;
    return { stage, local, phase, progress, points, arrivals, visibility, emphasis, edges, depthReveal: fromDepth + (toDepth - fromDepth) * progress };
  }

  function makeTimeline(stages = makeStages()) {
    const nodes = [...stages].reverse().map((stage, index) => ({
      index, stage,
      time: stage.start + stage.add + stage.morph + stage.merge
        + (stage.direction === "grow" ? Math.max(stage.hold / 2, 2.8) : stage.hold / 2)
    }));
    const center = nodes.find(node => node.stage.pivot);
    const minTime = nodes[nodes.length - 1].time, maxTime = nodes[0].time;
    return { stages, nodes, center, minTime, maxTime, period: 2 * (maxTime - minTime) };
  }

  function positionToTime(timeline, position) {
    const p = Math.max(0, Math.min(timeline.nodes.length - 1, position));
    const index = Math.min(Math.floor(p), timeline.nodes.length - 2);
    const a = timeline.nodes[index].time, b = timeline.nodes[index + 1].time;
    return a + (b - a) * (p - index);
  }

  function timeToPosition(timeline, time) {
    if (time >= timeline.maxTime) return 0;
    for (let i = 0; i < timeline.nodes.length - 1; i++) {
      const a = timeline.nodes[i].time, b = timeline.nodes[i + 1].time;
      if (time >= b) return i + (a - time) / (a - b);
    }
    return timeline.nodes.length - 1;
  }

  function advanceLoop(timeline, playback, delta) {
    const span = timeline.maxTime - timeline.minTime;
    const x = timeline.maxTime - playback.time;
    const phase = playback.direction > 0 ? x : timeline.period - x;
    let next = ((phase + delta) % timeline.period + timeline.period) % timeline.period;
    if (Math.abs(next - span) < 1e-9) next = span;
    else if (Math.min(next, timeline.period - next) < 1e-9) next = 0;
    const distance = next <= span ? next : timeline.period - next;
    const origin = timeline.maxTime - timeline.center.time;
    const elapsed = (next - origin + timeline.period) % timeline.period;
    return {
      time: timeline.maxTime - distance,
      direction: next < span ? 1 : -1,
      elapsed: Math.min(elapsed, timeline.period - elapsed) < 1e-9 ? 0 : elapsed
    };
  }

  function reverseLoop(timeline, playback) {
    const direction = -playback.direction;
    return { ...advanceLoop(timeline, { time: playback.time, direction }, 0), time: playback.time, direction };
  }

  function captionDuration(copy) {
    return Math.max(5, 1 + copy.join(" ").trim().split(/\s+/).length / 2.5);
  }

  function originCaption(direction) {
    return [
      "One point. Two ways to explore.",
      direction > 0 ? "To the right, compare the solids by increasing vertex count."
        : "To the left, compare the solids by increasing face count."
    ];
  }

  function sampleTimeline(timeline, playback) {
    const stage = timeline.stages.find(s => playback.time < s.start + s.duration)
      || timeline.stages[timeline.stages.length - 1];
    const motion = playback.direction > 0 && stage.direction !== "still"
      ? (stage.direction === "grow" ? "shrink" : "grow") : stage.direction;
    const frame = sampleStage(stage, playback.time - stage.start, motion);
    const geometryPhase = frame.phase;
    const previous = stage.index ? timeline.stages[stage.index - 1] : stage;
    const sourceStage = playback.direction > 0 ? stage : previous;
    const targetStage = playback.direction > 0 ? previous : stage;
    let phase = geometryPhase;
    let focus = frame.arrivals;
    // Playback can follow either direction, but births always use midpoints
    // and removals always converge on surviving vertices.
    if (playback.direction > 0 && stage.direction !== "still") {
      const holdTime = frame.local - stage.add - stage.morph - stage.merge;
      const reverseHighlight = geometryPhase === "holding" && stage.direction === "grow" && holdTime < 2.6;
      if (reverseHighlight) {
        phase = "highlighting";
        focus = frame.emphasis.slice(stage.changedStart);
      } else if (geometryPhase === "highlighting") phase = "holding";
      else if (geometryPhase === "merging") {
        phase = "adding";
        focus = frame.visibility.slice(stage.changedStart);
      } else if (geometryPhase === "adding") phase = "merging";
    }
    const retired = phase === "merging" && frame.visibility.slice(stage.changedStart).every(visible => visible === 0);
    if (retired) phase = "holding";
    const shapeComplete = phase === "holding";
    const displayStage = retired ? targetStage : shapeComplete
      ? (playback.direction > 0 && geometryPhase === "highlighting" ? previous : stage) : sourceStage;
    const node = timeline.nodes[timeline.nodes.length - 1 - displayStage.index];
    const position = timeToPosition(timeline, playback.time);
    const atCenter = displayStage.pivot && phase === "holding";
    const chapter = atCenter ? (playback.direction > 0 ? "vertices" : "faces")
      : position < timeline.center.index ? "faces" : "vertices";
    const paths = {};
    for (const name of ["faces", "vertices"]) {
      const increasing = name === "vertices" ? playback.direction > 0 : playback.direction < 0;
      const text = `${increasing ? "Increasing" : "Decreasing"} ${name}`;
      paths[name] = { increasing, label: playback.direction > 0 ? `${text} \u2192` : `\u2190 ${text}` };
    }
    const increasing = paths[chapter].increasing;
    let copy = shapeComplete ? displayStage.shapeCaptions : targetStage.shapeCaptions;
    if (!shapeComplete && playback.direction < 0) {
      copy = stage.direction === "grow" ? stage.adding : stage.highlighting;
    } else if (!shapeComplete) {
      if ((targetStage.vertices - sourceStage.vertices) * (targetStage.faces - sourceStage.faces) < 0) {
        copy = [
          targetStage.vertices > sourceStage.vertices ? "More corners need not mean more faces." : "More faces need not mean more corners.",
          `${sourceStage.name}: ${sourceStage.vertices} vertices, ${sourceStage.faces} faces. ${targetStage.name}: ${targetStage.vertices} vertices, ${targetStage.faces} faces.`
        ];
      }
    }
    if (atCenter) copy = originCaption(playback.direction);
    return { ...frame, geometryPhase, phase, displayStage, targetStage, shapeComplete, node, position, chapter, increasing, paths, motion, focus, copy };
  }

  function redirectFrame(frame, source, progress) {
    const routeBlend = smooth(progress);
    return {
      ...frame,
      points: source.map((point, i) => lerp(point, frame.points[i], routeBlend)),
      phase: "moving", geometryPhase: "moving", shapeComplete: false, routeBlend
    };
  }
  return {
    add, sub, scale, dot, cross, length, normalize, lerp, distance2, smooth, rotate, hull,
    makeStages, sampleStage, makeTimeline, positionToTime, timeToPosition, advanceLoop, reverseLoop, sampleTimeline, redirectFrame, captionDuration
  };
})();
