// Side 0's pits are 0–5 and its store 6, side 1's pits 7–12 and its store 13. Seeds go round 0 to 13
// and back, skipping the other side's store. A move is a pit 0–5 counted from the side's left.

export const PITS = 6;
export const SEEDS = 4;
export const STORE = [PITS, 2 * PITS + 1];

export function initial() {
  const pits = Array(2 * PITS + 2).fill(SEEDS);
  pits[STORE[0]] = 0;
  pits[STORE[1]] = 0;
  return { pits, next: 0 };
}

export function turn(state) {
  return state.next;
}

export const pitOf = (side, n) => (side === 0 ? n : PITS + 1 + n);
export const across = (pit) => 2 * PITS - pit;
export const inPits = (pits, side) => Array.from({ length: PITS }, (_, n) => pits[pitOf(side, n)]).reduce((sum, seeds) => sum + seeds, 0);

export function result(state) {
  const { pits, next } = state;
  if (inPits(pits, next) > 0) return null;
  const first = pits[STORE[0]] + inPits(pits, 0);
  const second = pits[STORE[1]] + inPits(pits, 1);
  return { winner: first === second ? null : first > second ? 0 : 1, first, second };
}

export function play(state, move, side) {
  if (!Number.isInteger(move) || move < 0 || move >= PITS) return { error: "bad" };
  if (result(state)) return { error: "over" };
  if (side !== turn(state)) return { error: "turn" };
  const pits = [...state.pits];
  const from = pitOf(side, move);
  let seeds = pits[from];
  if (seeds === 0) return { error: "empty" };
  pits[from] = 0;
  let at = from;
  while (seeds > 0) {
    at = (at + 1) % pits.length;
    if (at === STORE[1 - side]) continue;
    pits[at] += 1;
    seeds -= 1;
  }
  let next = 1 - side;
  if (at === STORE[side]) {
    next = side;
  } else if (pits[at] === 1 && at !== STORE[0] && at !== STORE[1] && (side === 0 ? at < PITS : at > PITS) && pits[across(at)] > 0) {
    pits[STORE[side]] += pits[across(at)] + 1;
    pits[across(at)] = 0;
    pits[at] = 0;
  }
  return { state: { pits, next } };
}
