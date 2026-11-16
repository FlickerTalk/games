import { defineProgress } from "../../../kit/src/progress/index.js";

export const TRIES = 3;

export const LOOKS = Object.freeze({
  robot: Object.freeze(["box", "capsule", "wide", "cone", "ball", "star"]),
  world: Object.freeze(["workshop", "garden", "space"]),
});

export const PROGRESS = defineProgress({
  curve: {
    size: { first: 5, step: 0.25, limit: 7, eased: -0.5 },
    turns: { first: 1, step: 0.5, limit: 5, eased: -1 },
    batteries: { first: 0, step: 0.34, limit: 3, eased: -1 },
    blocks: { first: 2, step: 1, limit: 9, eased: -2 },
    doors: { first: 0, step: 0.15, limit: 1, eased: -1 },
    loops: { first: 0, step: 0.25, limit: 1 },
  },
  stars: { two: 70, three: 100 },
  gifts: {
    looks: ["box", "workshop", "capsule", "wide", "cone", "garden", "ball", "space", "star"],
    free: 5,
    kinds: LOOKS,
  },
});

export function roundSetup(record) {
  const round = PROGRESS.nextRound(record);
  return { level: round.level, eased: round.eased, values: round.values, loops: round.values.loops >= 1 };
}

export const pointsFor = (count, best) => Math.max(10, 100 - 15 * Math.max(0, count - best));

export const wonRound = (fails) => fails <= TRIES;
