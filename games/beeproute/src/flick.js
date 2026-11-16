import { randomOf } from "../../../kit/src/canvas/random.js";
import { runProgram, startOf, stepFrom } from "./run.js";
import { shortest, withLoops } from "./solver.js";

export const FLICK_PACE = 450;
const SLIP_CHANCE = 0.4;

export function typing(items) {
  return items.flatMap((item) => {
    if (typeof item === "string") return [{ kind: "add", command: item }];
    const open = item.times === 3 ? [{ kind: "ring" }, { kind: "ring" }] : [{ kind: "ring" }];
    return [...open, ...item.body.map((command) => ({ kind: "add", command })), { kind: "ring" }];
  });
}

function slipOf(level, way, random) {
  const states = [startOf(level)];
  for (const command of way) states.push(stepFrom(level, states.at(-1), command).state);
  const spots = way.flatMap((command, at) => (command !== "F" && ["bump", "splash"].includes(stepFrom(level, states[at], "F").event) ? [at] : []));
  if (!spots.length || random() >= SLIP_CHANCE) return null;
  const at = spots[Math.floor(random() * spots.length)];
  const attempt = [...way.slice(0, at), "F", ...way.slice(at + 1)];
  return runProgram(level, attempt).wrong === at ? { at, attempt } : null;
}

export function flickScript(level, { seed, loops }) {
  const way = shortest(level) ?? [];
  const random = randomOf(`${seed}/flick`);
  const slip = loops ? null : slipOf(level, way, random);
  if (!slip) return [...typing(loops ? withLoops(way) : way), { kind: "run" }];
  return [
    ...typing(slip.attempt),
    { kind: "run" },
    { kind: "cut", slot: slip.at },
    ...typing(way.slice(slip.at)),
    { kind: "run" },
  ];
}
