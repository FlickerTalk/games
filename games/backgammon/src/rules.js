// The rules of Backgammon, as the kit asks for them (README, "A game"). Twenty-four points, fifteen
// checkers each; side 0 moves from point 23 down to its home (points 0–5) and bears off past 0,
// side 1 the other way (home 18–23). A lone checker is hit and sent to the bar, and must come back
// in before anything else moves. A side bears off once all its checkers are home. The first to
// bear off all fifteen wins (a gammon when the other bore off none, a backgammon when it also has
// a checker on the bar or in the winner's home). No doubling cube.
//
// The dice are rolled by both phones together, before each turn: the side to move commits to a
// secret, the other answers with its own, the side to move reveals, and the two dice follow from
// both (the kit's dice layout, "ftgames-dice-v1"), so neither chose them. A turn then plays the
// dice one checker move at a time; both dice must be used when they can be (the higher one when
// only one can), as the standard rules say; a side with no move passes. The rules run
// synchronously on both phones, so the hash is the game's own SHA-256.
//
// Moves (strings): c<hash> (commitment), s<seed> (24 bytes, base64url), r<seed> (the reveal),
// m<from>-<to> (a checker from a point, 0–23, or the bar `b`, to a point or off `o`), x (pass).

import { fromBase64url, sha256, toBase64url, utf8 } from "./sha256.js";

export const POINTS = 24;
export const CHECKERS = 15;
export const SEED_BYTES = 24;
const DOMAIN = "ftgames-dice-v1";
const ZERO = new Uint8Array([0]);

/** Where each side's checkers start: `[point, count]`. */
const START = [
  [[23, 2], [12, 5], [7, 3], [5, 5]],
  [[0, 2], [11, 5], [16, 3], [18, 5]],
];

export function initial() {
  const points = Array.from({ length: POINTS }, () => [0, 0]);
  START.forEach((places, side) => places.forEach(([point, count]) => (points[point][side] = count)));
  return { points, bar: [0, 0], off: [0, 0], next: 0, roll: { commit: null, seed: null }, dice: null, left: [], end: null, rolls: 0 };
}

export function turn(state) {
  // During a roll, the side to move commits and reveals; the other seeds.
  if (state.dice === null) return state.roll.commit !== null && state.roll.seed === null ? 1 - state.next : state.next;
  return state.next;
}

export const commitText = (seed) => `c${toBase64url(sha256(utf8(DOMAIN), ZERO, seed))}`;
export const seedText = (seed) => `s${toBase64url(seed)}`;
export const revealText = (seed) => `r${toBase64url(seed)}`;
const seedLength = Math.ceil((SEED_BYTES * 4) / 3);

function seedOf(text) {
  const bytes = fromBase64url(text.slice(1));
  return text.length === 1 + seedLength && bytes && bytes.length === SEED_BYTES ? bytes : null;
}

/** Two dice from both seeds and the number of the roll: the outcome's bytes in order, dropping
 *  those from 252 up so each face is as likely (die = byte mod 6 + 1). */
export function rollDice(seedA, seedB, n) {
  const count = new Uint8Array(4);
  new DataView(count.buffer).setUint32(0, n);
  const first = sha256(utf8(`${DOMAIN}/out`), ZERO, count, seedA, seedB);
  const faces = [];
  let block = first;
  for (let counter = 1; faces.length < 2; counter += 1) {
    for (const byte of block) {
      if (byte >= 252) continue;
      faces.push((byte % 6) + 1);
      if (faces.length === 2) break;
    }
    const k = new Uint8Array(4);
    new DataView(k.buffer).setUint32(0, counter);
    block = sha256(first, k);
  }
  return faces;
}

// ---- Checker moves ---------------------------------------------------------------------------

/** The direction a side moves in: side 0 down the points, side 1 up. */
const dir = (side) => (side === 0 ? -1 : 1);
/** Whether a point is in the side's home board. */
export const inHome = (side, point) => (side === 0 ? point <= 5 : point >= 18);
/** How far a point is from bearing off, for the side: 1 to 24. */
const distance = (side, point) => (side === 0 ? point + 1 : POINTS - point);

/** Whether all the side's checkers are in its home (and none on the bar): it may bear off. */
export function canBearOff(state, side) {
  if (state.bar[side]) return false;
  return state.points.every((point, at) => point[side] === 0 || inHome(side, at));
}

/** Whether `side` may land on `point`: empty, its own, or a lone checker of the other side. */
const open = (state, side, point) => point >= 0 && point < POINTS && state.points[point][1 - side] <= 1;

/** The single moves `side` may make with one `die`: `{ from, to }`, from `"b"` (the bar) or a point,
 *  to a point or `"o"` (off). */
export function singleMoves(state, side, die) {
  const moves = [];
  if (state.bar[side]) {
    const to = side === 0 ? POINTS - die : die - 1;
    if (open(state, side, to)) moves.push({ from: "b", to });
    return moves;
  }
  const bearing = canBearOff(state, side);
  for (let from = 0; from < POINTS; from += 1) {
    if (!state.points[from][side]) continue;
    const to = from + dir(side) * die;
    if (to >= 0 && to < POINTS) {
      if (open(state, side, to)) moves.push({ from, to });
    } else if (bearing) {
      // Off the board exactly, or with a higher die when no checker stands farther from home.
      const far = distance(side, from);
      if (far === die) moves.push({ from, to: "o" });
      else if (die > far) {
        let farther = false;
        for (let at = 0; at < POINTS; at += 1) if (state.points[at][side] && distance(side, at) > far) farther = true;
        if (!farther) moves.push({ from, to: "o" });
      }
    }
  }
  return moves;
}

