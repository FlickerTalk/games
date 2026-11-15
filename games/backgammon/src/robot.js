import { fromBase64url, toBase64url } from "./sha256.js";
import { CHECKERS, POINTS, SEED_BYTES, commitText, inHome, legalMoves, moveText, moved, pips, result, revealText, seedText, singleMoves } from "./rules.js";

const WON = 100_000;
const OFF = 4;
const ON_BAR = 8;
const POINT = 3;
const HOME_POINT = 4;
const DIRECT_SHOT = 10;
const INDIRECT_SHOT = 4;

const pick = (list, random) => list[Math.min(list.length - 1, Math.floor(random() * list.length))];
const freshSeed = (random) => Uint8Array.from({ length: SEED_BYTES }, () => Math.floor(random() * 256));

function roll(state, memory, random) {
  const { commit, seed } = state.roll;
  if (commit === null) {
    const mine = freshSeed(random);
    memory.seed = toBase64url(mine);
    return commitText(mine);
  }
  if (seed === null) return seedText(freshSeed(random));
  return revealText(fromBase64url(memory.seed));
}

// how far the other side must travel to land on `point`; its bar sits just off the board
function reach(state, side, point) {
  const other = 1 - side;
  const shots = [];
  const from = (at) => (other === 0 ? at - point : point - at);
  if (state.bar[other]) shots.push(from(other === 0 ? POINTS : -1));
  state.points.forEach((here, at) => {
    if (here[other]) shots.push(from(at));
  });
  return shots.filter((distance) => distance > 0 && distance <= 12);
}

function evaluate(state, side) {
  if (state.off[side] === CHECKERS) return WON;
  const other = 1 - side;
  let value = pips(state, other) - pips(state, side) + OFF * state.off[side] + ON_BAR * state.bar[other];
  state.points.forEach((here, at) => {
    if (here[side] >= 2) value += inHome(side, at) ? HOME_POINT : POINT;
    else if (here[side] === 1) {
      const shots = reach(state, side, at);
      if (shots.some((distance) => distance <= 6)) value -= DIRECT_SHOT;
      else if (shots.length) value -= INDIRECT_SHOT;
    }
  });
  return value;
}

function planner(side) {
  const seen = new Map();
  const best = (state, left) => {
    const key = `${state.points.join(";")}|${state.bar}|${state.off}|${left}`;
    if (seen.has(key)) return seen.get(key);
    let found = { used: 0, value: evaluate(state, side) };
    for (const die of new Set(left)) {
      const rest = [...left];
      rest.splice(rest.indexOf(die), 1);
      for (const move of singleMoves(state, side, die)) {
        const after = best(moved(state, side, move), rest);
        const used = after.used + 1;
        if (used > found.used || (used === found.used && after.value > found.value)) found = { used, value: after.value };
      }
    }
    seen.set(key, found);
    return found;
  };
  return best;
}

function checkers(state, side, random) {
  const firsts = legalMoves(state);
  if (!firsts.length) return "x";
  const best = planner(side);
  const valued = firsts.map((move) => {
    const rest = [...state.left];
    rest.splice(rest.indexOf(move.die), 1);
    return { move, value: best(moved(state, side, move), rest).value };
  });
  const top = Math.max(...valued.map((one) => one.value));
  return moveText(pick(valued.filter((one) => one.value === top), random).move);
}

export const robot = {
  unseen: (state) => state.dice === null,
  move(state, side, memory, random) {
    if (result(state)) return null;
    if (state.dice === null) return roll(state, memory, random);
    return checkers(state, side, random);
  },
};
