import { defineProgress } from "../../../kit/src/progress/index.js";
import { REACH } from "./kicks.js";

export const BALLS = Object.freeze(["classic", "beachball", "star"]);
export const FIELDS = Object.freeze(["school", "beach", "stadium"]);
export const LOOKS = Object.freeze({ ball: BALLS, field: FIELDS });

// ms the ring shows where the ball will go before it leaves the spot
const PAIR_WARN = 450;

export const PROGRESS = defineProgress({
  curve: {
    skill: { first: 0.4, step: 0.07, limit: 0.82, eased: -0.2 },
    warn: { first: 650, step: -70, limit: 300, eased: 200 },
    reach: { first: 0.44, step: -0.03, limit: 0.32, eased: 0.06 },
  },
  stars: { two: 5, three: 8 },
  gifts: { looks: ["classic", "school", "beachball", "beach", "star", "stadium"], free: 3, kinds: LOOKS },
});

export function settingsFor(record, kind) {
  if (kind === "friend") return { level: null, eased: false, skill: null, warn: 0, reach: REACH.blind };
  if (kind === "pair") return { level: null, eased: false, skill: null, warn: PAIR_WARN, reach: REACH.pair };
  const round = PROGRESS.nextRound(record);
  return { level: round.level, eased: round.eased, ...round.values };
}

export const wonRound = (mine, theirs) => mine >= theirs;
