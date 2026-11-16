import { SIZE, flips, play, result, turn } from "./rules.js";

export const PLACE_MS = 220;
export const FIRST_MS = 160;
export const RIPPLE_MS = 340;
export const FLIP_MS = 300;
export const SPARK_MS = 360;
export const PASS_MS = 1800;

const clamp = (value) => Math.min(1, Math.max(0, value));
const ringOf = (from, to) => Math.max(Math.abs(Math.floor(to / SIZE) - Math.floor(from / SIZE)), Math.abs((to % SIZE) - (from % SIZE)));
const flipStart = (ring) => FIRST_MS + (ring - 1) * RIPPLE_MS;
const faceAt = (ring) => flipStart(ring) + FLIP_MS / 2;

export function planMove(before, after, move) {
  if (!before || !after || !Number.isInteger(move)) return null;
  const side = turn(before);
  const played = play(before, move, side).state;
  if (!played || played.next !== after.next || played.cells.some((one, at) => one !== after.cells[at])) return null;
  const turned = flips(before.cells, move, side)
    .map((cell) => ({ cell, ring: ringOf(move, cell) }))
    .sort((one, two) => one.ring - two.ring);
  return { cell: move, side, turned, passed: after.next === side && !result(after) };
}

export const turnedBy = (plan) => faceAt(Math.max(1, ...plan.turned.map(({ ring }) => ring))) + Math.max(FLIP_MS / 2, SPARK_MS);

export const durationOf = (plan) => turnedBy(plan) + (plan.passed ? PASS_MS : 0);

export function moveFrame(plan, elapsed) {
  const end = turnedBy(plan);
  return {
    pop: clamp(elapsed / PLACE_MS),
    flips: Object.fromEntries(plan.turned.map(({ cell, ring }) => [cell, clamp((elapsed - flipStart(ring)) / FLIP_MS)])),
    sparks: plan.turned.filter(({ ring }) => elapsed >= faceAt(ring) && elapsed < faceAt(ring) + SPARK_MS).map(({ cell, ring }) => ({ cell, progress: (elapsed - faceAt(ring)) / SPARK_MS })),
    pass: plan.passed && elapsed >= end && elapsed < end + PASS_MS ? { side: 1 - plan.side, progress: (elapsed - end) / PASS_MS } : null,
    done: elapsed >= durationOf(plan),
  };
}

export function cuesBetween(plan, from, to) {
  const started = (at) => at > from && at <= to;
  const rings = [...new Set(plan.turned.map(({ ring }) => ring))];
  const cues = rings.filter((ring) => started(faceAt(ring))).map(() => "flip");
  if (plan.passed && started(turnedBy(plan))) cues.push("pass");
  return cues;
}
