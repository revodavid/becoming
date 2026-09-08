"use strict";

(() => {
  const G = window.Geometry;
  const timeline = G.makeTimeline();
  const redirectDuration = 1.5;
  const $ = id => document.getElementById(id);
  const canvas = $("scene"), ctx = canvas.getContext("2d");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const state = {
    time: timeline.center.time, direction: 1, elapsed: 0,
    playing: !reducedMotion.matches, speed: 1, orbit: !reducedMotion.matches,
    yaw: -0.16, pitch: 0.12, zoom: 1, orbitAngle: 0, dragging: false,
    width: 0, height: 0, nodeIndex: -1, labelKey: "", lastFrame: null, topologyKey: "",
    topology: null, redirect: null, completedShape: null
  };
  let musicRequested = false;
  let musicToggle = 0;
  function updateMusicButton(enabled) {
    const label = enabled ? "Mute music" : "Unmute music";
    $("music").setAttribute("aria-pressed", String(enabled));
    $("music").setAttribute("aria-label", label);
    $("music").title = label;
  }
  const music = window.Music ? new window.Music.Player(timeline, {
    status(text, error) {
      const showStatus = error || (musicRequested && !music.enabled) ||
        (music.enabled && music.context.state !== "running" && !document.hidden);
      $("music-status").textContent = showStatus ? text : "";
      $("music-status").hidden = !showStatus;
      $("music-status").classList.toggle("error", error);
      if (error && !music.enabled) {
        musicRequested = false;
        updateMusicButton(false);
      }
    }
  }) : null;
  // Read-only snapshots support diagnostics without exposing the visual transport.
  window.BecomingMusic = music;
  function syncMusic(discontinuity = false) {
    if (!music) return;
    try { music.update({ ...state, hidden: document.hidden }, discontinuity); }
    catch (error) {
      music.disable(); musicRequested = false;
      updateMusicButton(false);
      music.report("Music stopped after an audio error. Toggle Music to retry.", error);
    }
  }
  if (!music) {
    $("music").disabled = true;
    $("music-status").textContent = "Music unavailable: soundtrack scripts could not load.";
    $("music-status").hidden = false;
  }
  $("music").addEventListener("click", async () => {
    if (!music) return;
    const toggle = ++musicToggle;
    musicRequested = !musicRequested;
    if (musicRequested) {
      syncMusic();
      await music.enable();
      if (toggle !== musicToggle) return;
      musicRequested = music.enabled;
    } else music.disable();
    updateMusicButton(music.enabled);
  });
  const colors = { green: [181, 229, 191], gold: [242, 199, 126] };
  const rgba = (rgb, alpha) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
  const formatTime = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
  const stageButtons = timeline.nodes.map(node => {
    const stage = node.stage;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "stage-button";
    button.classList.toggle("pivot", stage.pivot === true);
    const chapter = node.index < timeline.center.index ? "faces" : "vertices";
    const count = stage.pivot ? "Shared origin" : chapter === "vertices" ? `${stage.vertices} ${stage.vertices === 1 ? "vertex" : "vertices"}`
      : `${stage.faces} ${stage.faces === 1 ? "face" : "faces"}`;
    button.innerHTML = `<span class="stage-title">${stage.name}</span><span class="stage-count">${count}</span>`;
    button.setAttribute("aria-label", stage.pivot ? "Point, the shared center of both paths."
      : `${chapter === "vertices" ? "Vertex-count path" : "Face-count path"}: ${stage.name}, ${count}.`);
    button.addEventListener("click", () => seek(node.index));
    $("stages").appendChild(button);
    return button;
  });
  $("seek").max = timeline.nodes.length - 1;
  $("seek").value = timeline.center.index;
  $("duration").textContent = formatTime(timeline.period);

  function revealNode(index, center = false) {
    const button = stageButtons[index], scroller = $("timeline-scroll");
    if (!button) return;
    const left = button.offsetLeft, right = left + button.offsetWidth;
    if (center || left < scroller.scrollLeft || right > scroller.scrollLeft + scroller.clientWidth) {
      scroller.scrollLeft = left + button.offsetWidth / 2 - scroller.clientWidth / 2;
    }
  }
  new ResizeObserver(() => revealNode(state.nodeIndex < 0 ? timeline.center.index : state.nodeIndex, true))
    .observe($("timeline-scroll"));

  function setPlaying(playing) {
    state.playing = playing;
    $("play-text").textContent = playing ? "Pause" : "Play";
    $("play-icon").innerHTML = playing ? "&#10074;&#10074;" : "&#9654;";
    $("play").setAttribute("aria-label", playing ? "Pause animation" : "Play animation");
    syncMusic(true);
  }

  function setOrbit(enabled) {
    state.orbit = enabled;
    $("orbit").setAttribute("aria-pressed", String(enabled));
  }

  function seek(position) {
    const time = G.positionToTime(timeline, position);
    Object.assign(state, G.advanceLoop(timeline, { time, direction: state.direction }, 0));
    state.redirect = null;
    state.completedShape = null;
    state.topologyKey = "";
    syncMusic(true);
  }

  $("play").addEventListener("click", () => setPlaying(!state.playing));
  $("reverse").addEventListener("click", () => {
    const before = sample();
    Object.assign(state, G.reverseLoop(timeline, state));
    const after = G.sampleTimeline(timeline, state);
    state.redirect = before.points.some((point, i) => before.visibility[i] > 0 && G.distance2(point, after.points[i]) > 1e-12)
      ? { points: before.points, elapsed: 0 } : null;
    state.lastFrame = null;
    updateLabels(sample());
    syncMusic(true);
  });
  $("restart").addEventListener("click", () => {
    state.direction = 1;
    seek(timeline.center.index);
    state.elapsed = 0;
    state.lastFrame = null;
    revealNode(timeline.center.index, true);
    setPlaying(true);
  });
  $("seek").addEventListener("input", event => seek(Number(event.target.value)));
  $("speed").addEventListener("change", event => { state.speed = Number(event.target.value); syncMusic(true); });
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
  document.addEventListener("visibilitychange", () => {
    state.lastFrame = null;
    if (music) music.visibility(document.hidden);
  });

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
    const frame = G.sampleTimeline(timeline, state);
    return state.redirect ? G.redirectFrame(frame, state.redirect.points, state.redirect.elapsed / redirectDuration) : frame;
  }

  function updateLabels(frame) {
    if (!state.completedShape || frame.shapeComplete) state.completedShape = frame.displayStage;
    const shape = state.completedShape;
    const node = timeline.nodes[timeline.nodes.length - 1 - shape.index];
    const { phase, chapter, increasing } = frame;
    if (state.nodeIndex !== node.index) {
      $("shape-category").textContent = shape.kind;
      $("shape-name").textContent = shape.name;
      $("shape-description").textContent = shape.description;
      $("shape-stats").innerHTML = [["vertices", shape.vertices], ["edges", shape.edges], ["faces", shape.faces]]
        .map(([label, count]) => `<div class="stat"><strong>${count}</strong><span>${label.toUpperCase()}</span></div>`).join("");
      stageButtons.forEach((button, index) => {
        button.classList.toggle("active", index === node.index);
        if (index === node.index) button.setAttribute("aria-current", "step");
        else button.removeAttribute("aria-current");
      });
      if (document.activeElement !== $("seek")) revealNode(node.index);
    }
    const labelKey = `${node.index}:${frame.stage.index}:${phase}:${state.direction}:${chapter}`;
    if (state.labelKey !== labelKey) {
      $("caption").textContent = frame.copy[0];
      $("caption-detail").textContent = frame.copy[1];
      $("phase-label").textContent = phase === "moving" ? "Transforming" : phase === "merging" ? "Vertices meeting" : shape.name;
      document.querySelector(".phase-indicator").classList.toggle("adding", ["adding", "highlighting", "merging"].includes(phase));
      $("shape-stats").setAttribute("aria-label", `${frame.shapeComplete ? "Shape" : "Last completed shape"}: ${shape.vertices} vertices, ${shape.edges} edges, ${shape.faces} faces`);
      $("path-vertices").classList.toggle("active", chapter === "vertices");
      $("path-faces").classList.toggle("active", chapter === "faces");
      $("path-vertices").textContent = frame.paths.vertices.label.toUpperCase();
      $("path-faces").textContent = frame.paths.faces.label.toUpperCase();
      $("travel-direction").textContent = state.direction > 0 ? "\u2192" : "\u2190";
      $("travel-direction").setAttribute("aria-label", state.direction > 0 ? "Moving right" : "Moving left");
      const reverseLabel = `Reverse direction to move ${state.direction > 0 ? "left" : "right"}`;
      $("reverse").setAttribute("aria-label", reverseLabel);
      $("reverse").title = reverseLabel;
      $("highlight-label").textContent = frame.motion === "shrink" ? "Merging points" : "New points";
    }
    state.nodeIndex = node.index;
    state.labelKey = labelKey;
    if (phase === "adding" || phase === "highlighting") {
      const arrived = frame.focus.filter(value => value >= 0.5).length;
      const label = `${phase === "adding" ? "New vertices" : "Vertices in focus"}: ${arrived} / ${frame.stage.seeds.length}`;
      if ($("phase-label").textContent !== label) $("phase-label").textContent = label;
    }
    $("seek").value = frame.position;
    $("seek").style.setProperty("--progress", `${frame.position / (timeline.nodes.length - 1) * 100}%`);
    $("seek").setAttribute("aria-valuetext", `${shape.name}. Moving ${state.direction > 0 ? "right" : "left"}, ${increasing ? "increasing" : "decreasing"} ${chapter}. ${phase}.`);
    $("elapsed").textContent = formatTime(state.elapsed);
  }

  function draw(frame) {
    const { width: w, height: h } = state;
    const mobile = w <= 640;
    const center = [w * (mobile ? 0.5 : 0.625), h * (mobile ? 0.385 : 0.43)];
    const unit = Math.min(h * (mobile ? 0.125 : 0.225), w * (mobile ? 0.225 : 0.17)) * state.zoom;
    const { stage, geometryPhase: phase, points, progress, local, depthReveal } = frame;
    // Open to an oblique view so depth motion is visible, then return face-on to the plane.
    const orbitYaw = Math.atan2(Math.sin(state.orbitAngle), Math.cos(state.orbitAngle));
    const yaw = state.yaw + (orbitYaw - 0.7) * depthReveal;
    const pitch = state.pitch - 0.55 * depthReveal;
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
      const key = `${stage.index}:${frame.motion}:${Math.round(progress * 1200)}:${Math.round((frame.routeBlend || 0) * 1200)}`;
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

    if (frame.phase === "adding" && frame.motion === "grow") {
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
      if (state.playing && dt > 0) {
        let remaining = dt * state.speed;
        if (state.redirect) {
          const used = Math.min(remaining, redirectDuration - state.redirect.elapsed);
          state.redirect.elapsed += used;
          remaining -= used;
          if (state.redirect.elapsed >= redirectDuration) state.redirect = null;
        }
        if (remaining > 0) Object.assign(state, G.advanceLoop(timeline, state, remaining));
      }
      const frame = sample();
      if (state.orbit && state.playing && !state.dragging && frame.stage.fromDimension === 3 && frame.stage.dimension === 3) {
        const orbitSpeed = ["adding", "highlighting", "merging"].includes(frame.phase) ? 0.018 : frame.phase === "moving" ? 0.065 : 0.14;
        state.orbitAngle += dt * state.speed * orbitSpeed;
      }
      updateLabels(frame);
      draw(frame);
      syncMusic();
    }
    requestAnimationFrame(tick);
  }
  setPlaying(state.playing);
  setOrbit(state.orbit);
  requestAnimationFrame(tick);
})();
