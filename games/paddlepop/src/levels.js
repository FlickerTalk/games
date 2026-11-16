import { defineProgress, roundSeconds } from "../../../kit/src/progress/index.js";

export const PADDLES = Object.freeze(["cat", "log", "dog", "rocket", "caterpillar", "cloud"]);
export const TABLES = Object.freeze(["pond", "ice", "space"]);
export const LOOKS = Object.freeze({ paddle: PADDLES, table: TABLES });
export const FLICK_PADDLE = "rocket";

export const PROGRESS = defineProgress({
  timed: true,
  curve: {
    speed: { first: 0.62, step: 0.05, limit: 0.92, eased: -0.1 },
    skill: { first: 0.42, step: 0.07, limit: 0.84, eased: -0.2 },
  },
  stars: { two: 3, three: 5 },
  gifts: {
    looks: ["cat", "log", "dog", "rocket", "pond", "ice", "space", "caterpillar", "cloud"],
    free: 7,
    kinds: LOOKS,
  },
});

const TOGETHER_LEVEL = 4;

export function settingsFor(record, mode) {
  if (mode === "friend" || mode === "pair") {
    const { values } = PROGRESS.nextRound({ ...PROGRESS.fresh(), level: TOGETHER_LEVEL });
    return { level: TOGETHER_LEVEL, eased: false, speed: values.speed, skill: values.skill, seconds: roundSeconds(TOGETHER_LEVEL) };
  }
  const round = PROGRESS.nextRound(record);
  return { level: round.level, eased: round.eased, speed: round.values.speed, skill: round.values.skill, seconds: round.seconds };
}

export const wonRound = (mine, theirs) => mine >= theirs;
