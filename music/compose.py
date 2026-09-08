"""Becoming: four original chamber movements. Copyright 2026 David Smith.

GPL-2.0-only. Regenerate with: python music\\compose.py
No third-party modules, samples, borrowed melodies, or performance randomness.
The written quarter-note allocations and section/arrival markers are the geometry
contract; triplets, rubato-like rests and cadences live INSIDE those allocations.
"""
import base64
import hashlib
import struct
from fractions import Fraction
from pathlib import Path

PPQ = 480
ROOT = Path(__file__).resolve().parent

# Bass plus deliberately spaced inner voices; melody is independently written.
# Inversions are real bass changes, not parallel transpositions of one arpeggio.
HARMONY = {
    "D": (38, (50, 57, 62, 66)), "D/F#": (42, (54, 57, 62, 69)),
    "D/A": (45, (54, 57, 62, 66)), "Dopen": (38, (50, 57, 62, 69)),
    "A": (45, (52, 57, 61, 64)), "A/E": (40, (52, 57, 61, 64)),
    "A7": (45, (55, 57, 61, 64)), "A7sus": (45, (55, 57, 62, 64)),
    "Bm": (47, (54, 59, 62, 66)), "Em": (40, (52, 55, 59, 64)),
    "G": (43, (50, 55, 59, 62)), "G/B": (47, (55, 59, 62, 67)),
    "Gm": (43, (50, 55, 58, 62)), "Gm/D": (38, (55, 58, 62, 67)),
    "Dm": (38, (53, 57, 62, 65)), "Dm/F": (41, (53, 57, 62, 65)),
    "Dm/A": (45, (53, 57, 62, 65)), "Bb": (46, (53, 58, 62, 65)),
    "Ehalf": (40, (55, 58, 62, 64)), "C": (36, (52, 55, 60, 64)),
    "F": (41, (53, 57, 60, 65)), "Am": (45, (52, 57, 60, 64)),
    "D7": (38, (54, 60, 62, 69)), "D7sus": (38, (55, 60, 62, 69)),
    "Eb": (39, (55, 58, 63, 67)), "Cm": (36, (51, 55, 60, 63)),
    "F7": (41, (53, 57, 60, 63)),
}

