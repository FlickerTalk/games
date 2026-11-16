import { defineProgress } from "../../../kit/src/progress/index.js";

export const LOOKS = Object.freeze({
  tip: Object.freeze(["suction", "cork", "flower"]),
  place: Object.freeze(["meadow", "mountain", "clouds"]),
});

export const RULERS = Object.freeze(["short", "medium", "long"]);

const BANDS = Object.freeze({ short: [0, 1, 2], medium: [3, 4], long: [5, 6] });

export const THRESHOLDS = Object.freeze({ two: 16, three: 28 });

export const PROGRESS = defineProgress({
  timed: true,
  curve: {
    balloons: { first: 3, step: 0.25, limit: 5, eased: -1 },
    spread: { first: 0.3, step: -0.02, limit: 0.12, eased: 0.08 },
    error: { first: 0.3, step: -0.02, limit: 0.14, eased: 0.1 },
  },
  stars: THRESHOLDS,
  gifts: { looks: ["suction", "meadow", "cork", "mountain", "flower", "clouds"], free: 2, kinds: LOOKS },
});

export const readRuler = (value) => (RULERS.includes(value) ? value : RULERS[0]);

export function stageFor(ruler, level) {
  const band = BANDS[readRuler(ruler)];
  return band[Math.min(band.length - 1, Math.floor((Math.max(1, level) - 1) / 2))];
}

export const wonRound = (stars) => stars >= 2;

export function roundSetup(record, ruler) {
  const round = PROGRESS.nextRound(record);
  return {
    level: round.level,
    seconds: round.seconds,
    stage: stageFor(ruler, round.level),
    count: Math.max(2, Math.floor(round.values.balloons)),
    spread: round.values.spread,
    error: round.values.error,
    ticks: round.eased,
  };
}
