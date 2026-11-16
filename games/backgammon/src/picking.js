import { legalMoves, moveText } from "./rules.js";

export const BAR = "bar";
export const OFF = "off";

const keyOf = (place) => (place === "b" ? BAR : place === "o" ? OFF : place);
export const placeOf = (key) => (key === BAR ? "b" : key === OFF ? "o" : key);
const unique = (list) => [...new Set(list)];

function ownOf(state, side) {
  const points = state.points.flatMap((point, at) => (point[side] ? [at] : []));
  return state.bar[side] ? [...points, BAR] : points;
}

export function choices(state, side, canPlay) {
  const open = canPlay && side !== null && side !== undefined && state.dice !== null && state.next === side;
  const legal = open ? legalMoves(state) : [];
  return { legal, sources: unique(legal.map((move) => keyOf(move.from))), own: open ? ownOf(state, side) : [] };
}

export const cannotMove = (offer, key) => offer.own.includes(key) && !offer.sources.includes(key);

export function targetsOf(legal, source) {
  return unique(legal.filter((move) => keyOf(move.from) === source).map((move) => keyOf(move.to)));
}

export function dropOn(legal, source, target) {
  const move = legal.find((one) => keyOf(one.from) === source && keyOf(one.to) === target);
  return move ? moveText(move) : null;
}

export function tap(legal, chosen, key) {
  if (chosen !== null && key !== chosen) {
    const move = dropOn(legal, chosen, key);
    if (move) return { chosen: null, move };
  }
  if (key === chosen) return { chosen: null, move: null };
  if (legal.some((move) => keyOf(move.from) === key)) return { chosen: key, move: null };
  return { chosen, move: null };
}

const readPlace = (text) => (text === "b" || text === "o" ? text : Number(text));

function sideOf({ from, to }) {
  if (from === "b") return to >= 18 ? 0 : 1;
  if (to === "o") return from <= 5 ? 0 : 1;
  return to < from ? 0 : 1;
}

function parse(move) {
  const found = /^m(b|\d{1,2})-(o|\d{1,2})$/.exec(move);
  if (!found) return null;
  const step = { from: readPlace(found[1]), to: readPlace(found[2]) };
  return { ...step, side: sideOf(step) };
}

export function lastTurn(moves = []) {
  const turns = [];
  let open = null;
  for (const move of moves) {
    if (move[0] === "r") {
      open = [];
      turns.push(open);
    } else if (move[0] === "c") open = null;
    else if (open && move[0] === "m") open.push(move);
  }
  const last = turns.at(-1) ?? [];
  const shown = last.length || !open ? last : (turns.at(-2) ?? []);
  return shown.map(parse).filter(Boolean);
}
