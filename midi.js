"use strict";

window.Midi = (() => {
  const required = ["A-out", "A-return", "B-out", "B-return"];
  function decode(base64) {
    if (typeof base64 !== "string" || !base64.length) throw new Error("Missing embedded MIDI score");
    return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  }

  function parse(bytes) {
    if (!(bytes instanceof Uint8Array)) throw new Error("MIDI requires bytes");
    let offset = 0, limit = bytes.length;
    const fail = text => { throw new Error(`Invalid MIDI: ${text} (byte ${offset})`); };
    const byte = () => { if (offset >= limit) fail("truncated data"); return bytes[offset++]; };
    const uint = n => { let value = 0; while (n--) value = value * 256 + byte(); return value; };
    const text = n => { let value = ""; while (n--) value += String.fromCharCode(byte()); return value; };
    const vlq = () => {
      let value = 0;
      for (let i = 0; i < 4; i++) {
        const b = byte(); value = value * 128 + (b & 127);
        if (!(b & 128)) return value;
      }
      return fail("overlong variable-length quantity");
    };
    if (text(4) !== "MThd" || uint(4) !== 6) fail("unsupported header");
    const format = uint(2), tracks = uint(2), ppq = uint(2);
    if (format !== 1 || tracks < 2 || !ppq || ppq & 0x8000) fail("requires type 1 and positive PPQ timing");
    const events = [], markers = [], tempos = [], programs = [], keys = [];
    let endTick = 0;
    for (let track = 0; track < tracks; track++) {
      limit = bytes.length;
      if (text(4) !== "MTrk") fail("missing track chunk");
      const size = uint(4), end = offset + size;
      if (end > bytes.length) fail("track exceeds file");
      limit = end;
      let tick = 0, running = 0, order = 0, ended = false;
      while (offset < end) {
        tick += vlq();
        let status = byte(), first;
        if (status < 128) {
          if (!running) fail("running status without channel status");
          first = status; status = running;
        }
        const base = { tick, track, order: order++ };
        if (status === 255) {
          running = 0;
          const kind = byte(), length = vlq();
          if (offset + length > end) fail("metadata exceeds track");
          if (kind === 0x2F) {
            if (length !== 0 || offset !== end) fail("invalid end-of-track");
            ended = true;
          } else if (kind === 6) markers.push({ ...base, name: text(length) });
          else if (kind === 0x51) {
            if (length !== 3) fail("invalid tempo");
            const microseconds = uint(3);
            if (!microseconds) fail("zero tempo");
            tempos.push({ ...base, microseconds });
          } else if (kind === 0x59) {
            if (length !== 2) fail("invalid key signature");
            const raw = byte(), minor = byte(), sharps = raw > 127 ? raw - 256 : raw;
            if (Math.abs(sharps) > 7 || minor > 1) fail("invalid key signature");
            keys.push({ ...base, sharps, minor });
          } else if (kind === 0x58) {
            if (length !== 4) fail("invalid time signature");
            const numerator = byte(), denominator = byte(); byte(); byte();
            if (!numerator || denominator > 7) fail("invalid time signature");
          } else offset += length;
        } else if (status === 0xF0 || status === 0xF7) {
          running = 0;
          const length = vlq();
          if (offset + length > end) fail("SysEx exceeds track");
          offset += length;
        } else {
          if (status >= 0xF0) fail("unsupported system event");
          running = status;
          const kind = status >> 4, channel = status & 15;
          const a = first === undefined ? byte() : first;
          const b = kind === 0xC || kind === 0xD ? 0 : byte();
          if (a > 127 || b > 127) fail("invalid channel data");
          if (kind === 8 || kind === 9) events.push({ ...base, channel, pitch: a, velocity: b,
            on: kind === 9 && b > 0 });
          else if (kind === 0xC) programs.push({ ...base, channel, program: a });
        }
      }
      if (!ended) fail("missing end-of-track");
      endTick = Math.max(endTick, tick);
    }
    if (offset !== bytes.length) fail("trailing bytes");
    const compare = (a, b) => a.tick - b.tick || a.track - b.track || a.order - b.order;
    [events, markers, tempos, programs, keys].forEach(list => list.sort(compare));
    const active = new Map(), notes = [];
    for (const e of events) {
      const key = `${e.track}:${e.channel}:${e.pitch}`;
      if (e.on) {
        if (!active.has(key)) active.set(key, []);
        active.get(key).push(e);
      } else {
        const queue = active.get(key);
        if (!queue || !queue.length) fail("unpaired note-off");
        const start = queue.shift();
        if (start.tick >= e.tick) fail("nonpositive note length");
        notes.push({ ...start, endTick: e.tick });
      }
    }
    if ([...active.values()].some(queue => queue.length)) fail("unreleased note");
    if (!notes.length || !tempos.length || tempos[0].tick !== 0) fail("missing notes or initial tempo");
    let last = -1;
    for (const leg of required) {
      const matches = markers.filter(m => m.name === `section:${leg}`);
      if (matches.length !== 1 || matches[0].tick <= last) fail(`missing, duplicate, or unordered section ${leg}`);
      last = matches[0].tick;
    }
    const ends = markers.filter(m => m.name === "end");
    if (markers.find(m => m.name === "section:A-out").tick !== 0 ||
        ends.length !== 1 || ends[0].tick !== endTick || last >= endTick) fail("invalid score boundaries");
    notes.sort(compare);
    function seconds(tick) {
      if (!Number.isFinite(tick) || tick < 0 || tick > endTick) throw new Error("MIDI tick out of range");
      let total = 0, previous = 0, tempo = tempos[0].microseconds;
      for (const change of tempos) {
        if (change.tick > tick) break;
        total += (change.tick - previous) / ppq * tempo / 1e6;
        previous = change.tick; tempo = change.microseconds;
      }
      return total + (tick - previous) / ppq * tempo / 1e6;
    }
    return { format, tracks, ppq, endTick, notes, markers, tempos, programs, keys, seconds };
  }
  return { decode, parse };
})();
