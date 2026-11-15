const FROM_A = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
const SHIFT = { "": 0, "#": 1, b: -1 };
const NOTE = /^([A-G])([#b]?)(\d)$/;

export function note(name) {
  const found = NOTE.exec(name);
  if (!found) throw new Error(`not a note: ${name}`);
  const [, letter, accidental, octave] = found;
  return 440 * 2 ** ((FROM_A[letter] + SHIFT[accidental] + (Number(octave) - 4) * 12) / 12);
}
