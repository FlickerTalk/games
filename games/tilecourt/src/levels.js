import { defineProgress } from "../../../kit/src/progress/index.js";
import { STANDARD_MIX, mixFor } from "./trays.js";

export const LOOKS = Object.freeze({
  effect: Object.freeze(["lanterns", "birds", "leaves", "bubbles", "water", "sparks"]),
  court: Object.freeze(["patio", "rooftop", "greenhouse", "seaside", "night"]),
});

const MAIN = { two: 180, three: 240 };

export const PROGRESS = defineProgress({
  curve: {
    large: { first: 0.6, step: 0.15, limit: 1.2, eased: -0.4 },
    skill: { first: 0.55, step: 0.05, limit: 0.8, eased: -0.3 },
  },
  stars: MAIN,
  tracks: { small: { two: 60, three: 85 }, big: MAIN, daily: MAIN },
  gifts: {
    looks: ["lanterns", "patio", "birds", "leaves", "greenhouse", "bubbles", "seaside", "water", "rooftop", "sparks", "night"],
    free: 3,
    kinds: LOOKS,
  },
});

export const trackOf = (variant) => (variant === "main" ? undefined : variant);

export const thresholdsFor = (variant) => PROGRESS.spec.tracks[variant] ?? PROGRESS.spec.stars;

export function roundSetup(record, { variant, mode }) {
  const round = PROGRESS.nextRound(record);
  const shared = mode === "friend" || variant === "daily";
  return {
    level: round.level,
    eased: round.eased,
    mix: shared ? STANDARD_MIX : mixFor(round.values.large),
    skill: round.values.skill,
  };
}

export function wonRound({ mode, mine, rival }) {
  if (mode === "flick" && rival) return mine.score >= rival.score;
  return mine.done;
}
