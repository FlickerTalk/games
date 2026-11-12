// Both fleets are revealed at the end and every answer is checked. A liar loses, two liars draw.
// Moves (64 characters at most):
//   c<hash>          fleet commitment SHA-256("ftgames-ships-v1" ‖ 0 ‖ 0 ‖ salt ‖ fleet), base64url
//   [answer]>cell    the answer to the other side's last shot, then a shot at cell 0–99
//   answer           the answer alone, when it sinks this side's last ship
//   r<salt><fleet>   the reveal: the salt (24 bytes, base64url) and the fleet
// Answers: m (miss), h (hit), s + the ship sunk (s23h3: start 23, across, 3 cells).
// A fleet is its five ships, each <start><h|v><length>, in a fixed order.

import { fromBase64url, hex, sha256, toBase64url, utf8 } from "./sha256.js";

export const SIZE = 10;
export const CELLS = SIZE * SIZE;
export const SHIPS = [5, 4, 3, 3, 2];
export const FLEET_CELLS = SHIPS.reduce((sum, length) => sum + length, 0);
export const SALT_BYTES = 24;
const DOMAIN = "ftgames-ships-v1";
const ZERO = new Uint8Array([0]);

export function shipCells({ start, o, len }) {
  if (!Number.isInteger(start) || start < 0 || start >= CELLS || !Number.isInteger(len) || len < 1) return null;
  const row = Math.floor(start / SIZE);
  const col = start % SIZE;
  if (o === "h") return col + len <= SIZE ? Array.from({ length: len }, (_, at) => start + at) : null;
  if (o === "v") return row + len <= SIZE ? Array.from({ length: len }, (_, at) => start + at * SIZE) : null;
  return null;
}

export function shipText({ start, o, len }) {
  return `${String(start).padStart(2, "0")}${o}${len}`;
}

export function parseShip(text) {
  const match = /^(\d\d)([hv])(\d)$/.exec(text);
  if (!match) return null;
  const ship = { start: Number(match[1]), o: match[2], len: Number(match[3]) };
  return shipCells(ship) ? ship : null;
}

export function sortShips(ships) {
  return [...ships].sort((one, two) => one.start - two.start);
}

export function validFleet(ships) {
  if (!Array.isArray(ships) || ships.length !== SHIPS.length) return false;
  const lengths = ships.map((ship) => ship.len).sort((a, b) => b - a);
  if (lengths.join() !== [...SHIPS].sort((a, b) => b - a).join()) return false;
  const taken = new Set();
  for (const ship of ships) {
    const cells = shipCells(ship);
    if (!cells) return false;
    for (const cell of cells) {
      if (taken.has(cell)) return false;
      taken.add(cell);
    }
  }
  return true;
}

export function fleetText(ships) {
  return sortShips(ships).map(shipText).join("");
}

export function parseFleet(text) {
  if (typeof text !== "string" || text.length !== SHIPS.length * 4) return null;
  const ships = [];
  for (let at = 0; at < text.length; at += 4) {
    const ship = parseShip(text.slice(at, at + 4));
    if (!ship) return null;
    ships.push(ship);
  }
  return validFleet(ships) && fleetText(ships) === text ? ships : null;
}

export function canonicalFleet(ships) {
  const name = (cell) => `${String.fromCharCode(65 + Math.floor(cell / SIZE))}${(cell % SIZE) + 1}`;
  return sortShips(ships)
    .map((ship) => shipCells(ship).map(name).join(","))
    .join(";");
}

export function fleetCommit(salt, ships) {
  return toBase64url(sha256(utf8(DOMAIN), ZERO, ZERO, salt, utf8(canonicalFleet(ships))));
}

export function fleetCommitHex(salt, ships) {
  return hex(sha256(utf8(DOMAIN), ZERO, ZERO, salt, utf8(canonicalFleet(ships))));
}

export function commitText(salt, ships) {
  return `c${fleetCommit(salt, ships)}`;
}

export function revealText(salt, ships) {
  return `r${toBase64url(salt)}${fleetText(ships)}`;
}

export function parseReveal(text) {
  if (typeof text !== "string" || text[0] !== "r") return null;
  const saltLength = Math.ceil((SALT_BYTES * 4) / 3);
  const salt = fromBase64url(text.slice(1, 1 + saltLength));
  const ships = parseFleet(text.slice(1 + saltLength));
  if (!salt || salt.length !== SALT_BYTES || !ships) return null;
  return { salt, ships };
}

export function initial() {
  return {
    phase: "place",
    commits: [null, null],
    next: 0,
    shots: [[], []],
    answers: [[], []],
    sunk: [[], []],
    reveals: [null, null],
  };
}

export function turn(state) {
  if (state.phase === "place") return state.commits[0] === null ? 0 : 1;
  return state.next;
}

export function answerTo(state, side, at) {
  return state.answers[side][at] ?? null;
}

export function reportedHits(state, side) {
  const hits = [];
  state.shots[1 - side].forEach((cell, at) => {
    const answer = state.answers[side][at];
    if (answer && answer !== "m") hits.push(cell);
  });
  return hits;
}

function sunkShip(answer) {
  return answer.startsWith("s") ? parseShip(answer.slice(1)) : null;
}

export function honestAnswer(state, side, ships) {
  const shots = state.shots[1 - side];
  if (shots.length <= state.answers[side].length) return "";
  const cell = shots.at(-1);
  const ship = ships.find((one) => shipCells(one).includes(cell));
  if (!ship) return "m";
  const fired = new Set(shots);
  return shipCells(ship).every((one) => fired.has(one)) ? `s${shipText(ship)}` : "h";
}

