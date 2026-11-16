import { defineProgress, roundSeconds } from "../../../kit/src/progress/index.js";

export const SWORDS = Object.freeze(["broad", "curved", "paddle", "block", "wavy", "long"]);
export const SCENERIES = Object.freeze(["castle", "pillows", "treehouse"]);
export const LOOKS = Object.freeze({ sword: SWORDS, scenery: SCENERIES });
export const VARIANTS = Object.freeze(["flick", "pair"]);
export const FLICK_SWORD = "block";

export const PROGRESS = defineProgress({
  timed: true,
  curve: {
    // lures an exchange
    fakes: { first: 0, step: 0.15, limit: 1.2, eased: -0.3 },
    // ms Flick takes to answer the bell
    react: { first: 640, step: -30, limit: 400, eased: 100 },
  },
  stars: { two: 3, three: 6 },
  gifts: { looks: ["broad", "curved", "paddle", "block", "castle", "pillows", "wavy", "treehouse", "long"], free: 5, kinds: LOOKS },
});

const TOGETHER_LEVEL = 4;

export function settingsFor(record, mode) {
  const together = mode === "friend" || mode === "pair";
  const round = PROGRESS.nextRound(together ? { ...PROGRESS.fresh(), level: TOGETHER_LEVEL } : record);
  const seconds = together ? roundSeconds(TOGETHER_LEVEL) : round.seconds;
  return { level: round.level, eased: round.eased, fakes: Math.max(0, round.values.fakes), react: round.values.react, seconds };
}

export const wonRound = (mine, theirs) => mine > 0 && mine >= theirs;

export const otherSword = (mine) => (mine === "curved" ? "broad" : "curved");