# Each cell is one written four-quarter span: harmony, melody/rests, expression,
# articulation. The four vocabularies have independent contours and rhythms.
CELLS = {
    "A-out": {
        "seed": ("D", "D5:1.5 r:.5 A4:.75 r:1.25", -6, "air"),
        "echo": ("A/E", "E5:2 r:.5 C#5:.5 r:1", -5, "air"),
        "spark": ("D", "D5:.75 F#5:.25 A5:.5 r:.5 F#5:.75 E5:.25 D5:.5 r:.5", 2, "spring"),
        "answer": ("A/E", "C#5:.5 E5:.5 A5:1 r:.5 G5:.25 F#5:.25 E5:.5 r:.5", 0, "spring"),
        "branch": ("Bm", "F#5:1 D5:.5 B4:.5 r:.5 C#5:.25 D5:.25 F#5:.5 r:.5", -2, "spring"),
        "green": ("G", "G5:1.5 B5:.25 A5:.25 G5:.5 D5:.5 r:1", 3, "air"),
        "river": ("Em", "B5:.5 G5:.75 F#5:.25 E5:1 r:.5 G5:.5 B5:.5", 1, "spring"),
        "susp": ("A7sus", "D6:1.5 A5:.5 G5:.5 E5:.5 r:1", 3, "suspend"),
        "dominant": ("A7", "C#6:.75 B5:.25 A5:1 G5:.5 E5:.5 r:1", 4, "spring"),
        "close": ("D", "F#5:.5 E5:.5 D5:2 r:1", -4, "cadence"),
        "flare": ("D", "A5:.5 D6:.75 C#6:.25 B5:.5 A5:.25 G5:.25 F#5:.5 r:1", 6, "spring"),
        "inversion": ("D/F#", "F#5:.75 A5:.25 D6:1 A5:.5 F#5:.5 r:1", 3, "spring"),
        "plea": ("G/B", "B5:1 G5:.5 D6:.5 C#6:.25 B5:.25 A5:.5 r:1", 4, "air"),
        "echo2": ("A", "E6:.5 C#6:.5 A5:.75 r:.25 E5:.5 A5:.5 r:1", 1, "spring"),
        "still": ("D", "D6:2.5 A5:.5 r:1", -3, "cadence"),
        "cadence": ("D", "D5:2 r:2", -8, "cadence"),
    },
    "A-return": {
        "lament": ("Dm", "D5:1.5 E5:.5 F5:.75 r:.25 E5:.5 D5:.5", 1, "suspend"),
        "shadow": ("Dm/F", "A4:.75 D5:.25 F5:1.5 E5:.5 D5:.5 r:.5", -1, "suspend"),
        "sigh": ("Gm", "Bb4:1.5 A4:.5 G4:1 r:1", -3, "air"),
        "petition": ("Ehalf", "G5:.75 F5:.25 E5:1 Bb4:.5 D5:.5 r:1", 1, "suspend"),
        "susp": ("A7sus", "D5:2 E5:.5 G5:.5 r:1", 2, "suspend"),
        "dominant": ("A7", "C#5:1.5 D5:.25 C#5:.25 E5:.5 A4:.5 r:1", 2, "suspend"),
        "close": ("Dm", "F5:.75 E5:.25 D5:1.5 r:1.5", -5, "cadence"),
        "night": ("Bb", "D5:1.75 F5:.25 Bb5:.5 A5:.5 F5:.5 r:.5", 2, "suspend"),
        "memory": ("F", "A5:2 G5:.5 F5:.5 r:1", 1, "air"),
        "descent": ("C", "E5:.75 G5:.25 C6:.75 Bb5:.25 G5:.5 E5:.5 r:1", 2, "suspend"),
        "answer": ("Dm/A", "A5:.75 F5:.25 E5:.5 D5:.5 A4:1.25 r:.75", -2, "suspend"),
        "tear": ("Gm", "D5:.75 Bb4:.25 A4:.75 G4:.25 D5:1 r:1", -4, "air"),
        "hush": ("Dm", "D5:2.75 r:1.25", -7, "cadence"),
        "thread": ("A7", "A4:.75 C#5:.25 E5:1.5 r:1.5", -6, "air"),
        "pause": ("Dm", "F4:1 D5:1 r:2", -9, "cadence"),
        "dusk": ("Bb", "Bb4:2 D5:.5 F5:.5 r:1", -5, "air"),
    },
    "B-out": {
        "brook": ("G", "G5:1 B5:1/3 D6:2/3 B5:1 A5:2/3 r:1/3", 2, "dance"),
        "meadow": ("C", "E6:4/3 D6:1/3 C6:1/3 G5:1 r:1", 0, "air"),
        "sway": ("D/F#", "A5:2/3 F#5:1/3 D5:1 A5:1 B5:1/3 A5:1/3 r:1/3", 1, "dance"),
        "wing": ("G/B", "B5:1 D6:2/3 G6:1/3 D6:4/3 B5:1/3 r:1/3", 4, "dance"),
        "shade": ("Em", "E6:5/3 B5:1/3 G5:1 A5:1/3 B5:1/3 r:1/3", -1, "air"),
        "reeds": ("Am", "C6:2/3 B5:1/3 A5:1 E6:2/3 D6:1/3 C6:2/3 r:1/3", 1, "dance"),
        "poise": ("D7sus", "G5:4/3 A5:2/3 D6:1 C6:2/3 r:1/3", 3, "suspend"),
        "turn": ("D7", "F#5:2/3 A5:1/3 C6:1 B5:1/3 A5:1/3 F#5:1/3 r:1", 2, "dance"),
        "home": ("G", "B5:2/3 A5:1/3 G5:2 r:1", -4, "cadence"),
        "wide": ("G", "D6:5/3 B5:1/3 G5:2/3 D5:1/3 G5:2/3 r:1/3", 3, "air"),
        "sun": ("C", "G6:1 E6:1/3 D6:1/3 C6:1/3 E6:1 G6:2/3 r:1/3", 5, "dance"),
        "flight": ("Am", "A5:1/3 C6:1/3 E6:2/3 G6:2/3 E6:1 C6:2/3 r:1/3", 4, "dance"),
        "gather": ("D7", "A5:1/3 F#5:1/3 A5:1/3 D6:2/3 C6:1/3 A5:1 F#5:2/3 r:1/3", 5, "dance"),
        "rest": ("G", "G5:3 r:1", -6, "cadence"),
        "single": ("G", "G5:2.5 r:1.5", -7, "air"),
        "afar": ("D", "D6:1.75 A5:.75 r:1.5", -6, "air"),
        "return": ("C", "E5:1.5 G5:.5 C6:1 r:1", -5, "air"),
    },
    "B-return": {
        "veil": ("Gm", "G5:.5 Bb5:1.25 A5:.25 D6:.5 C6:.25 Bb5:.25 r:1", 0, "nocturne"),
        "ebb": ("Eb", "G5:1.75 F5:.25 Eb5:.5 Bb5:.5 r:1", -2, "air"),
        "tide": ("Cm", "Eb6:.75 D6:.25 C6:1 G5:.5 Bb5:.25 G5:.25 r:1", 1, "nocturne"),
        "lantern": ("F7", "A5:.5 Eb6:.75 D6:.25 C6:.75 A5:.25 F5:.5 r:1", 2, "nocturne"),
        "glass": ("Bb", "D6:1.25 C6:.25 Bb5:.5 F5:.75 D5:.25 r:1", 1, "nocturne"),
        "yearn": ("Gm/D", "Bb5:.75 A5:.25 G5:1.5 D5:.5 r:1", -2, "air"),
        "hold": ("D7sus", "G5:1.5 A5:.5 C6:.75 r:.25 A5:.5 r:.5", 2, "suspend"),
        "lead": ("D7", "F#5:.75 G5:.25 A5:.5 C6:.5 D6:.75 C6:.25 A5:.5 r:.5", 3, "nocturne"),
        "fall": ("Gm", "Bb5:.5 A5:.25 G5:1.75 D5:.5 r:1", -5, "cadence"),
        "drift": ("Eb", "Bb5:1.5 G5:.5 Eb5:1 r:1", -4, "air"),
        "coil": ("Cm", "G5:1/3 Eb5:1/3 G5:1/3 C6:1.5 Bb5:.5 G5:.5 r:.5", 0, "nocturne"),
        "frost": ("D7", "A5:1.25 C6:.25 F#5:1 G5:.25 F#5:.25 D5:.5 r:.5", 1, "nocturne"),
        "dim": ("Gm", "G5:2.25 Bb4:.75 r:1", -7, "air"),
        "low": ("Cm", "Eb5:1.5 D5:.5 C5:1 r:1", -8, "air"),
        "far": ("D7", "F#5:1.5 A5:.5 D5:1 r:1", -6, "air"),
        "sleep": ("Gm", "G5:2.5 r:1.5", -9, "cadence"),
    },
}

