import { defineProgress } from "../../../kit/src/progress/index.js";

export const LOOKS = Object.freeze({
  charm: Object.freeze(["star", "heart", "flower"]),
  place: Object.freeze(["pier", "boat"]),
});

export const TIMES = Object.freeze(["morning", "sunset", "night"]);

const SOLO = Object.freeze({ two: 5, three: 9 });
const PAIR = Object.freeze({ two: 8, three: 13 });

export const PROGRESS = defineProgress({
  timed: true,
  curve: {
    pace: { first: 0.08, step: 0.008, limit: 0.12, eased: -0.02 },
    rest: { first: 2.5, step: 0.5, limit: 5, eased: -1.5 },
  },
  stars: SOLO,
  tracks: { pair: PAIR },
  gifts: { looks: ["star", "pier", "heart", "boat", "flower"], free: 2, kinds: LOOKS },
});

export const trackOf = (mode) => (mode === "flick" ? "pair" : undefined);

export const thresholdsFor = (mode) => (mode === "flick" ? PAIR : SOLO);

export const wonRound = (stars) => stars >= 2;

export const dayOf = (count) => TIMES[Number.isInteger(count) && count > 0 ? count % TIMES.length : 0];

export function roundSetup(record, mode) {
  const round = PROGRESS.nextRound(record);
  return {
    level: round.level,
    eased: round.eased,
    seconds: round.seconds,
    pace: round.values.pace,
    rest: Math.max(0.5, round.values.rest),
    anglers: mode === "flick" ? 2 : 1,
  };
}
