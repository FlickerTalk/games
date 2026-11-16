const FROM_A = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
const SHIFT = { '': 0, '#': 1, b: -1 };
const NOTE = /^([A-G])([#b]?)(\d)$/;

export function noteFrequency(name) {
  const match = NOTE.exec(name);
  if (!match) throw new Error(`not a note: ${name}`);
  const [, letter, accidental, octave] = match;
  const semitones = FROM_A[letter] + SHIFT[accidental] + (Number(octave) - 4) * 12;
  return 440 * 2 ** (semitones / 12);
}