# Explicit through-composed periods, not scale-index arithmetic. Recurrences are
# ritornellos with new episodes, inversions, extensions and shortened returns.
PERIODS = {
    "A-out": [
        None,
        "seed echo seed green echo dominant cadence",
        "spark answer branch green susp dominant close",
        "spark inversion branch river green echo2 dominant close",
        "flare answer branch green river susp dominant still",
        "spark inversion plea echo2 branch river susp dominant close",
        "flare inversion branch green plea river echo2 susp dominant still",
        None,
    ],
    "A-return": [
        "lament shadow night memory sigh petition dominant close",
        "lament answer descent memory night tear susp dominant close",
        "shadow night memory descent sigh petition dominant hush",
        "lament night dusk sigh petition susp dominant close",
        "answer tear night memory sigh thread dominant hush",
        "lament sigh petition dominant close pause",
        "shadow tear thread close hush pause",
        None,
    ],
    "B-out": [
        None,
        "single afar return single meadow turn rest",
        "brook meadow shade reeds poise turn home",
        "brook sway wing shade meadow reeds turn home",
        "wide meadow flight shade wing poise turn home",
        "brook wing sun flight shade meadow reeds sway poise gather rest",
        "wide sun wing shade flight meadow reeds poise gather home",
        None,
    ],
    "B-return": [
        "veil ebb tide hold lead fall",
        "veil glass lantern tide drift coil yearn ebb tide hold frost lead fall sleep",
        "veil drift tide glass hold lead fall",
        "glass lantern tide ebb coil yearn hold frost fall sleep",
        "veil tide drift yearn far fall sleep",
        "dim low drift far fall dim sleep",
        "veil ebb low far fall dim sleep",
        None,
    ],
}

