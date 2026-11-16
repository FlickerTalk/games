const bars = (...lines) => lines.join(' ');
const byChord = (chords, patterns) => chords.split(' ').map((chord) => patterns[chord]).join(' ');

const CALM_MELODY = bars(
  'A4:2 C5:2 F5:3 E5:1', 'D5:4 A4:2 r:2', 'Bb4:2 D5:2 F5:2 D5:2', 'C5:6 r:2',
  'A4:2 C5:2 F5:3 G5:1', 'A5:4 F5:2 D5:2', 'D5:2 Bb4:2 C5:2 E5:2', 'F5:6 r:2',
  'D5:3 C5:1 Bb4:2 D5:2', 'C5:3 Bb4:1 A4:2 C5:2', 'Bb4:2 A4:2 G4:2 Bb4:2', 'E5:2 D5:2 C5:2 r:2',
  'A4:2 C5:2 F5:3 E5:1', 'D5:2 F5:2 A5:3 G5:1', 'G5:2 F5:2 E5:2 G5:2', 'F5:6 r:2',
);

const CALM_CHORDS = 'F Dm Bb C F Dm BbC F Bb F Gm C F Dm GmC Fend';

const CALM_HARP = byChord(CALM_CHORDS, {
  F: 'A3:2 C4:2 F4:2 C4:2',
  Dm: 'A3:2 D4:2 F4:2 D4:2',
  Bb: 'Bb3:2 D4:2 F4:2 D4:2',
  C: 'G3:2 C4:2 E4:2 C4:2',
  Gm: 'Bb3:2 D4:2 G4:2 D4:2',
  BbC: 'Bb3:2 D4:2 G3:2 E4:2',
  GmC: 'Bb3:2 D4:2 G3:2 E4:2',
  Fend: 'A3:2 C4:2 F4:4',
});

const CALM_BASS = byChord(CALM_CHORDS, {
  F: 'F3:4 C3:4',
  Dm: 'D3:4 A2:4',
  Bb: 'Bb2:4 F3:4',
  C: 'C3:4 G2:4',
  Gm: 'G2:4 D3:4',
  BbC: 'Bb2:4 C3:4',
  GmC: 'G2:4 C3:4',
  Fend: 'F3:8',
});

const RACE_A = bars(
  'G4:1 B4:1 D5:2 B4:1 D5:1 G5:2', 'E5:2 G5:1 E5:1 B4:4', 'C5:1 E5:1 G5:2 E5:1 G5:1 C6:2', 'B5:2 A5:2 F#5:2 D5:2',
  'G4:1 B4:1 D5:2 B4:1 D5:1 G5:2', 'B5:2 G5:1 E5:1 G5:4',
);

const RACE_MELODY = bars(
  RACE_A, 'E5:2 C5:2 F#5:2 A5:2', 'G5:4 r:2 D5:2',
  'E5:2 E5:1 F#5:1 G5:2 E5:2', 'F#5:2 F#5:1 G5:1 A5:2 F#5:2', 'D5:2 F#5:2 B5:3 A5:1', 'G5:2 E5:2 B4:2 r:2',
  'C5:1 D5:1 E5:2 G5:2 E5:2', 'D5:1 E5:1 F#5:2 A5:2 F#5:2', 'G5:2 D5:2 E5:2 B4:2', 'A4:2 B4:2 C5:2 D5:2',
  RACE_A, 'E5:2 G5:2 F#5:2 D5:2', 'G5:6 r:2',
  'B4:1 E5:1 G5:2 B5:3 G5:1', 'A5:2 G5:2 E5:4', 'D5:1 G5:1 B5:2 A5:1 G5:1 D5:2', 'F#5:2 E5:2 D5:4',
  'G5:2 F#5:1 E5:1 B5:4', 'C6:2 B5:1 A5:1 G5:4', 'A5:2 B5:1 A5:1 F#5:2 D5:2', 'G5:4 r:4',
);

const RACE_BASS = byChord(
  'G Em C D G Em CD G C D Bm Em C D GEm D G Em C D G Em CD G Em C G D Em C D G',
  {
    G: 'G2:2 D3:2 G3:2 D3:2',
    Em: 'E2:2 B2:2 E3:2 B2:2',
    C: 'C3:2 G2:2 E3:2 G2:2',
    D: 'D3:2 A2:2 F#3:2 A2:2',
    Bm: 'B2:2 F#2:2 D3:2 F#2:2',
    CD: 'C3:2 G2:2 D3:2 A2:2',
    GEm: 'G2:2 D3:2 E3:2 B2:2',
  },
);

export const SONGS = {
  calm: {
    key: 'F major',
    tempo: 84,
    stepsPerBeat: 2,
    beatsPerBar: 4,
    bars: 16,
    tracks: [
      { instrument: 'flute', notes: CALM_MELODY },
      { instrument: 'harp', notes: CALM_HARP, volume: 0.8 },
      { instrument: 'bass', notes: CALM_BASS, volume: 0.8 },
      { instrument: 'drums', notes: 'k h r h r h r h k h r h k h r h', volume: 0.5 },
    ],
  },
  race: {
    key: 'G major',
    tempo: 132,
    stepsPerBeat: 2,
    beatsPerBar: 4,
    bars: 32,
    tracks: [
      { instrument: 'bell', notes: RACE_MELODY },
      { instrument: 'bass', notes: RACE_BASS, volume: 0.9 },
      { instrument: 'drums', notes: 'k h s h k k s h k h s h k h s s', volume: 0.7 },
    ],
  },
};
