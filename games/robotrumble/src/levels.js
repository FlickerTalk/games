import { defineProgress, roundSeconds } from "../../../kit/src/progress/index.js";

export const ROBOTS = Object.freeze(["round", "tall", "square", "wheel", "propeller", "bigHead"]);
export const STAGES = Object.freeze(["shelf", "kitchen", "box"]);
export const LOOKS = Object.freeze({ robot: ROBOTS, stage: STAGES });
export const FLICK_ROBOT = "square";
const FLICK_SECOND = "tall";

// ms the robots take to show what both chose
export const SHOW_MS = 1100;

export const PROGRESS = defineProgress({
  timed: true,
  curve: {
    skill: { first: 0.3, step: 0.06, limit: 0.84, eased: -0.2 },
    window: { first: 1700, step: -100, limit: 1100, eased: 300 },
  },
  stars: { two: 3, three: 6 },
  gifts: {
    looks: ["round", "tall", "square", "wheel", "shelf", "kitchen", "box", "propeller", "bigHead"],
    free: 7,
    kinds: LOOKS,
  },
});

const TOGETHER_LEVEL = 4;

function timed({ level, eased, skill, window, seconds }) {
  const period = window + SHOW_MS;
  return { level, eased, skill, window, seconds, period, exchanges: Math.floor((seconds * 1000) / period) };
}

export function settingsFor(record, kind) {
  if (kind === "friend" || kind === "pair") {
    const { values } = PROGRESS.nextRound({ ...PROGRESS.fresh(), level: TOGETHER_LEVEL });
    return timed({ level: TOGETHER_LEVEL, eased: false, ...values, seconds: roundSeconds(TOGETHER_LEVEL) });
  }
  const round = PROGRESS.nextRound(record);
  return timed({ level: round.level, eased: round.eased, ...round.values, seconds: round.seconds });
}

export const rivalRobot = (mine) => (mine === FLICK_ROBOT ? FLICK_SECOND : FLICK_ROBOT);

export const wonRound = (mine, theirs) => mine >= theirs;