COUNTER = {
    "A-out": {
        "green": "r:2 D6:.75 B5:.25 G5:.5 r:.5",
        "branch": "r:2 F#6:1 D6:.5 r:.5",
        "close": "r:1 A5:1 F#5:.75 r:1.25",
        "inversion": "r:2 A5:.5 F#5:.5 D5:.5 r:.5",
        "still": "r:1 F#5:1 A5:.75 r:1.25",
    },
    "A-return": {
        "night": "r:2 F6:1 D6:.5 r:.5",
        "sigh": "r:1 D6:1.5 Bb5:.5 r:1",
        "close": "r:.5 A5:1 F5:.75 r:1.75",
    },
}

PHRASES = {
    "A-out": [20, 28, 28, 32, 32, 36, 40, 16],
    "A-return": [32, 36, 32, 32, 32, 24, 24, 12],
    "B-out": [24, 28, 28, 32, 32, 44, 40, 8],
    "B-return": [24, 56, 28, 40, 28, 28, 28, 12],
}


def midi_pitch(name):
    semitone = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}[name[0]]
    accidental = 1 if "#" in name else -1 if "b" in name else 0
    return 12 * (int(name[-1]) + 1) + semitone + accidental


def read_line(text):
    cursor = Fraction(0)
    result = []
    for token in text.split():
        name, length = token.split(":")
        duration = Fraction(length)
        if duration <= 0:
            raise ValueError("Non-positive written duration")
        if name != "r":
            result.append((float(cursor), float(duration), midi_pitch(name)))
        cursor += duration
    return result, float(cursor)


def vlq(value):
    result = [value & 127]
    while value >> 7:
        value >>= 7
        result.insert(0, (value & 127) | 128)
    return bytes(result)


def meta(kind, text):
    data = text.encode("ascii") if isinstance(text, str) else text
    return bytes([255, kind]) + vlq(len(data)) + data


def chunk(name, data):
    return name + struct.pack(">I", len(data)) + data


