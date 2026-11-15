import { fromBase64url, toBase64url } from "./sha256.js";
import { CELLS, SALT_BYTES, SHIPS, SIZE, commitText, fleetText, honestAnswer, parseFleet, randomFleet, result, revealText, shipCells } from "./rules.js";

const STEPS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

const pick = (list, random) => list[Math.min(list.length - 1, Math.floor(random() * list.length))];

function neighbour(cell, [dr, dc]) {
  const row = Math.floor(cell / SIZE) + dr;
  const col = (cell % SIZE) + dc;
  return row >= 0 && row < SIZE && col >= 0 && col < SIZE ? row * SIZE + col : null;
}

function place(memory, random) {
  const ships = randomFleet(random);
  const salt = Uint8Array.from({ length: SALT_BYTES }, () => Math.floor(random() * 256));
  memory.fleet = fleetText(ships);
  memory.salt = toBase64url(salt);
  return commitText(salt, ships);
}

function openHits(state, side) {
  const sunk = new Set(state.sunk[1 - side].flatMap(shipCells));
  return state.shots[side].filter((cell, at) => {
    const answer = state.answers[1 - side][at];
    return answer && answer !== "m" && !sunk.has(cell);
  });
}

function targets(state, side) {
  const hits = new Set(openHits(state, side));
  const fired = new Set(state.shots[side]);
  const along = [];
  const beside = [];
  for (const cell of hits) {
    for (const [dr, dc] of STEPS) {
      const next = neighbour(cell, [dr, dc]);
      if (next === null || fired.has(next)) continue;
      const behind = neighbour(cell, [-dr, -dc]);
      (behind !== null && hits.has(behind) ? along : beside).push(next);
    }
  }
  if (along.length || beside.length) return along.length ? along : beside;
  const open = [...Array(CELLS).keys()].filter((cell) => !fired.has(cell));
  const even = open.filter((cell) => (Math.floor(cell / SIZE) + (cell % SIZE)) % 2 === 0);
  return even.length ? even : open;
}

export const robot = {
  unseen: (state) => ["place", "reveal"].includes(state.phase),
  move(state, side, memory, random) {
    if (result(state)) return null;
    if (state.phase === "place") return place(memory, random);
    const ships = parseFleet(memory.fleet);
    if (state.phase === "reveal") return revealText(fromBase64url(memory.salt), ships);
    const answer = honestAnswer(state, side, ships);
    if (answer.startsWith("s") && state.sunk[side].length + 1 === SHIPS.length) return answer;
    return `${answer}>${pick(targets(state, side), random)}`;
  },
};
