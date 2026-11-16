import { legalMoves, play } from "./rules.js";

export const MOVE_MS = 260;
export const HIT_MS = 240;
export const ROLL_MS = 450;
export const PASS_MS = 800;
export const SHAKE_MS = 450;

const clamp = (value) => Math.min(1, Math.max(0, value));
const place = (text) => (text === "b" || text === "o" ? text : Number(text));
const sameTable = (one, two) => JSON.stringify([one.points, one.bar, one.off]) === JSON.stringify([two.points, two.bar, two.off]);

function planMove(before, after, move) {
  const found = /^m(b|\d{1,2})-(o|\d{1,2})$/.exec(move);
  if (!found || before.dice === null) return null;
  const [from, to] = [place(found[1]), place(found[2])];
  const side = before.next;
  const legal = legalMoves(before).find((one) => one.from === from && one.to === to);
  const played = legal ? play(before, move, side).state : null;
  if (!played || !sameTable(played, after)) return null;
  const left = [...before.left];
  left.splice(left.indexOf(legal.die), 1);
  const hit = to !== "o" && before.points[to][1 - side] === 1;
  return { kind: "move", side, from, to, hit, dice: before.dice, left, before, after };
}

export function planChange(before, after, move) {
  if (!before || !after || typeof move !== "string") return null;
  if (move[0] === "m") return planMove(before, after, move);
  if (!sameTable(before, after)) return null;
  if (move[0] === "r" && before.dice === null && after.dice !== null) return { kind: "roll", side: after.next, dice: after.dice, before, after };
  if (move === "x" && before.dice !== null && after.dice === null) return { kind: "pass", side: before.next, dice: before.dice, left: [], before, after };
  return null;
}

export function timeline(plan, { travel = true } = {}) {
  if (plan.kind === "roll") return { total: ROLL_MS, cues: [{ at: 0, name: "dice" }] };
  if (plan.kind === "pass") return { total: PASS_MS, cues: [] };
  const land = travel ? MOVE_MS : 0;
  return { land, total: land + (plan.hit ? HIT_MS : 0), cues: [{ at: land, name: plan.hit ? "hit" : "move" }] };
}

export function moveFrame(plan, elapsed, { travel = true } = {}) {
  const line = timeline(plan, { travel });
  const done = elapsed >= line.total;
  if (plan.kind === "roll") return { tumble: clamp(elapsed / ROLL_MS), done };
  if (plan.kind === "pass") return { done };
  const progress = line.land ? clamp(elapsed / line.land) : 1;
  const hit = plan.hit && elapsed >= line.land ? clamp((elapsed - line.land) / HIT_MS) : null;
  return { progress, hit, done };
}

export function cuesBetween(plan, from, to, options) {
  return timeline(plan, options)
    .cues.filter(({ at }) => at > from && at <= to)
    .map(({ name }) => name);
}

export function shakeAt(elapsed) {
  if (!(elapsed >= 0 && elapsed < SHAKE_MS)) return 0;
  const progress = elapsed / SHAKE_MS;
  return Math.sin(progress * Math.PI * 2) * (1 - progress * 0.6);
}
