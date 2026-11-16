export const MOVES = Object.freeze(["n", "g", "b", "s"]);
export const CELLS = 3;
export const LAMPS = 3;
export const MOST_HITS = CELLS * LAMPS;

const BEATS = { g: "bn", b: "sn", s: "g", n: "" };

// bit 1 is the glove's button, bit 2 the boot's
export const moveOf = (held) => MOVES[held & 3];

export function exchange(first, second) {
  const landed = [BEATS[first].includes(second) ? 1 : 0, BEATS[second].includes(first) ? 1 : 0];
  const struck = landed[0] + landed[1] > 0;
  const blocked = struck && (first === "s" || second === "s") && (first === "g" || second === "g");
  const kind = blocked ? "block" : struck ? "hit" : first === second && (first === "g" || first === "b") ? "clash" : "none";
  return { landed, kind };
}

export function boutOf(first, second, most = Infinity) {
  const hits = [0, 0];
  const played = Math.min(first.length, second.length, most);
  let count = 0;
  let toppled = null;
  while (count < played && Math.max(...hits) < MOST_HITS) {
    const { landed } = exchange(first[count], second[count]);
    toppled = null;
    for (const seat of [0, 1]) {
      hits[seat] += landed[seat];
      if (landed[seat] && hits[seat] % CELLS === 0) toppled = 1 - seat;
    }
    count += 1;
  }
  return { hits, count, toppled, over: Math.max(...hits) >= MOST_HITS || count >= most };
}

export const lampsOf = (hits, seat) => Math.floor(hits[seat] / CELLS);

export function energyOf(hits, seat) {
  const taken = hits[1 - seat];
  return taken >= MOST_HITS ? 0 : CELLS - (taken % CELLS);
}

export const writeMoves = (moves) => moves.join("");

export function readMoves(text, most) {
  if (typeof text !== "string" || text.length > most || /[^gbsn]/.test(text)) return null;
  return [...text];
}
