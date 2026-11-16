import { STEPS } from "./level.js";

export const STEP_MS = Object.freeze({ move: 520, battery: 560, goal: 640, turn: 380, open: 480, idle: 340, bump: 640, splash: 640 });
const NUDGE = 0.22;
const AFTER = { goal: "cheer", bump: "shrug", splash: "shrug", short: "shrug" };

export function timeline(steps) {
  const starts = [];
  let total = 0;
  for (const step of steps) {
    starts.push(total);
    total += STEP_MS[step.event] ?? STEP_MS.move;
  }
  return { starts, total };
}

const smooth = (t) => t * t * (3 - 2 * t);

function during(step, progress) {
  const { from, to, event } = step;
  if (event === "turn") {
    const turn = (to.dir - from.dir + 4) % 4 === 1 ? 1 : -1;
    return { x: from.x, y: from.y, dir: from.dir, turn: turn * smooth(progress), pose: "turn" };
  }
  if (event === "bump") {
    const [dx, dy] = STEPS[from.dir];
    const reach = Math.sin(progress * Math.PI) * NUDGE;
    return { x: from.x + dx * reach, y: from.y + dy * reach, dir: from.dir, turn: 0, pose: "bump" };
  }
  if (event === "open" || event === "idle") return { x: from.x, y: from.y, dir: from.dir, turn: 0, pose: "idle" };
  const eased = smooth(progress);
  return { x: from.x + (to.x - from.x) * eased, y: from.y + (to.y - from.y) * eased, dir: from.dir, turn: 0, pose: "move" };
}

export function stepsDone(run, start, now) {
  const { starts } = timeline(run.steps);
  return run.steps.filter((step, at) => now - start >= starts[at] + (STEP_MS[step.event] ?? STEP_MS.move)).length;
}

export function poseAt(run, start, now) {
  const { starts, total } = timeline(run.steps);
  const elapsed = now - start;
  if (run.steps.length && elapsed < total) {
    const at = Math.max(0, starts.findLastIndex((begin) => begin <= elapsed));
    const step = run.steps[at];
    return { ...during(step, (elapsed - starts[at]) / (STEP_MS[step.event] ?? STEP_MS.move)), index: at, done: false };
  }
  const { x, y, dir } = run.state;
  return { x, y, dir, turn: 0, pose: AFTER[run.end] ?? "idle", index: run.steps.length, done: true };
}
