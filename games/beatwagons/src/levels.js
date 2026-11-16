import { defineProgress } from "../../../kit/src/progress/index.js";

export const TRAINS = 3;
const WRONGS_MOST = 4;

export const LOOKS = Object.freeze({
  engine: Object.freeze(["steam", "rocket", "caterpillar", "teapot", "whale", "dragon"]),
  scenery: Object.freeze(["valley", "desert", "night"]),
});

export const PROGRESS = defineProgress({
  curve: {
    length: { first: 4, step: 0.25, limit: 7, eased: -1 },
    unit: { first: 2, step: 0.1, limit: 3, eased: -1 },
    gaps: { first: 1, step: 0.1, limit: 2, eased: -1 },
    kinds: { first: 3, step: 0.5, limit: 8 },
    beats: { first: 0, step: 0.125, limit: 1, eased: -1 },
    choices: { first: 3, step: 0.25, limit: 4, eased: -1 },
  },
  stars: { two: 70, three: 100 },
  gifts: {
    looks: ["steam", "valley", "rocket", "caterpillar", "teapot", "desert", "whale", "night", "dragon"],
    free: 5,
    kinds: LOOKS,
  },
});

export function roundSetup(record) {
  const round = PROGRESS.nextRound(record);
  return { level: round.level, eased: round.eased, values: round.values };
}

export const pointsFor = (wrongs) => Math.max(10, 100 - 15 * wrongs);

export const wonRound = (wrongs) => wrongs <= WRONGS_MOST;