def compose():
    tracks = [[] for _ in range(6)]
    performed = []
    serial = 0

    def event(track, beat, message, priority=2):
        nonlocal serial
        tracks[track].append((round(beat * PPQ), priority, serial, message))
        serial += 1

    def marker(beat, text):
        event(0, beat, meta(6, text))

    def note(track, beat, duration, pitch, velocity):
        if not (0 <= pitch <= 127 and 0 < velocity <= 127 and duration > 0 and beat >= 0):
            raise ValueError("Invalid performed note")
        performed.append((track, round(beat * PPQ), round((beat + duration) * PPQ), pitch, velocity))

    def line(track, beat, text, velocity, expected=4, detached=False):
        notes, length = read_line(text)
        if length != expected:
            raise ValueError(f"Written line is {length}, expected {expected}: {text}")
        for onset, span, pitch in notes:
            breath = min(span * (0.16 if detached else 0.045), 0.11 if detached else 0.065)
            accent = 3 if onset == 0 else -3 if span < 0.5 else 0
            note(track, beat + onset, span - breath, pitch, max(18, velocity + accent))

    def chord(track, beat, duration, pitches, velocity):
        for voice, pitch in enumerate(pitches):
            note(track, beat, duration, pitch, max(18, velocity - (2 if voice < len(pitches) - 1 else 0)))

    for i, name in enumerate(["Becoming - original score", "Piano", "Strings", "Bass", "Light percussion", "Flute"]):
        event(i, 0, meta(3, name), 0)
    event(0, 0, meta(1, "Copyright 2026 David Smith; original composition; GPL-2.0-only"), 0)
    event(0, 0, meta(0x51, (625000).to_bytes(3, "big")), 0)  # 96 quarter notes/minute
    event(0, 0, meta(0x58, bytes([4, 2, 24, 8])), 0)
    for track, channel, program in [(1, 0, 0), (2, 1, 48), (3, 2, 32), (5, 3, 73)]:
        event(track, 0, bytes([0xC0 | channel, program]), 0)

    # Counts follow the active path, not vertex counts on the face path.
    legs = [
        ("A-out", False, [6, 5, 4, 3, 2, 1, 0], [2, 3, 4, 6, 8, 12, 20], 1),
        ("A-return", True, [1, 2, 3, 4, 5, 6, 7], [12, 8, 6, 4, 3, 2, 1], 20),
        ("B-out", False, [8, 9, 10, 11, 12, 13, 14], [0, 1, 4, 6, 8, 12, 20], 0),
        ("B-return", True, [13, 12, 11, 10, 9, 8, 7], [12, 8, 6, 4, 1, 0, 0], 20),
    ]

    movements = {
        "A-out": "I - First Light - Allegro germinando",
        "A-return": "II - The Long Shadow - Andante elegiaco",
        "B-out": "III - Air and Water - Pastorale in triplets",
        "B-return": "IV - Constellations at Rest - Notturno",
    }

    def accompany(leg, at, harmony, count, velocity, style, first, bar):
        bass, voices = HARMONY[harmony]
        cadence = style == "cadence"
        # Cadence chords release before the written breath, including inner voices.
        hold = 1.8 if cadence else 2.4 if style == "air" else 3.15
        if count >= 3:
            piano = voices if count >= 8 else voices[1:]
            if leg == "A-out":
                chord(1, at, 1.8 if cadence else 1.3 if style == "air" else 0.75, piano, velocity - 13)
                if count >= 8 and style == "spring":
                    chord(1, at + 1.5, 0.32, voices[1:3], velocity - 21)
                    chord(1, at + 2.75, 0.55, voices[1:], velocity - 17)
            elif leg == "A-return":
                chord(1, at, 1.7 if cadence else 1.4, piano, velocity - 16)
                if count >= 6 and style == "suspend":
                    chord(1, at + 2.25, 0.7, voices[1:3], velocity - 22)
            elif leg == "B-out":
                chord(1, at, 1.7 if cadence else 0.9 if style == "dance" else 2.2, piano, velocity - 18)
                if count >= 8 and style == "dance":
                    chord(1, at + 8 / 3, 0.8, voices[1:], velocity - 22)
            else:
                delay = 0 if first else 0.5
                chord(1, at + delay, 1.3 if cadence else 1.75, piano, velocity - 19)
                if count >= 6 and style == "nocturne":
                    note(1, at + 2.25, 0.5, voices[2] + 12, velocity - 22)
                    note(1, at + 3, 0.35, voices[1] + 12, velocity - 25)
        elif first and count > 0 and leg[0] == "A":
            # Small vertex forms have a dyad, not the full ensemble.
            upper = next(pitch for pitch in voices if pitch % 12 != bass % 12)
            chord(1, at, 1.3, (bass + 12, upper), velocity - 15)
        if count >= 4:
            note(3, at, 1.75 if cadence else 2.7 if leg != "A-out" else 1.4, bass, velocity - 11)
            if count >= 8 and style in ("spring", "dance"):
                answer = next(pitch - 12 for pitch in voices if pitch % 12 != bass % 12)
                note(3, at + (2.5 if leg == "A-out" else 3), 0.55, answer, velocity - 18)
        if count >= 6:
            # Three/four simultaneous bowed voices establish harmony at arrival.
            string_voices = voices if count >= 12 else voices[1:]
            chord(2, at, hold, string_voices, velocity - 23)
            if count >= 12 and style == "spring":
                chord(2, at + 3.25, 0.45, voices[1:], velocity - 27)
        if count >= 12:
            if first or (leg == "A-out" and style == "spring"):
                note(4, at, 0.12, 36 if leg[0] == "A" else 42, 30 if not leg.endswith("return") else 22)
            if leg == "A-out" and style == "spring" and bar % 2 == 0:
                note(4, at + 2.75, 0.08, 42, 23)
            elif leg == "B-out" and style == "dance":
                for offset in (2 / 3, 8 / 3):
                    note(4, at + offset, 0.07, 42, 22)

    def bridge(leg, at):
        # Both largest-shape arrivals remain major, then the third is removed.
        # Nothing from these scored gestures is allowed through the caesura.
        def tutti(offset, harmony, length, velocity, percussion=False):
            bass, voices = HARMONY[harmony]
            marker(at + offset, "harmony:" + leg + ":" + harmony)
            chord(1, at + offset, length, voices, velocity)
            chord(2, at + offset, length, voices, velocity - 13)
            note(3, at + offset, length, bass, velocity - 5)
            if percussion:
                note(4, at + offset, 0.16, 36, 34)

        if leg == "A-out":
            tutti(0, "D", 2.9, 67, True)
            line(1, at, "D6:1.5 F#5:.5 A5:.75 r:1.25", 76, detached=True)
            marker(at + 4, "turn:A:start")
            tutti(4, "Gm", 3.1, 51)
            line(5, at + 4, "Bb5:1.5 A5:.5 G5:.75 r:1.25", 51)
            tutti(8, "A7sus", 1.8, 48)
            line(5, at + 8, "D6:1.5 r:.5", 48, expected=2)
            marker(at + 10, "turn:A:dominant")
            tutti(10, "A7", 1.65, 60)
            line(1, at + 10, "C#5:1.25 E5:.5 r:.25", 61, expected=2)
            tutti(12, "A7", 1.7, 45)
            line(1, at + 12, "A4:.75 C#5:.5 E5:.5 r:2.25", 46)
            marker(at + 13.75, "turn:A:caesura")
        else:
            tutti(0, "G", 1.2, 67, True)
            line(5, at, "G6:.75 D6:.25 r:.5", 73, expected=1.5)
            marker(at + 1.5, "turn:B:start")
            tutti(1.5, "Eb", 1.1, 58)
            line(5, at + 1.5, "Eb6:.5 Bb5:.5 r:.5", 62, expected=1.5)
            tutti(3, "Cm", 1.25, 51)
            line(5, at + 3, "G5:.5 Eb5:.75 r:.25", 53, expected=1.5)
            tutti(4.5, "D7sus", 0.43, 47)
            marker(at + 5, "turn:B:dominant")
            tutti(5, "D7", 1.45, 57)
            line(5, at + 5, "F#5:.5 A5:.5 D5:.5 r:1.5", 53, expected=3)
            marker(at + 6.5, "turn:B:caesura")

    beat = 0
    for leg, minor, stages, counts, initial in legs:
        marker(beat, "section:" + leg)
        marker(beat, "movement:" + movements[leg])
        if minor:
            marker(beat, "turn:" + leg[0] + ":resolve")
            # The transport's quiet reverse cue takes the first melodic onset.
            # A restrained root below the inner voices makes that cue the tonic.
            root = HARMONY["Dm" if leg[0] == "A" else "Gm"][0]
            note(1, beat, 1.7, root, 43 if leg[0] == "A" else 41)
        event(0, beat, meta(0x59, bytes([(-1 if leg[0] == "A" else -2) & 255, 1])
                           if minor else bytes([2 if leg[0] == "A" else 1, 0])))
        levels = [initial] + counts
        for phrase, (length, count) in enumerate(zip(PHRASES[leg], levels)):
            marker(beat, f"phrase:{leg}:{phrase}")
            if phrase:
                marker(beat, f"arrival:{leg}:{stages[phrase - 1]}")
            if phrase == 0 and leg == "A-out":
                marker(beat, "gesture:Point - distant unaccompanied breath")
                line(5, beat, "D5:3.5 r:2.5 A5:4 r:1.5 E5:2.5 r:1 D6:2.25 r:2.75", 29, expected=20)
            elif phrase == 0 and leg == "B-out":
                line(5, beat, "G5:2.5 r:.5 B5:1 r:2 D6:2 r:1 A5:1 r:1 G5:2.5 r:.5 D5:3 r:1 E5:1.5 r:.5 D5:1.25 r:2.75", 33, expected=24)
            elif phrase == 7 and not minor:
                bridge(leg, beat)
            elif phrase == 7 and leg == "A-return":
                marker(beat, "cadence:shared D-A opens toward G")
                line(1, beat, "D5:2.25 r:1.75 A4:1.5 r:.5 D5:1 r:5", 29, expected=12)
                line(5, beat, "r:8 G5:2.5 r:1.5", 25, expected=12)
            elif phrase == 7 and leg == "B-return":
                marker(beat, "cadence:G minor dissolves to open D-A")
                line(5, beat, "D5:2 r:1 A4:1.5 r:1.5 D5:2.75 r:3.25", 26, expected=12)
                chord(1, beat + 6, 2.0, (50, 57), 20)
            else:
                period = PERIODS[leg][phrase].split()
                if len(period) * 4 != length:
                    raise ValueError(f"Phrase allocation changed: {leg}:{phrase}")
                base = {"A-out": 39, "A-return": 34, "B-out": 37, "B-return": 32}[leg]
                growth = 1.5 if not minor else 1.15
                for bar, cell_name in enumerate(period):
                    harmony, tune, expression, style = CELLS[leg][cell_name]
                    at = beat + bar * 4
                    velocity = round(base + count * growth + expression)
                    marker(at, "harmony:" + leg + ":" + harmony)
                    lead_track = 1 if leg[0] == "A" else 5
                    line(lead_track, at, tune, velocity, detached=(leg == "A-out" and style == "spring"))
                    accompany(leg, at, harmony, count, velocity, style, bar == 0, bar)
                    counter = COUNTER.get(leg, {}).get(cell_name)
                    if count >= 8 and counter:
                        line(5, at, counter, velocity - 12)
                marker(beat + length - 4, f"cadence:{leg}:{phrase}")
            beat += length
    marker(beat, "end")
    # A piano key is released before being struck again, even where voices meet.
    grouped = {}
    for track, start, end, pitch, velocity in performed:
        hits = grouped.setdefault((track, pitch), {})
        old_end, old_velocity = hits.get(start, (0, 0))
        hits[start] = (max(end, old_end), max(velocity, old_velocity))
    for (track, pitch), hits in sorted(grouped.items()):
        starts = sorted(hits)
        channel = [0, 0, 1, 2, 9, 3][track]
        for i, start in enumerate(starts):
            end, velocity = hits[start]
            if i + 1 < len(starts):
                end = min(end, starts[i + 1])
            if not (0 <= start < end <= round(beat * PPQ)):
                raise ValueError("Unpaired or out-of-score note")
            event(track, start / PPQ, bytes([0x90 | channel, pitch, velocity]))
            event(track, end / PPQ, bytes([0x80 | channel, pitch, 0]), 1)
    encoded = []
    for track in tracks:
        data, previous = bytearray(), 0
        for tick, _, _, message in sorted(track):
            data.extend(vlq(tick - previous) + message)
            previous = tick
        data.extend(vlq(round(beat * PPQ) - previous) + meta(0x2F, b""))
        encoded.append(chunk(b"MTrk", data))
    return chunk(b"MThd", struct.pack(">HHH", 1, len(tracks), PPQ)) + b"".join(encoded)


def main():
    midi = compose()
    (ROOT / "becoming.mid").write_bytes(midi)
    text = base64.b64encode(midi).decode("ascii")
    (ROOT / "score-data.js").write_text(
        "// Generated by music/compose.py; Copyright 2026 David Smith; original score, GPL-2.0-only. Do not edit.\n"
        '"use strict";\nwindow.BecomingScore = "' + text + '";\n', encoding="ascii", newline="\n")
    runtime_assets = [ROOT / "becoming.mid", ROOT / "score-data.js",
                      ROOT.parent / "midi.js", ROOT.parent / "music.js"]
    total = sum(path.stat().st_size for path in runtime_assets)
    if total > 200 * 1024:
        raise ValueError(f"Music exceeds 200 KiB budget: {total}")
    print(f"MIDI: {len(midi)} bytes; runtime music assets: {total} bytes; SHA-256 {hashlib.sha256(midi).hexdigest()}")


if __name__ == "__main__":
    main()
