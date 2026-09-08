"use strict";

window.Music = (() => {
  const G = window.Geometry;
  const HORIZON = 0.08, MAX_VOICES = 48;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const mod = (v, n) => ((v % n) + n) % n;
  const legs = ["A-out", "A-return", "B-out", "B-return"];
  async function resume(context) {
    let timeout;
    try {
      await Promise.race([context.resume(), new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error("Audio permission timed out; click Music to retry")), 4000);
      })]);
    } finally { clearTimeout(timeout); }
  }

  function section(timeline, playback) {
    const vertices = playback.time < timeline.center.time ||
      (playback.time === timeline.center.time && playback.direction > 0);
    return vertices ? (playback.direction > 0 ? "A-out" : "A-return")
      : (playback.direction < 0 ? "B-out" : "B-return");
  }

  function intensity(timeline, playback) {
    const frame = G.sampleTimeline(timeline, playback);
    const path = section(timeline, playback)[0] === "A" ? "vertices" : "faces";
    const stage = frame.stage, previous = timeline.stages[Math.max(0, stage.index - 1)];
    const count = previous[path] + (stage[path] - previous[path]) * frame.progress;
    return { path, count, value: clamp((count - (path === "vertices" ? 1 : 0)) / (path === "vertices" ? 19 : 20)) };
  }

  // Query the same semantic predicate as captions/highlights. This also includes
  // early completed removal fades, and reverse growth's retirement of all seeds.
  function completion(timeline, stage, direction) {
    const target = direction > 0 ? stage.index - 1 : stage.index;
    const completed = time => {
      const f = G.sampleTimeline(timeline, { time, direction });
      return f.shapeComplete && f.displayStage.index === target;
    };
    let lo = stage.start, hi = stage.start + stage.duration - 1e-7;
    if (direction > 0) hi = stage.start + stage.add + stage.morph;
    if ((direction > 0 && !completed(lo)) || (direction < 0 && !completed(hi))) {
      throw new Error(`No geometric completion for stage ${stage.index}, direction ${direction}`);
    }
    for (let i = 0; i < 48; i++) {
      const mid = (lo + hi) / 2;
      if (completed(mid) === (direction < 0)) hi = mid;
      else lo = mid;
    }
    return (lo + hi) / 2;
  }

  function makeModel(timeline, score) {
    const a = timeline.center.time - timeline.minTime;
    const b = timeline.maxTime - timeline.center.time;
    const boundaries = [0, a, 2 * a, 2 * a + b, timeline.period];
    const anchors = legs.map((leg, i) => ({ name: `section:${leg}`, position: boundaries[i] }));
    const arrivals = [];
    for (const stage of timeline.stages.slice(1)) {
      for (const direction of [1, -1]) {
        const time = completion(timeline, stage, direction);
        const leg = section(timeline, { time, direction });
        const index = direction > 0 ? stage.index - 1 : stage.index;
        const position = G.advanceLoop(timeline, { time, direction }, 0).elapsed;
        const arrival = { name: `arrival:${leg}:${index}`, position, time, direction, index, leg };
        arrivals.push(arrival); anchors.push(arrival);
      }
    }
    anchors.push({ name: "end", position: timeline.period });
    for (const anchor of anchors) {
      const matches = score.markers.filter(m => m.name === anchor.name);
      if (matches.length !== 1) throw new Error(`Missing or duplicate MIDI marker: ${anchor.name}`);
      anchor.tick = matches[0].tick;
    }
    if (score.markers.filter(m => m.name.startsWith("arrival:")).length !== arrivals.length) {
      throw new Error("Unexpected MIDI arrival markers");
    }
    anchors.sort((x, y) => x.position - y.position);
    for (let i = 1; i < anchors.length; i++) {
      if (anchors[i].tick <= anchors[i - 1].tick || anchors[i].position <= anchors[i - 1].position) {
        throw new Error("MIDI and geometry marker orders disagree");
      }
    }
    function interpolate(value, from, to) {
      const v = clamp(value, anchors[0][from], anchors[anchors.length - 1][from]);
      let lo = 0, hi = anchors.length - 1;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (anchors[mid][from] <= v) lo = mid;
        else hi = mid;
      }
      const x = anchors[lo], y = anchors[hi];
      return x[to] + (y[to] - x[to]) * (v - x[from]) / (y[from] - x[from]);
    }
    const positionAtTick = tick => interpolate(tick, "tick", "position");
    const tickAtPosition = position => interpolate(position, "position", "tick");
    const notes = score.notes.map((note, id) => {
      const start = positionAtTick(note.tick), end = positionAtTick(note.endTick);
      return { ...note, id, start, duration: end - start,
        instrument: note.channel === 9 ? "percussion" : note.channel === 1 ? "strings"
          : note.channel === 2 ? "bass" : note.channel === 3 ? "flute" : "piano" };
    });
    for (const leg of legs) {
      const anchor = anchors.find(a => a.name === `section:${leg}`);
      if (!notes.some(n => n.tick === anchor.tick && ["piano", "flute"].includes(n.instrument))) {
        throw new Error(`Missing melodic onset for music section ${leg}`);
      }
    }
    return { timeline, score, boundaries, anchors, arrivals, notes, positionAtTick, tickAtPosition };
  }

  function project(timeline, anchor, seconds) {
    return G.advanceLoop(timeline, anchor, clamp(seconds, 0, HORIZON) * anchor.speed);
  }

  function createSynth(context, destination = context.destination) {
    const master = context.createGain(), compressor = context.createDynamicsCompressor();
    master.gain.value = 0.35;
    compressor.threshold.value = -18; compressor.knee.value = 18;
    compressor.ratio.value = 4; compressor.attack.value = 0.004; compressor.release.value = 0.18;
    master.connect(compressor); compressor.connect(destination);
    const voices = new Set();
    const noise = context.createBuffer(1, Math.ceil(context.sampleRate * 0.25), context.sampleRate);
    let seed = 1234567;
    const samples = noise.getChannelData(0);
    for (let i = 0; i < samples.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      samples[i] = seed / 2147483648 - 1;
    }
    function volume(value) {
      master.gain.setTargetAtTime(clamp(value) * 0.7, context.currentTime, 0.025);
    }
    function stopSource(source, when = context.currentTime) {
      try { source.stop(when); }
      catch (error) {
        // Cleanup may include a source whose initialization never reached start().
        if (error.name !== "InvalidStateError") throw error;
      }
    }
    function voice(note, when, duration, strength = 0, token = 0) {
      if (voices.size >= MAX_VOICES) {
        // Disconnect an already released voice first; otherwise steal the oldest.
        const oldest = [...voices].find(v => v.end <= context.currentTime) || voices.values().next().value;
        oldest.dispose();
      }
      const start = Math.max(context.currentTime, when);
      const release = note.instrument === "flute" ? 0.22 : note.instrument === "strings" ? 0.18 : 0.10;
      const length = clamp(duration, 0.025, 12), end = start + length + release;
      const gain = context.createGain(), sources = [], nodes = [gain];
      gain.connect(master);
      const frequency = 440 * 2 ** ((note.pitch - 69) / 12);
      const level = note.velocity / 127 * (0.028 + 0.024 * clamp(strength));
      let disposed = false, stopped = false;
      function dispose() {
        if (disposed) return;
        disposed = true;
        for (const source of sources) stopSource(source);
        for (const node of [...sources, ...nodes]) node.disconnect();
        voices.delete(handle);
      }
      const handle = { start, end, token, instrument: note.instrument, dispose,
        release(at = context.currentTime) {
          if (disposed || stopped) return;
          stopped = true;
          if (start > at) { dispose(); return; }
          if (gain.gain.cancelAndHoldAtTime) gain.gain.cancelAndHoldAtTime(at);
          else { gain.gain.cancelScheduledValues(at); gain.gain.setValueAtTime(gain.gain.value, at); }
          gain.gain.linearRampToValueAtTime(0, at + 0.035);
          for (const source of sources) stopSource(source, at + 0.04);
          handle.end = at + 0.04;
        }
      };
      voices.add(handle);
      function oscillator(type, hz, amount, decay = 0) {
        const osc = context.createOscillator(), partial = context.createGain();
        osc.type = type; osc.frequency.value = hz;
        partial.gain.setValueAtTime(amount, start);
        if (decay) partial.gain.exponentialRampToValueAtTime(Math.max(0.0001, amount * 0.02), start + decay);
        osc.connect(partial); partial.connect(gain);
        nodes.push(partial); sources.push(osc);
      }
      if (note.instrument === "piano") {
        oscillator("sine", frequency, 1, Math.min(3.8, length + 0.1));
        oscillator("sine", frequency * 2.002, 0.36, Math.min(1.1, length));
        oscillator("sine", frequency * 3.006, 0.13, Math.min(0.55, length));
      } else if (note.instrument === "flute") {
        oscillator("sine", frequency, 0.85);
        oscillator("sine", frequency * 2, 0.16);
        oscillator("sine", frequency * 3, 0.035);
        const vibrato = context.createOscillator(), depth = context.createGain();
        vibrato.frequency.value = 4.8;
        depth.gain.setValueAtTime(0, start);
        depth.gain.linearRampToValueAtTime(6, start + Math.min(0.8, length * 0.65));
        vibrato.connect(depth);
        for (const source of sources) depth.connect(source.detune);
        nodes.push(depth); sources.push(vibrato);
        const breath = context.createBufferSource(), filter = context.createBiquadFilter();
        const breathGain = context.createGain();
        breath.buffer = noise; breath.loop = true;
        filter.type = "bandpass"; filter.frequency.value = frequency * 2.5; filter.Q.value = 0.8;
        breathGain.gain.value = 0.022;
        breath.connect(filter); filter.connect(breathGain); breathGain.connect(gain);
        sources.push(breath); nodes.push(filter, breathGain);
      } else if (note.instrument === "strings") {
        const filter = context.createBiquadFilter();
        filter.type = "lowpass"; filter.frequency.value = 1600; filter.Q.value = 0.5;
        gain.disconnect(); gain.connect(filter); filter.connect(master); nodes.push(filter);
        oscillator("sawtooth", frequency * 0.998, 0.20);
        oscillator("triangle", frequency * 1.002, 0.28);
      } else if (note.instrument === "bass") {
        oscillator("triangle", frequency, 0.8);
        oscillator("sine", frequency * 2, 0.12);
      } else {
        if (note.pitch === 36) {
          oscillator("sine", 90, 0.7);
          sources[0].frequency.exponentialRampToValueAtTime(38, start + 0.1);
        } else {
          const source = context.createBufferSource(), filter = context.createBiquadFilter();
          source.buffer = noise; filter.type = "highpass"; filter.frequency.value = 6500;
          source.connect(filter); filter.connect(gain); sources.push(source); nodes.push(filter);
        }
      }
      const attack = Math.min(note.instrument === "flute" ? 0.12 : note.instrument === "strings" ? 0.09 : 0.008, length / 3);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(level, start + attack);
      if (note.instrument === "flute" && length > 0.4) {
        gain.gain.linearRampToValueAtTime(level * 0.82, start + length * 0.75);
      }
      gain.gain.linearRampToValueAtTime(note.instrument === "flute" ? level * 0.72 : level, start + length);
      gain.gain.linearRampToValueAtTime(0, end);
      let ended = 0;
      for (const source of sources) {
        source.onended = () => { if (++ended === sources.length) dispose(); };
        source.start(start); source.stop(end);
      }
      return handle;
    }
    const releaseAll = () => { for (const v of voices) v.release(); };
    function dispose() {
      for (const v of [...voices]) v.dispose();
      master.disconnect(); compressor.disconnect();
    }
    return { voice, volume, releaseAll, dispose, voices, master, compressor };
  }

  class Player {
    constructor(timeline, options = {}) {
      this.timeline = timeline;
      this.options = options;
      this.enabled = false; this.volume = 0.5; this.generation = 0;
      this.context = null; this.synth = null; this.model = null; this.anchor = null;
      this.timer = null; this.pendingEnable = 0; this.scheduled = new Map();
      this.cursor = null; this.cyclePosition = 0; this.last = null;
      this.lifecycle = 0;
      this.stats = { scheduled: 0, cancellations: 0, maxError: 0, lastError: 0, maxVoices: 0 };
    }
    report(text, error = null) {
      if (text === this.statusText && Boolean(error) === this.statusError) return;
      this.statusText = text; this.statusError = Boolean(error);
      if (error) console.error("Becoming music:", error);
      if (this.options.status) this.options.status(text, Boolean(error));
    }
    async enable() {
      const request = ++this.pendingEnable;
      try {
        if (!this.model) this.model = makeModel(this.timeline, window.Midi.parse(window.Midi.decode(window.BecomingScore)));
        if (!this.context) {
          const Context = window.AudioContext || window.webkitAudioContext;
          if (!Context && !this.options.context) throw new Error("Web Audio is not supported in this browser");
          this.context = this.options.context || new Context({ latencyHint: "interactive" });
          this.synth = createSynth(this.context);
          this.synth.volume(this.volume);
          this.context.onstatechange = () => {
            if (this.enabled && this.context.state !== "running" && !this.anchor?.hidden) {
              this.cancel();
              this.report("Audio suspended — toggle Music to resume.");
            }
          };
        }
        this.report("Starting music…");
        if (this.context.state !== "running") await resume(this.context);
        if (request !== this.pendingEnable) return false;
        if (this.context.state !== "running") throw new Error("Audio blocked; use the Music button to try again");
        this.enabled = true;
        this.cancel();
        this.report(this.anchor && !this.anchor.playing ? "Music on · paused" : "Music on");
        this.update(this.last || this.anchor, true);
        return true;
      } catch (error) {
        if (request !== this.pendingEnable) return false;
        this.enabled = false; this.cancel();
        this.report(`Music unavailable: ${error.message}. Toggle Music to retry.`, error);
        return false;
      }
    }
    disable() {
      this.pendingEnable++; this.enabled = false; this.cancel(); this.report("Music off");
    }
    setVolume(value) {
      this.volume = clamp(value);
      if (this.synth) this.synth.volume(this.volume);
    }
    cancel() {
      this.generation++; this.stats.cancellations++;
      if (this.synth) this.synth.releaseAll();
      if (this.timer !== null) { clearInterval(this.timer); this.timer = null; }
      this.scheduled.clear(); this.cursor = null;
    }
    joinPosition(position, now, speed) {
      // Rearticulate only MIDI notes still sounding at a manually entered
      // position, never an expired note or a separately maintained harmony.
      const notes = this.model.notes.filter(n => ["piano", "flute"].includes(n.instrument) &&
        n.start < position - 0.01 && n.start + n.duration > position);
      for (const note of notes.slice(-3)) {
        this.synth.voice({ ...note, velocity: Math.round(note.velocity * 0.65) }, now,
          Math.min(0.7, (note.start + note.duration - position) / speed), 0, this.generation);
      }
    }
    update(playback, discontinuity = false) {
      if (!playback) return;
      const next = { time: playback.time, direction: playback.direction, speed: playback.speed,
        playing: playback.playing, hidden: Boolean(playback.hidden), redirect: Boolean(playback.redirect) };
      this.last = next;
      if (!this.context || !this.enabled) { this.anchor = next; return; }
      const now = this.context.currentTime, previous = this.anchor;
      const position = G.advanceLoop(this.timeline, next, 0).elapsed;
      let reset = discontinuity || !previous || previous.audioTime === undefined;
      if (!reset) {
        const wall = now - previous.audioTime;
        const expected = previous.position + (previous.playing && !previous.hidden && !previous.redirect ? wall * previous.speed : 0);
        const error = Math.abs(mod(position - expected + this.timeline.period / 2, this.timeline.period) - this.timeline.period / 2) / next.speed;
        this.stats.lastError = error;
        // Small frame jitter is tolerated, but never carry a stalled visual clock.
        reset = error > 0.025 || wall > HORIZON + 0.025 || next.playing !== previous.playing ||
          next.hidden !== previous.hidden || next.redirect !== previous.redirect || next.speed !== previous.speed;
        if (!reset) this.stats.maxError = Math.max(this.stats.maxError, error);
      }
      if (reset) {
        this.cancel(); this.cyclePosition = position;
      } else {
        this.cyclePosition += mod(position - previous.position, this.timeline.period);
      }
      this.anchor = { ...next, audioTime: now, position, absolute: this.cyclePosition };
      if (reset) this.report(next.hidden ? "Music on · tab hidden" : !next.playing ? "Music on · paused"
        : next.redirect ? "Music on · changing direction" : "Music on");
      if (this.context.state !== "running" && !next.hidden) {
        this.report("Audio suspended — toggle Music to resume.");
        return;
      }
      if (!next.playing || next.hidden) return;
      if (next.redirect) {
        if (reset) {
          const marker = this.model.anchors.find(a => a.name === `section:${section(this.timeline, next)}`);
          const tonic = this.model.notes.find(n => n.tick === marker.tick && ["piano", "flute"].includes(n.instrument));
          this.synth.voice({ ...tonic, instrument: "strings", velocity: 22 }, now, 1.5 / next.speed, 0, this.generation);
        }
        return;
      }
      if (reset && (discontinuity || previous?.redirect || !previous?.playing)) this.joinPosition(position, now, next.speed);
      if (this.cursor === null) this.cursor = this.cyclePosition - 1e-8;
      this.pump();
      if (this.timer === null && !this.options.manual) this.timer = setInterval(() => {
        try { this.pump(); }
        catch (error) {
          this.enabled = false; this.cancel();
          this.report("Music stopped after an audio error. Toggle Music to retry.", error);
        }
      }, 20);
    }
    pump() {
      const a = this.anchor;
      if (!this.enabled || !a || !a.playing || a.hidden || a.redirect || this.context.state !== "running") return;
      const now = this.context.currentTime, age = now - a.audioTime;
      // Never project farther than 80ms beyond the latest accepted visual frame.
      if (age > HORIZON) {
        if (this.timer !== null) { clearInterval(this.timer); this.timer = null; }
        this.synth.releaseAll();
        return;
      }
      const future = project(this.timeline, a, HORIZON);
      const distance = mod(future.elapsed - a.position, this.timeline.period);
      const end = a.absolute + distance;
      const floor = Math.max(this.cursor, a.absolute + Math.max(0, age) * a.speed - 0.004 * a.speed);
      const period = this.timeline.period;
      for (let cycle = Math.floor(floor / period); cycle <= Math.floor(end / period); cycle++) {
        const lower = floor - cycle * period, upper = end - cycle * period;
        let lo = 0, hi = this.model.notes.length;
        while (lo < hi) {
          const mid = (lo + hi) >> 1;
          if (this.model.notes[mid].start <= lower) lo = mid + 1;
          else hi = mid;
        }
        for (let i = lo; i < this.model.notes.length && this.model.notes[i].start <= upper; i++) {
          const note = this.model.notes[i], position = cycle * period + note.start;
          const key = `${cycle}:${note.id}`;
          if (this.scheduled.has(key)) continue;
          const when = a.audioTime + (position - a.absolute) / a.speed;
          if (when < now - 0.01) continue;
          const projected = project(this.timeline, a, Math.max(0, when - a.audioTime));
          const strength = intensity(this.timeline, projected).value;
          const v = this.synth.voice(note, Math.max(now, when), note.duration / a.speed, strength, this.generation);
          this.scheduled.set(key, v.end);
          this.stats.scheduled++;
          if (this.options.onSchedule) this.options.onSchedule({ note, when, position, generation: this.generation, anchor: a });
        }
      }
      this.cursor = end;
      for (const [key, until] of this.scheduled) if (until < now) this.scheduled.delete(key);
      this.stats.maxVoices = Math.max(this.stats.maxVoices, this.synth.voices.size);
    }
    async visibility(hidden) {
      const request = ++this.lifecycle;
      this.update({ ...this.last, hidden }, true);
      if (!this.context) return;
      try {
        if (hidden && this.context.state === "running") {
          await this.context.suspend();
          if (request === this.lifecycle) {
            for (const voice of [...this.synth.voices]) voice.dispose();
          }
        }
        else if (!hidden && this.enabled) {
          await resume(this.context);
          if (request !== this.lifecycle) return;
          if (this.context.state !== "running") throw new Error("Audio remains suspended");
          this.update(this.last, true);
        }
      } catch (error) { this.report("Audio suspended — toggle Music to resume.", error); }
    }
    dispose() {
      this.disable();
      if (this.synth) this.synth.dispose();
      if (this.context) {
        this.context.onstatechange = null;
        if (this.context.close) return this.context.close();
      }
    }
    get snapshot() {
      return { enabled: this.enabled, volume: this.volume, generation: this.generation,
        anchor: this.anchor && { ...this.anchor }, voices: this.synth ? this.synth.voices.size : 0,
        scheduled: this.scheduled.size, stats: { ...this.stats } };
    }
  }
  return { HORIZON, MAX_VOICES, section, intensity, completion, makeModel, project, createSynth, Player };
})();
