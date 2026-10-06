// The rules of mancala (kalah), as the kit asks for them (README, "A game"). Six pits of four seeds
// a side and a store each: side 0's pits are 0 to 5 and its store 6, side 1's pits 7 to 12 and its
// store 13; seeds go round counter-clockwise, 0 to 13 and back to 0, skipping the other side's
// store. A move is one of the side's own pits, 0 to 5 counted from its left. The last seed in the
// side's own store gives it the turn again; in an empty pit of its own, with seeds across, it takes
// both. When the side to move has nothing left, the other side keeps what is in its pits, and the
// stores are counted. Side 0 starts the round. Pure: a state in, a new state (or the reason it is
// refused) out.

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

/** The pit `n` (0 to 5) of `side`, as the board numbers it. */
export const pitOf = (side, n) => (side === 0 ? n : PITS + 1 + n);
/** The pit across from `pit`. */
export const across = (pit) => 2 * PITS - pit;
/** The seeds left in the pits of `side`. */
export const inPits = (pits, side) => Array.from({ length: PITS }, (_, n) => pits[pitOf(side, n)]).reduce((sum, seeds) => sum + seeds, 0);

/** How the round stands: null while the side to move can move; else the stores, each with what was left on its side. */
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
