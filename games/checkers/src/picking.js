import { SIZE, legalMoves } from "./rules.js";

const stepsOf = (move) => move.split("-").map(Number);
const unique = (squares) => [...new Set(squares)];
const isCapture = (move) => {
  const [from, to] = stepsOf(move);
  return Math.abs(Math.floor(to / SIZE) - Math.floor(from / SIZE)) === 2;
};

export function choices(state, side, canPlay, path = []) {
  const legal = canPlay && side !== null && side !== undefined ? legalMoves(state, side) : [];
  const prefix = `${path.join("-")}-`;
  const from = path.length ? [] : unique(legal.map((move) => stepsOf(move)[0]));
  const to = path.length ? unique(legal.filter((move) => move.startsWith(prefix)).map((move) => stepsOf(move)[path.length])) : [];
  const forced = !path.length && legal.some(isCapture) ? from : [];
  return { legal, from, to, forced };
}

export function tap(legal, path, square) {
  if (path.includes(square)) return { path: [], move: null };
  if (!path.length) return { path: legal.some((move) => stepsOf(move)[0] === square) ? [square] : [], move: null };
  const next = [...path, square].join("-");
  if (legal.includes(next)) return { path: [], move: next };
  if (legal.some((move) => move.startsWith(`${next}-`))) return { path: [...path, square], move: null };
  return { path, move: null };
}

export function dropSquares(legal, prefix) {
  const squares = new Set();
  for (const move of legal) {
    const steps = stepsOf(move);
    if (steps.length <= prefix.length || steps.slice(0, prefix.length).join("-") !== prefix.join("-")) continue;
    squares.add(steps[prefix.length]);
    squares.add(steps.at(-1));
  }
  return squares;
}

export function dropOn(legal, prefix, square) {
  const next = [...prefix, square].join("-");
  if (legal.includes(next)) return { path: [], move: next };
  const ending = legal.filter((move) => move.startsWith(`${prefix.join("-")}-`) && stepsOf(move).at(-1) === square);
  if (ending.length === 1) return { path: [], move: ending[0] };
  return { path: [...prefix, square], move: null };
}
