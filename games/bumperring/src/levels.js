import { randomOf } from "../../../kit/src/canvas/random.js";
import { defineProgress, roundSeconds } from "../../../kit/src/progress/index.js";
import { VARIANTS } from "./arena.js";

export const PLACES = Object.freeze(["pond", "pool", "cloud"]);
export const RINGS = Object.freeze(["coral", "aqua", "lilac", "sunny"]);
export const LOOKS = Object.freeze({ place: PLACES, ring: RINGS });
export const FLICK_RING = "aqua";

export const PROGRESS = defineProgress({
  timed: true,
  curve: {
    skill: { first: 0.3, step: 0.08, limit: 0.86, eased: -0.2 },
    twists: { first: 0, step: 1, limit: VARIANTS.length - 1 },
  },
  stars: { two: 2, three: 3 },
  gifts: {
    looks: ["pond", "pool", "coral", "aqua", "lilac", "cloud", "sunny"],
    free: 4,
    kinds: LOOKS,
  },
});

const TOGETHER_LEVEL = 5;

export const ringFor = (mine) => (mine === FLICK_RING ? RINGS.find((one) => one !== mine) : FLICK_RING);

export function variantFor(seed, twists) {
  const open = VARIANTS.slice(0, Math.max(0, Math.min(VARIANTS.length - 1, Math.round(twists))) + 1);
  return open[Math.floor(randomOf(`${seed}/platform`)() * open.length)];
}

export function settingsFor(record, mode, seed) {
  const together = mode === "friend" || mode === "pair";
  const round = PROGRESS.nextRound(together ? { ...PROGRESS.fresh(), level: TOGETHER_LEVEL } : record);
  const seconds = together ? roundSeconds(TOGETHER_LEVEL) : round.seconds;
  return { level: round.level, eased: round.eased, skill: round.values.skill, seconds, variant: variantFor(seed, round.values.twists) };
}

export const wonRound = (mine, theirs) => mine > theirs;
