import { aheadOf, cellOf, indexOf, placeOf } from "./level.js";
import { slotsOf, stepsOf } from "./program.js";

const STOPS = ["bump", "splash", "goal"];

export const cellsOfKind = (level, kind) => [...level.cells].flatMap((one, at) => (one === kind ? [at] : []));

export const fullMask = (level) => (1 << cellsOfKind(level, "B").length) - 1;

export function startOf(level) {
  const { x, y } = placeOf(level, level.start.at);
  return { x, y, dir: level.start.dir, got: 0, opened: 0 };
}

const bitOf = (level, kind, x, y) => 1 << cellsOfKind(level, kind).indexOf(indexOf(level, x, y));

function forward(level, state) {
  const { x, y } = aheadOf(level, state);
  const kind = cellOf(level, x, y);
  const open = kind === "D" && (state.opened & bitOf(level, "D", x, y)) !== 0;
  if (kind === null || kind === "#" || (kind === "D" && !open)) return { state, event: "bump" };
  const moved = { ...state, x, y };
  if (kind === "~") return { state: moved, event: "splash" };
  if (kind === "B" && !(state.got & bitOf(level, "B", x, y))) {
    const got = state.got | bitOf(level, "B", x, y);
    return { state: { ...moved, got }, event: "battery" };
  }
  if (kind === "G" && state.got === fullMask(level)) return { state: moved, event: "goal" };
  return { state: moved, event: "move" };
}

function use(level, state) {
  const { x, y } = aheadOf(level, state);
  if (cellOf(level, x, y) !== "D") return { state, event: "idle" };
  const opened = state.opened | bitOf(level, "D", x, y);
  return opened === state.opened ? { state, event: "idle" } : { state: { ...state, opened }, event: "open" };
}

export function stepFrom(level, state, command) {
  if (command === "F") return forward(level, state);
  if (command === "U") return use(level, state);
  return { state: { ...state, dir: (state.dir + (command === "R" ? 1 : 3)) % 4 }, event: "turn" };
}

export function runProgram(level, items, from = startOf(level)) {
  const steps = [];
  let state = from;
  for (const { command, slot } of stepsOf(items)) {
    const step = stepFrom(level, state, command);
    steps.push({ slot, command, from: state, to: step.state, event: step.event });
    state = step.state;
    if (STOPS.includes(step.event)) return { steps, end: step.event, wrong: step.event === "goal" ? null : slot, state, got: state.got };
  }
  return { steps, end: "short", wrong: slotsOf(items), state, got: state.got };
}
