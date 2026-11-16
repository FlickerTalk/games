import { isSeed } from "../../../kit/src/canvas/random.js";
import { MOST_SHOTS, STAGES, balloonsOf, numbersOf, quantise } from "./numbers.js";
import { isFar, pointsOf, scoreOf, starsOf } from "./scoring.js";

export const FLIGHT = 0.45;
export const REVEAL = 1.25;
export const RIVAL_REVEAL = 1.7;
export const POP_REACH = 0.06;

const MARKS_AFTER = 3;

export function startRound({ seed, seconds, setup, rival = false }) {
  return { seed, seconds, setup, rival, numbers: numbersOf(seed, setup.stage), time: 0, guesses: [], shot: null, farRun: 0, ticks: Boolean(setup.ticks), over: false };
}

export const indexOf = (round) => (round.shot ? round.shot.index : round.guesses.length);

export const numberOf = (round) => round.numbers[Math.min(indexOf(round), MOST_SHOTS - 1)];

export const timeLeft = (round) => Math.max(0, round.seconds - round.time);

export const scoreIn = (round) => scoreOf(round.numbers, round.guesses);

const allBalloons = (round, index) => balloonsOf(round.seed, index, round.numbers[index], round.setup);

function reached(balloons, guess) {
  let best = null;
  for (const one of balloons) {
    const gap = Math.abs(one.share - guess);
    if (gap <= POP_REACH && (!best || gap < Math.abs(best.share - guess))) best = one;
  }
  return best;
}

export const aimedBalloon = (round) => (round.shot ? reached(allBalloons(round, round.shot.index), round.shot.guess) : null);

export function balloonsIn(round) {
  const index = Math.min(indexOf(round), MOST_SHOTS - 1);
  const balloons = allBalloons(round, index);
  if (!round.shot?.landed) return balloons;
  const popped = reached(balloons, round.shot.guess);
  return balloons.filter((one) => one !== popped);
}

export function shoot(round, share) {
  if (round.over || round.shot || round.time >= round.seconds || round.guesses.length >= MOST_SHOTS) return round;
  return { ...round, shot: { index: round.guesses.length, guess: quantise(share), at: round.time, landed: false } };
}

function land(round, events) {
  const { index, guess } = round.shot;
  const number = round.numbers[index];
  const error = Math.abs(guess - number.share);
  const far = isFar(error);
  const popped = reached(allBalloons(round, index), guess);
  round.guesses = [...round.guesses, guess];
  round.farRun = far ? round.farRun + 1 : 0;
  if (round.farRun >= MARKS_AFTER) round.ticks = true;
  round.shot = { ...round.shot, landed: true };
  events.push({ kind: "land", index, guess, error, stars: starsOf(error), points: pointsOf(error, number.size), far, popped, real: Boolean(popped?.real) });
}

export function stepRound(round, seconds) {
  const events = [];
  if (round.over) return { round, events };
  const next = { ...round, time: round.time + Math.max(0, seconds) };
  if (next.shot && !next.shot.landed && next.time >= next.shot.at + FLIGHT) land(next, events);
  if (next.shot?.landed && next.time >= next.shot.at + FLIGHT + (next.rival ? RIVAL_REVEAL : REVEAL)) {
    next.shot = null;
    events.push({ kind: "next", index: next.guesses.length });
  }
  if (!next.shot && (next.time >= next.seconds || next.guesses.length >= MOST_SHOTS)) {
    next.over = true;
    events.push({ kind: "end" });
  }
  return { round: next, events };
}

export const roundSnapshot = ({ seed, seconds, setup, rival, time, guesses, farRun, ticks }) => ({ seed, seconds, setup, rival, time, guesses, farRun, ticks });

const isShare = (value) => Number.isFinite(value) && value >= 0 && value <= 1;

export function resumeRound(kept) {
  if (!kept || !isSeed(kept.seed) || ![kept.seconds, kept.time].every(Number.isFinite)) return null;
  const { setup, guesses } = kept;
  if (!setup || !Number.isInteger(setup.stage) || !STAGES[setup.stage] || ![setup.count, setup.spread].every(Number.isFinite)) return null;
  if (!Array.isArray(guesses) || guesses.length > MOST_SHOTS || !guesses.every(isShare)) return null;
  const round = startRound({ seed: kept.seed, seconds: kept.seconds, setup, rival: kept.rival === true });
  return { ...round, time: Math.max(0, kept.time), guesses: guesses.map(quantise), farRun: Number.isInteger(kept.farRun) ? kept.farRun : 0, ticks: round.ticks || kept.ticks === true };
}
