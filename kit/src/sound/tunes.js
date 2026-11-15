const byChord = (chords, patterns) => chords.split(" ").map((chord) => patterns[chord]).join(" ");

const PLAYFUL_CHORDS = "C Am F G C Am DmG C F G Em Am Dm G C C";

const PLAYFUL_MELODY = [
  "E5:2 G5:1 E5:1 C5:2 D5:2", "E5:2 A5:2 G5:2 E5:2", "F5:1 E5:1 D5:2 A4:2 C5:2", "B4:2 D5:2 G5:3 r:1",
  "E5:2 G5:1 E5:1 C5:2 D5:2", "E5:2 A5:2 C6:2 B5:2", "A5:1 G5:1 F5:2 D5:2 B4:2", "C5:4 r:2 G4:2",
  "A4:1 C5:1 F5:2 F5:1 E5:1 F5:2", "G5:2 D5:2 B4:2 D5:2", "E5:1 G5:1 B5:2 A5:1 G5:1 E5:2", "A5:3 G5:1 E5:2 C5:2",
  "D5:2 F5:1 E5:1 D5:2 A5:2", "G5:2 F5:1 E5:1 D5:2 B4:2", "C5:1 E5:1 G5:2 E5:2 D5:2", "C5:4 r:4",
].join(" ");

const PLAYFUL_BASS = byChord(PLAYFUL_CHORDS, {
  C: "C3:2 G2:2 E3:2 G2:2",
  Am: "A2:2 E3:2 A2:2 E3:2",
  F: "F2:2 C3:2 F3:2 C3:2",
  G: "G2:2 D3:2 G2:2 D3:2",
  Dm: "D3:2 A2:2 D3:2 A2:2",
  Em: "E2:2 B2:2 E3:2 B2:2",
  DmG: "D3:2 A2:2 G2:2 D3:2",
});

const CALM_CHORDS = "D Bm G A D F#m G A Bm G D A G A D D";

const CALM_MELODY = [
  "A4:4 D5:4", "F#5:6 E5:2", "D5:4 B4:4", "C#5:6 r:2",
  "A4:4 F#5:4", "A5:6 G5:2", "F#5:2 E5:2 D5:4", "E5:6 r:2",
  "B4:4 D5:4", "G5:6 F#5:2", "F#5:4 A4:4", "E5:6 r:2",
  "D5:4 G5:4", "F#5:2 E5:2 C#5:4", "D5:8", "r:8",
].join(" ");

const CALM_HARP = byChord(CALM_CHORDS, {
  D: "A3:2 D4:2 F#4:4",
  Bm: "B3:2 D4:2 F#4:4",
  G: "B3:2 D4:2 G4:4",
  A: "A3:2 C#4:2 E4:4",
  "F#m": "A3:2 C#4:2 F#4:4",
});

const CALM_BASS = byChord(CALM_CHORDS, { D: "D3:8", Bm: "B2:8", G: "G2:8", A: "A2:8", "F#m": "F#2:8" });

export const TUNES = {
  playful: {
    key: "C major",
    tempo: 116,
    stepsPerBeat: 2,
    beatsPerBar: 4,
    bars: 16,
    tracks: [
      { instrument: "bell", notes: PLAYFUL_MELODY, volume: 0.9 },
      { instrument: "bass", notes: PLAYFUL_BASS, volume: 0.8 },
      { instrument: "drums", notes: "k h s h k h s h", volume: 0.45 },
    ],
  },
  calm: {
    key: "D major",
    tempo: 66,
    stepsPerBeat: 2,
    beatsPerBar: 4,
    bars: 16,
    tracks: [
      { instrument: "flute", notes: CALM_MELODY, volume: 0.85 },
      { instrument: "harp", notes: CALM_HARP, volume: 0.5 },
      { instrument: "bass", notes: CALM_BASS, volume: 0.6 },
    ],
  },
};
