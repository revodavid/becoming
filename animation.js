"use strict";

(() => {
  const G = window.Geometry;
  const stages = G.makeStages();
  const total = stages.reduce((sum, stage) => sum + stage.duration, 0);
  const $ = id => document.getElementById(id);
  const canvas = $("scene"), ctx = canvas.getContext("2d");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const state = {
    time: 0, playing: !reducedMotion.matches, speed: 1, orbit: !reducedMotion.matches,
    yaw: -0.16, pitch: 0.12, zoom: 1, orbitAngle: 0, dragging: false,
    width: 0, height: 0, stageIndex: -1, phase: "", lastFrame: null, topologyKey: "",
    topology: null
  };
  const colors = { green: [181, 229, 191], gold: [242, 199, 126] };
  const rgba = (rgb, alpha) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
  const formatTime = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
  const stageButtons = [];
  function addStageButton(stage, chapter) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "stage-button";
    const count = chapter === "vertices" ? `${stage.vertices} ${stage.vertices === 1 ? "vertex" : "vertices"}`
      : `${stage.faces} ${stage.faces === 1 ? "face" : "faces"}`;
    const jumpTime = stage.pivot ? stage.start + stage.add + stage.morph + stage.merge : stage.start;
    button.innerHTML = `<span class="stage-index">${String(stage.index + 1).padStart(2, "0")}</span><span><span class="stage-title">${stage.name}</span><span class="stage-count">${count}</span></span>`;
    button.setAttribute("aria-label", `${chapter === "vertices" ? "Descending vertices" : "Increasing faces"}: ${stage.name}, ${count}. Jump to ${formatTime(jumpTime)}.`);
    button.addEventListener("click", () => seek(jumpTime));
    $(`stages-${chapter}`).appendChild(button);
    stageButtons.push({ button, index: stage.index });
  }
  stages.forEach(stage => {
    addStageButton(stage, stage.chapter);
    if (stage.pivot) addStageButton(stage, "faces");
  });
  $("seek").max = total;
  $("duration").textContent = formatTime(total);

  function setPlaying(playing) {
    state.playing = playing;
    $("play-text").textContent = playing ? "Pause" : state.time >= total ? "Replay" : "Play";
    $("play-icon").innerHTML = playing ? "&#10074;&#10074;" : "&#9654;";
    $("play").setAttribute("aria-label", playing ? "Pause animation" : state.time >= total ? "Replay animation" : "Play animation");
  }

  function setOrbit(enabled) {
    state.orbit = enabled;
    $("orbit").setAttribute("aria-pressed", String(enabled));
  }

  function seek(time) {
    state.time = Math.max(0, Math.min(total, time));
    state.topologyKey = "";
    if (state.time >= total) setPlaying(false);
    else setPlaying(state.playing);
  }

  $("play").addEventListener("click", () => {
    if (state.time >= total) seek(0);
    setPlaying(!state.playing);
  });
  $("restart").addEventListener("click", () => { seek(0); setPlaying(true); });
  $("seek").addEventListener("input", event => seek(Number(event.target.value)));
  $("speed").addEventListener("change", event => { state.speed = Number(event.target.value); });
  $("orbit").addEventListener("click", () => setOrbit(!state.orbit));
  $("reset-view").addEventListener("click", () => {
    state.yaw = -0.16;
    state.pitch = 0.12;
    state.zoom = 1;
    state.orbitAngle = 0;
  });
  if (!document.fullscreenEnabled) $("fullscreen").hidden = true;
  $("fullscreen").addEventListener("click", async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch (error) {
      $("fullscreen").textContent = "Fullscreen unavailable";
      console.error("Could not change fullscreen mode:", error);
    }
  });
  document.addEventListener("fullscreenchange", () => {
    const expanded = Boolean(document.fullscreenElement);
    $("fullscreen").innerHTML = expanded ? "Exit fullscreen &#8601;" : "Expand &#8599;";
    $("fullscreen").setAttribute("aria-label", expanded ? "Exit fullscreen" : "Enter fullscreen");
  });
  reducedMotion.addEventListener("change", event => {
    if (event.matches) { setPlaying(false); setOrbit(false); }
  });

  let pointer = null;
  canvas.addEventListener("pointerdown", event => {
    if (pointer !== null || (event.pointerType === "mouse" && event.button !== 0)) return;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    state.dragging = true;
    canvas.setPointerCapture(event.pointerId);
    setOrbit(false);
  });
  canvas.addEventListener("pointermove", event => {
    if (!pointer || pointer.id !== event.pointerId) return;
    state.yaw += (event.clientX - pointer.x) * 0.007;
    state.pitch = Math.max(-1.35, Math.min(1.35, state.pitch + (event.clientY - pointer.y) * 0.007));
    pointer.x = event.clientX;
    pointer.y = event.clientY;
  });
  function releasePointer(event) {
    if (!pointer || pointer.id !== event.pointerId) return;
    pointer = null;
    state.dragging = false;
  }
  canvas.addEventListener("pointerup", releasePointer);
  canvas.addEventListener("pointercancel", releasePointer);
  canvas.addEventListener("lostpointercapture", releasePointer);
  canvas.addEventListener("wheel", event => {
    event.preventDefault();
    state.zoom = Math.max(0.65, Math.min(1.55, state.zoom * Math.exp(-event.deltaY * 0.001)));
  }, { passive: false });
  canvas.addEventListener("keydown", event => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      setOrbit(false);
      if (event.key === "ArrowLeft") state.yaw -= 0.1;
      if (event.key === "ArrowRight") state.yaw += 0.1;
      if (event.key === "ArrowUp") state.pitch = Math.max(-1.35, state.pitch - 0.1);
      if (event.key === "ArrowDown") state.pitch = Math.min(1.35, state.pitch + 0.1);
    }
    if (event.key === "+" || event.key === "=") { event.preventDefault(); state.zoom = Math.min(1.55, state.zoom + 0.1); }
    if (event.key === "-") { event.preventDefault(); state.zoom = Math.max(0.65, state.zoom - 0.1); }
  });
  document.addEventListener("keydown", event => {
    if (event.code !== "Space" || /^(INPUT|SELECT|BUTTON|A)$/.test(event.target.tagName)) return;
    event.preventDefault();
    $("play").click();
  });
  document.addEventListener("visibilitychange", () => { state.lastFrame = null; });

  function resize() {
    const rect = canvas.getBoundingClientRect();
    state.width = rect.width;
    state.height = rect.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  function sample() {
    const stage = stages.find(s => state.time < s.start + s.duration) || stages[stages.length - 1];
    return G.sampleStage(stage, state.time - stage.start);
  }

  function updateLabels(frame) {
    const { stage, phase } = frame;
    if (state.stageIndex !== stage.index) {
      state.topologyKey = "";
      $("shape-category").textContent = `${stage.kind} / ${String(stage.index + 1).padStart(2, "0")}`;
      $("shape-name").textContent = stage.name;
      $("shape-description").textContent = stage.description;
      $("shape-stats").innerHTML = [["vertices", stage.vertices], ["edges", stage.edges], ["faces", stage.faces]]
        .map(([label, count]) => `<div class="stat"><strong>${count}</strong><span>${label.toUpperCase()}</span></div>`).join("");
      stageButtons.forEach(({ button, index }) => {
        button.classList.toggle("active", index === stage.index);
        if (index === stage.index) button.setAttribute("aria-current", "step");
        else button.removeAttribute("aria-current");
      });
    }
    if (state.stageIndex !== stage.index || state.phase !== phase) {
      const copy = phase === "adding" ? stage.adding : phase === "highlighting" ? stage.highlighting
        : phase === "moving" ? stage.moving : stage.captions;
      $("caption").textContent = copy[0];
      $("caption-detail").textContent = copy[1];
      $("phase-label").textContent = phase === "moving" ? "Transforming" : phase === "merging" ? "Points meeting" : "A moment to admire";
      document.querySelector(".phase-indicator").classList.toggle("adding", ["adding", "highlighting", "merging"].includes(phase));
      $("shape-stats").setAttribute("aria-label", `${phase === "holding" ? "Shape" : "Destination"}: ${stage.vertices} vertices, ${stage.edges} edges, ${stage.faces} faces`);
      const chapter = stage.pivot && phase === "holding" ? "faces" : stage.chapter;
      $("chapter-vertices").classList.toggle("active", chapter === "vertices");
      $("chapter-faces").classList.toggle("active", chapter === "faces");
      $("order-note").textContent = chapter === "vertices" ? "First: decreasing vertex count." : "Then: increasing face count.";
      $("highlight-label").textContent = stage.direction === "shrink" || chapter === "vertices" ? "Merging points" : "New points";
    }
    state.stageIndex = stage.index;
    state.phase = phase;
    if (phase === "adding" || phase === "highlighting") {
      const arrived = frame.arrivals.filter(value => value >= 0.5).length;
      const label = `${phase === "adding" ? "New points" : "Vertices in focus"}: ${arrived} / ${stage.seeds.length}`;
      if ($("phase-label").textContent !== label) $("phase-label").textContent = label;
    }
    $("seek").value = state.time;
    $("seek").style.setProperty("--progress", `${state.time / total * 100}%`);
    $("seek").setAttribute("aria-valuetext", `${formatTime(state.time)} of ${formatTime(total)}. ${stage.chapter === "vertices" ? "Descending vertices" : "Increasing faces"}. ${stage.name}, ${phase}.`);
    $("elapsed").textContent = formatTime(state.time);
  }

  function draw(frame) {
    const { width: w, height: h } = state;
    const mobile = w <= 640;
    const center = [w * (mobile ? 0.5 : 0.625), h * (mobile ? 0.385 : 0.43)];
    const unit = Math.min(h * (mobile ? 0.125 : 0.225), w * (mobile ? 0.225 : 0.17)) * state.zoom;
    const { stage, phase, points, progress, local, depthReveal } = frame;
    // Take the shortest turn back to a face-on plane when leaving three dimensions.
    const orbitYaw = Math.atan2(Math.sin(state.orbitAngle), Math.cos(state.orbitAngle));
    const yaw = state.yaw + orbitYaw * depthReveal;
    const pitch = state.pitch + 0.16 * depthReveal;
    const project = p => {
      const rotated = G.rotate(p, yaw, pitch);
      const perspective = 6.5 / (6.5 - rotated[2]);
      return { x: center[0] + rotated[0] * unit * perspective, y: center[1] - rotated[1] * unit * perspective, z: rotated[2], perspective };
    };
    const projected = points.map(project);
    ctx.clearRect(0, 0, w, h);
    const halo = ctx.createRadialGradient(center[0], center[1], 0, center[0], center[1], unit * 2.7);
    halo.addColorStop(0, "#24433566");
    halo.addColorStop(0.55, "#1a302333");
    halo.addColorStop(1, "#10191900");
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.strokeStyle = "#89ad9110";
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 8]);
    for (const radius of [1.82, 2.1]) {
      ctx.beginPath();
      ctx.ellipse(center[0], center[1], unit * radius, unit * radius, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    const crossSize = 4;
    ctx.strokeStyle = "#89ad9130";
    for (const sign of [-1, 1]) {
      const x = center[0] + sign * unit * 2.1;
      ctx.beginPath(); ctx.moveTo(x - crossSize, center[1]); ctx.lineTo(x + crossSize, center[1]);
      ctx.moveTo(x, center[1] - crossSize); ctx.lineTo(x, center[1] + crossSize); ctx.stroke();
    }
    ctx.restore();

    let topology;
    if (phase === "adding" || phase === "highlighting") topology = stage.sourceTopology;
    else if (phase === "holding" || phase === "merging") topology = stage.topology;
    else {
      const key = `${stage.index}:${Math.round(progress * 1200)}`;
      if (key !== state.topologyKey) {
        state.topology = G.hull(points);
        state.topologyKey = key;
      }
      topology = state.topology;
    }
    const faceDepth = face => face.ids.reduce((sum, i) => sum + projected[i].z, 0) / face.ids.length;
    const faces = [...topology.faces].sort((a, b) => faceDepth(a) - faceDepth(b));
    for (const face of faces) {
      const normal = G.rotate(face.normal, yaw, pitch);
      const light = Math.max(0, G.dot(normal, G.normalize([-0.4, 0.6, 1])));
      ctx.beginPath();
      face.ids.forEach((id, i) => {
        const p = projected[id];
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.fillStyle = `rgba(${Math.round(87 + light * 52)},${Math.round(135 + light * 46)},${Math.round(101 + light * 39)},${normal[2] > 0 ? 0.105 + light * 0.095 : 0.03})`;
      ctx.fill();
    }

    for (const [key, opacity] of frame.edges) {
      if (opacity <= 0) continue;
      const [a, b] = key.split("-").map(Number);
      const pa = projected[a], pb = projected[b];
      const depth = (pa.z + pb.z) * 0.5;
      const front = Math.max(0, Math.min(1, (depth + 1.48) / 2.96));
      ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y);
      ctx.strokeStyle = rgba(colors.green, (0.23 + front * 0.57) * opacity);
      ctx.lineWidth = (0.8 + front * 0.65) * opacity;
      ctx.stroke();
    }

    if (phase === "adding" || phase === "merging") {
      stage.seeds.forEach((seed, i) => {
        const id = stage.changedStart + i;
        const visible = frame.visibility[id];
        if (visible <= 0) return;
        const ends = seed.edge || [];
        ctx.strokeStyle = rgba(colors.gold, 0.36 * visible);
        ctx.lineWidth = 1.4;
        const p = projected[id];
        for (const end of ends) {
          const q = projected[end];
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        }
      });
    }

    const sourceSize = stage.previousCount === 1 ? 5 : 3.2;
    const targetSize = stage.vertices === 1 ? 5 : 3.2;
    const pointSize = sourceSize + (targetSize - sourceSize) * progress;
    const sortedPoints = projected.map((p, i) => ({ ...p, i })).sort((a, b) => a.z - b.z);
    for (const p of sortedPoints) {
      const seedIndex = p.i - stage.changedStart;
      const visible = frame.visibility[p.i];
      if (visible <= 0) continue;
      const gold = frame.emphasis[p.i];
      const rgb = G.lerp(colors.green, colors.gold, gold).map(Math.round);
      const size = (pointSize + gold * 1.2) * p.perspective;
      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * (gold ? 6 : 4));
      glow.addColorStop(0, rgba(rgb, 0.28 * visible));
      glow.addColorStop(1, rgba(rgb, 0));
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(p.x, p.y, size * (gold ? 6 : 4), 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = rgba(rgb, (0.72 + 0.28 * Math.min(1, (p.z + 1.5) / 3)) * visible);
      ctx.beginPath(); ctx.arc(p.x, p.y, size * visible, 0, Math.PI * 2); ctx.fill();
      if (gold > 0) {
        const pulse = reducedMotion.matches ? 0.5 : (Math.sin(local * 2.8 - seedIndex * 0.7) + 1) / 2;
        ctx.strokeStyle = rgba(colors.gold, (0.24 + pulse * 0.22) * visible * gold);
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(p.x, p.y, size + 6 + pulse * 4, 0, Math.PI * 2); ctx.stroke();
      }
    }

  }

  function tick(timestamp) {
    const dt = state.lastFrame === null ? 0 : Math.min((timestamp - state.lastFrame) / 1000, 0.1);
    state.lastFrame = timestamp;
    if (!document.hidden) {
      if (state.playing) {
        state.time = Math.min(total, state.time + dt * state.speed);
        if (state.time >= total) setPlaying(false);
      }
      const frame = sample();
      if (state.orbit && state.playing && !state.dragging && frame.stage.fromDimension === 3 && frame.stage.dimension === 3) {
        const orbitSpeed = ["adding", "highlighting", "merging"].includes(frame.phase) ? 0.018 : frame.phase === "moving" ? 0.065 : 0.14;
        state.orbitAngle += dt * state.speed * orbitSpeed;
      }
      updateLabels(frame);
      draw(frame);
    }
    requestAnimationFrame(tick);
  }
  setPlaying(state.playing);
  setOrbit(state.orbit);
  requestAnimationFrame(tick);
})();