function checkAnswer(state, side, answer) {
  const shots = state.shots[1 - side];
  const cell = shots.at(-1);
  if (answer === "m" || answer === "h") return answer === "h" ? reportedHits(state, side).length < FLEET_CELLS : true;
  const ship = sunkShip(answer);
  if (!ship) return false;
  const cells = shipCells(ship);
  if (!cells.includes(cell)) return false;
  const hits = new Set(reportedHits(state, side));
  const sunkCells = new Set(state.sunk[side].flatMap(shipCells));
  for (const one of cells) {
    if (one === cell) continue;
    if (!hits.has(one) || sunkCells.has(one)) return false;
  }
  const left = [...SHIPS];
  for (const done of state.sunk[side]) left.splice(left.indexOf(done.len), 1);
  return left.includes(ship.len);
}

export function honest(state, side, ships) {
  const shots = state.shots[1 - side];
  const fleet = ships.map((ship) => ({ ship, cells: shipCells(ship) }));
  for (let at = 0; at < state.answers[side].length; at += 1) {
    const cell = shots[at];
    const answer = state.answers[side][at];
    const hit = fleet.find((one) => one.cells.includes(cell));
    if (!hit) {
      if (answer !== "m") return false;
      continue;
    }
    const fired = new Set(shots.slice(0, at + 1));
    const down = hit.cells.every((one) => fired.has(one));
    if (down) {
      if (answer !== `s${shipText(hit.ship)}`) return false;
    } else if (answer !== "h") return false;
  }
  return true;
}

export function result(state) {
  if (state.phase !== "done") return null;
  const sunk = state.sunk.findIndex((ships) => ships.length === SHIPS.length);
  const ahead = 1 - sunk;
  const fair = state.reveals.map((reveal) => reveal.ok);
  if (fair[ahead] && fair[sunk]) return { winner: ahead, reason: "sunk" };
  if (fair[ahead]) return { winner: ahead, reason: "cheat" };
  if (fair[sunk]) return { winner: sunk, reason: "cheat" };
  return { winner: null, reason: "both" };
}

export function play(state, move, side) {
  if (typeof move !== "string" || move.length === 0 || move.length > 64) return { error: "bad" };
  if (result(state)) return { error: "over" };
  if (side !== turn(state)) return { error: "turn" };

  if (state.phase === "place") {
    if (!/^c[A-Za-z0-9_-]{43}$/.test(move)) return { error: "bad" };
    const commits = [...state.commits];
    commits[side] = move.slice(1);
    const next = { ...state, commits };
    if (commits[0] !== null && commits[1] !== null) {
      next.phase = "fire";
      next.next = 0;
    }
    return { state: next };
  }

  if (state.phase === "fire") {
    const match = /^(m|h|s\d\d[hv]\d)?(?:>(\d{1,2}))?$/.exec(move);
    if (!match) return { error: "bad" };
    const [, answer, shot] = match;
    const owes = state.shots[1 - side].length > state.answers[side].length;
    if (owes !== Boolean(answer)) return { error: "illegal" };
    const next = { ...state, shots: state.shots.map((list) => [...list]), answers: state.answers.map((list) => [...list]), sunk: state.sunk.map((list) => [...list]) };
    let allSunk = false;
    if (answer) {
      if (!checkAnswer(state, side, answer)) return { error: "illegal" };
      next.answers[side].push(answer);
      const ship = sunkShip(answer);
      if (ship) next.sunk[side].push(ship);
      allSunk = next.sunk[side].length === SHIPS.length;
    }
    if (allSunk) {
      if (shot !== undefined) return { error: "illegal" };
      next.phase = "reveal";
      next.next = 1 - side;
      return { state: next };
    }
    if (shot === undefined) return { error: "illegal" };
    const cell = Number(shot);
    if (cell >= CELLS || state.shots[side].includes(cell)) return { error: "illegal" };
    next.shots[side].push(cell);
    next.next = 1 - side;
    return { state: next };
  }

  if (state.phase === "reveal") {
    const reveal = parseReveal(move);
    if (!reveal) return { error: "bad" };
    const ok = fleetCommit(reveal.salt, reveal.ships) === state.commits[side] && honest(state, side, reveal.ships);
    const reveals = [...state.reveals];
    reveals[side] = { ok, ships: reveal.ships };
    const next = { ...state, reveals, next: 1 - side };
    if (reveals[0] && reveals[1]) next.phase = "done";
    return { state: next };
  }
  return { error: "over" };
}

export function randomFleet(random = Math.random) {
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const ships = [];
    for (const len of SHIPS) {
      let placed = null;
      for (let tries = 0; tries < 200 && !placed; tries += 1) {
        const ship = { start: Math.floor(random() * CELLS), o: random() < 0.5 ? "h" : "v", len };
        const cells = shipCells(ship);
        if (cells && validFleetSoFar([...ships, ship])) placed = ship;
      }
      if (!placed) break;
      ships.push(placed);
    }
    if (ships.length === SHIPS.length && validFleet(ships)) return sortShips(ships);
  }
  return DEFAULT_FLEET.map((ship) => ({ ...ship }));
}

function validFleetSoFar(ships) {
  const taken = new Set();
  for (const ship of ships) {
    const cells = shipCells(ship);
    if (!cells) return false;
    for (const cell of cells) {
      if (taken.has(cell)) return false;
      taken.add(cell);
    }
  }
  return true;
}

export const DEFAULT_FLEET = [
  { start: 11, o: "h", len: 5 },
  { start: 31, o: "v", len: 4 },
  { start: 36, o: "h", len: 3 },
  { start: 58, o: "v", len: 2 },
  { start: 73, o: "h", len: 3 },
];
