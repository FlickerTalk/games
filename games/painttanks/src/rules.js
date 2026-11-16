import { isSeed, randomOf } from "../../../kit/src/canvas/random.js";
import { flyShot } from "./physics.js";
import { FIELDS, familyOf, heightsFor, layTargets, vehicleAt } from "./world.js";

export const MOST_SHOTS = 8;
export const PRACTICE_SHOTS = 10;
export const ANGLES = Object.freeze({ least: 5, most: 85, torpedo: 45 });
export const RAIN_REACH = 70;

const CRATERS_KEPT = 24;
const SETUP = /^([sp])([0-3])([0-9])([A-Za-z0-9_-]{8})$/;
const SHOT = /^([ft])(\d\d)(\d\d)$/;

const two = (value) => String(value).padStart(2, "0");

export const setupMove = ({ field, wind, seed, practice = false }) => `${practice ? "p" : "s"}${FIELDS.indexOf(field)}${wind}${seed}`;

export function encodeShot({ kind, angle, power }) {
  return kind === "torpedo" ? `t${two(angle + ANGLES.torpedo)}${two(power)}` : `f${two(angle)}${two(power)}`;
}

export function readShot(move) {
  const found = typeof move === "string" ? SHOT.exec(move) : null;
  if (!found) return null;
  const [, letter, angle, power] = found;
  if (letter === "t") return Number(angle) <= 2 * ANGLES.torpedo ? { kind: "torpedo", angle: Number(angle) - ANGLES.torpedo, power: Number(power) } : null;
  const degrees = Number(angle);
  return degrees >= ANGLES.least && degrees <= ANGLES.most ? { kind: "ball", angle: degrees, power: Number(power) } : null;
}

function readSetup(move) {
  const found = typeof move === "string" ? SETUP.exec(move) : null;
  if (!found || !isSeed(found[4])) return null;
  return { field: FIELDS[Number(found[2])], wind: Number(found[3]), seed: found[4], practice: found[1] === "p" };
}

export const initial = () => ({ setup: null, shots: 0 });

export const worldOf = (state) => ({ field: state.setup.field, seed: state.setup.seed, heights: state.heights, craters: state.craters, under: state.under, practice: state.setup.practice });

export function windAt(setup, index) {
  if (!setup?.wind) return 0;
  const random = randomOf(`${setup.seed}/wind/${index}`);
  return Math.round(((random() * 2 - 1) * setup.wind) / 9 * 100) / 100;
}

export const windOf = (state) => windAt(state.setup, state.shots);

function begin(setup) {
  const world = { ...setup, heights: heightsFor(setup.field, setup.seed), craters: [], under: [false, false] };
  return {
    setup,
    heights: world.heights,
    craters: [],
    under: [false, false],
    targets: layTargets(world, { practice: setup.practice }),
    paint: [0, 0],
    score: [0, 0],
    special: [false, false],
    shots: 0,
    last: null,
  };
}

const turnOf = (state) => (!state.setup || state.setup.practice ? 0 : state.shots % 2);

function washed(state, targets, struck) {
  const cloud = struck.map((at) => targets[at]).find((one) => one.kind === "rainCloud");
  if (!cloud) return null;
  const world = worldOf(state);
  const sides = state.setup.practice ? [0] : [0, 1];
  return sides.find((side) => Math.abs(vehicleAt(world, side).x - cloud.x) <= RAIN_REACH) ?? null;
}

function score(state, side, flight) {
  const paint = [...state.paint];
  const points = [...state.score];
  const special = [...state.special];
  special[side] = false;
  for (const painted of flight.painted) {
    paint[painted] = Math.min(3, paint[painted] + 1);
    if (painted !== side) points[side] += 1;
  }
  const targets = state.targets.map((one, at) => (flight.struck.includes(at) ? { ...one, hit: true } : one));
  points[side] += flight.struck.length;
  if (flight.struck.some((at) => targets[at].kind === "giftCrate")) special[side] = true;
  const rained = washed(state, targets, flight.struck);
  if (rained !== null) paint[rained] = Math.max(0, paint[rained] - 1);
  return { paint, score: points, special, targets, rained };
}

function shoot(state, shot, side) {
  const family = familyOf(state.setup.field, side, { practice: state.setup.practice });
  if (shot.kind === "torpedo" && family !== "sub") return { error: "torpedo" };
  const under = [...state.under];
  if (family === "sub") under[side] = shot.kind === "torpedo";
  const wind = windOf(state);
  const world = { ...worldOf(state), under };
  const flight = flyShot(world, side, shot, { wind, targets: state.targets, special: state.special[side] });
  const scored = score({ ...state, under }, side, flight);
  const craters = flight.crater ? [...state.craters, flight.crater].slice(-CRATERS_KEPT) : state.craters;
  const { rained, ...counts } = scored;
  return {
    state: { ...state, ...counts, under, craters, shots: state.shots + 1, last: { side, shot, wind, flight, rained, special: state.special[side] } },
  };
}

export function result(state) {
  if (!state.setup) return null;
  const { paint, score: points, shots } = state;
  if (state.setup.practice) {
    const left = state.targets.some((one) => !one.hit);
    return shots >= PRACTICE_SHOTS || !left ? { winner: 0, score: points[0], practice: true } : null;
  }
  const covered = paint.some((level) => level >= 3);
  if (!covered && shots < MOST_SHOTS * 2) return null;
  let winner = null;
  if (paint[0] !== paint[1]) winner = paint[0] < paint[1] ? 0 : 1;
  else if (!covered && points[0] !== points[1]) winner = points[0] > points[1] ? 0 : 1;
  return { winner, score: [...points], paint: [...paint] };
}

function playWith(allowPractice) {
  return (state, move, side) => {
    if (result(state)) return { error: "over" };
    if (side !== turnOf(state)) return { error: "turn" };
    if (!state.setup) {
      const setup = readSetup(move);
      if (!setup || setup.practice !== allowPractice) return { error: "setup" };
      return { state: begin(setup) };
    }
    const shot = readShot(move);
    return shot ? shoot(state, shot, side) : { error: "shot" };
  };
}

export const battle = Object.freeze({ id: "painttanks", gv: 1, initial, turn: turnOf, play: playWith(false), result });
export const practice = Object.freeze({ initial, turn: turnOf, play: playWith(true), result });
