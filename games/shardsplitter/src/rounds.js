import { decodeSetup, encodeSetup, generateRound } from "./generate.js";
import { ENTER_MS } from "./motion.js";
import { golemOf, startRound, strike, turnOf, usefulNow } from "./round.js";

export const END_MS = 500;
export const STRUGGLE = 2;
const KEPT = ["alone", "flick"];

export const roundKey = (state) => `round/${state.chat ?? "-"}`;

const standOf = (core) => (core.over ? null : { value: core.value, count: core.count, cap: golemOf(core).cap });

export function freshRound({ kind, setup, mySide = 0, id = null, now = 0 }) {
  const core = startRound(generateRound(setup));
  return {
    kind, setup, code: encodeSetup(setup), id, mySide, core, hits: [], stand: standOf(core), next: null,
    split: null, leave: null, enter: { start: now }, tongueUntil: 0, swings: [null, null], bell: null, burst: null, struck: null,
    busyUntil: now + ENTER_MS, flickAt: null, struggle: 0, finished: false,
  };
}

export function fastForward(round, divisors, now = 0) {
  let core = startRound(generateRound(round.setup));
  for (const divisor of divisors) {
    const done = strike(core, turnOf(core), divisor);
    if (!done.event) return null;
    core = done.round;
  }
  return { ...freshRound({ ...round, now }), core, hits: [...divisors], stand: standOf(core) };
}

export const savedRound = (round) => JSON.stringify({ v: 1, kind: round.kind, code: round.code, hits: round.hits });

export function keptRound(kept, now = 0) {
  if (kept?.v !== 1 || !KEPT.includes(kept.kind) || !Array.isArray(kept.hits) || !kept.hits.every(Number.isInteger)) return null;
  const setup = decodeSetup(kept.code);
  if (!setup || setup.team !== (kept.kind === "flick")) return null;
  const round = fastForward({ kind: kept.kind, setup }, kept.hits, now);
  return round && !round.core.over ? round : null;
}

export function jarFill(round) {
  const done = round.core.at - (round.leave ? 1 : 0);
  return Math.max(0, done) / round.core.golems.length;
}

export function hintOf(round, { taught }) {
  if (!round || round.finished || round.core.over || turnOf(round.core) !== round.mySide) return null;
  if (taught && round.struggle < STRUGGLE) return null;
  return { divisor: usefulNow(round.core, round.mySide)[0] };
}