/** The state after one checker move by `side` (not checked here). */
export function moved(state, side, { from, to }) {
  const points = state.points.map((point) => [...point]);
  const bar = [...state.bar];
  const off = [...state.off];
  if (from === "b") bar[side] -= 1;
  else points[from][side] -= 1;
  if (to === "o") off[side] += 1;
  else {
    if (points[to][1 - side] === 1) {
      points[to][1 - side] = 0;
      bar[1 - side] += 1;
    }
    points[to][side] += 1;
  }
  return { ...state, points, bar, off };
}

/** Every way to play the dice left, as lists of single moves, the longest ones first. */
function sequences(state, side, dice) {
  const found = [];
  const walk = (current, left, done) => {
    let any = false;
    const tried = new Set();
    left.forEach((die, at) => {
      if (tried.has(die)) return;
      tried.add(die);
      for (const move of singleMoves(current, side, die)) {
        any = true;
        walk(moved(current, side, move), left.filter((_, index) => index !== at), [...done, { ...move, die }]);
      }
    });
    if (!any) found.push(done);
  };
  walk(state, dice, []);
  return found;
}

/** The checker moves `side` may make now with its dice: those that begin a way of playing as many
 *  dice as can be played (and, with one die playable of two, the higher). */
export function legalMoves(state) {
  if (state.dice === null || state.end) return [];
  const side = state.next;
  const all = sequences(state, side, state.left);
  const most = Math.max(...all.map((one) => one.length));
  if (most === 0) return [];
  let best = all.filter((one) => one.length === most);
  if (most === 1 && state.left.length === 2 && state.left[0] !== state.left[1]) {
    const high = Math.max(...state.left);
    const withHigh = best.filter((one) => one[0].die === high);
    if (withHigh.length) best = withHigh;
  }
  const seen = new Map();
  for (const one of best) {
    const first = one[0];
    const key = `${first.from}-${first.to}-${first.die}`;
    if (!seen.has(key)) seen.set(key, first);
  }
  return [...seen.values()];
}

/** How the round stands. */
export function result(state) {
  return state.end;
}

/** A move's text. */
export const moveText = ({ from, to }) => `m${from}-${to}`;

export function play(state, move, side) {
  if (typeof move !== "string" || move.length === 0 || move.length > 64) return { error: "bad" };
  if (result(state)) return { error: "over" };
  if (side !== turn(state)) return { error: "turn" };

  if (state.dice === null) {
    const { commit, seed } = state.roll;
    if (commit === null) {
      if (!/^c[A-Za-z0-9_-]{43}$/.test(move)) return { error: "bad" };
      return { state: { ...state, roll: { commit: move.slice(1), seed: null } } };
    }
    if (seed === null) {
      if (move[0] !== "s" || !seedOf(move)) return { error: "bad" };
      return { state: { ...state, roll: { commit, seed: move.slice(1) } } };
    }
    const revealed = move[0] === "r" ? seedOf(move) : null;
    if (!revealed) return { error: "bad" };
    if (commitText(revealed) !== `c${commit}`) {
      return { state: { ...state, end: { winner: 1 - side, reason: "cheat" } } };
    }
    const dice = rollDice(revealed, fromBase64url(seed), state.rolls);
    const left = dice[0] === dice[1] ? [dice[0], dice[0], dice[0], dice[0]] : dice;
    return { state: { ...state, dice, left, rolls: state.rolls + 1 } };
  }

  if (move === "x") {
    if (legalMoves(state).length) return { error: "illegal" };
    return { state: endTurn(state) };
  }
  const match = /^m(b|\d{1,2})-(o|\d{1,2})$/.exec(move);
  if (!match) return { error: "bad" };
  const from = match[1] === "b" ? "b" : Number(match[1]);
  const to = match[2] === "o" ? "o" : Number(match[2]);
  const legal = legalMoves(state).find((one) => one.from === from && one.to === to);
  if (!legal) return { error: "illegal" };
  let next = moved(state, side, legal);
  const left = [...state.left];
  left.splice(left.indexOf(legal.die), 1);
  next = { ...next, left };
  if (next.off[side] === CHECKERS) {
    const other = 1 - side;
    const reason = next.off[other] ? "single" : next.bar[other] || next.points.some((point, at) => point[other] && inHome(side, at)) ? "backgammon" : "gammon";
    return { state: { ...next, left: [], end: { winner: side, reason } } };
  }
  if (!left.length || !legalMoves(next).length) next = endTurn(next);
  return { state: next };
}

/** The turn passes: the other side rolls next. */
function endTurn(state) {
  return { ...state, next: 1 - state.next, dice: null, left: [], roll: { commit: null, seed: null } };
}

/** How many pips each side still has to move: the sum of its checkers' distances. */
export function pips(state, side) {
  let total = state.bar[side] * (POINTS + 1);
  state.points.forEach((point, at) => (total += point[side] * distance(side, at)));
  return total;
}
