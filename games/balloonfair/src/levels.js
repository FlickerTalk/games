import { defineProgress, roundSeconds } from "../../../kit/src/progress/index.js";

export const TOOLS = Object.freeze(["popgun", "blaster", "bow"]);
export const SCENERIES = Object.freeze(["day", "beach", "evening"]);

export const PROGRESS = defineProgress({
  timed: true,
  curve: {
    // balloons a second
    rate: { first: 1, step: 0.1, limit: 1.6, eased: -0.2 },
    // field heights a second
    rise: { first: 0.13, step: 0.01, limit: 0.2, eased: -0.03 },
    skill: { first: 0.35, step: 0.07, limit: 0.84, eased: -0.2 },
  },
  stars: { two: 18, three: 36 },
  gifts: { looks: [...SCENERIES], free: 1 },
});

const TOGETHER_LEVEL = 4;

export function settingsFor(record, mode) {
  const together = mode === "friend";
  const round = PROGRESS.nextRound(together ? { ...PROGRESS.fresh(), level: TOGETHER_LEVEL } : record);
  const seconds = together ? roundSeconds(TOGETHER_LEVEL) : round.seconds;
  return { level: round.level, eased: round.eased, rate: round.values.rate, rise: round.values.rise, skill: round.values.skill, seconds };
}

export const wonRound = (kind, mine, theirs) => (kind === "alone" ? mine >= PROGRESS.spec.stars.two : mine >= theirs);
