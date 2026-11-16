import { defineProgress } from "../../../kit/src/progress/index.js";

export const LOOKS = Object.freeze({
  tank: Object.freeze(["round", "long", "tall", "balloon", "snail", "wooden"]),
  ship: Object.freeze(["tug", "sail", "paddle", "duck", "bathtub", "submarine"]),
  sub: Object.freeze(["classic", "bathysphere", "whale", "bath", "longfin"]),
  ball: Object.freeze(["normal", "triple", "bouncy", "big", "rainbow"]),
});

const STARS = { two: 3, three: 5 };
const GIFTS = ["snail", "bathtub", "rainbow", "longfin", "wooden", "submarine"];
const FREE = Object.values(LOOKS).flat().filter((look) => !GIFTS.includes(look));

export const PROGRESS = defineProgress({
  curve: {
    skill: { first: 0.35, step: 0.075, limit: 0.8, eased: -0.25 },
    wind: { first: 1, step: 1, limit: 7, eased: -2 },
  },
  stars: STARS,
  tracks: { practice: STARS },
  gifts: { looks: [...FREE, ...GIFTS], free: FREE.length, kinds: LOOKS },
});

export function roundSetup(record) {
  const round = PROGRESS.nextRound(record);
  return { level: round.level, eased: round.eased, skill: Math.max(0.1, round.values.skill), wind: Math.max(0, Math.round(round.values.wind)) };
}

export function wonRound({ practice, winner, mySide, score }) {
  if (practice) return score >= STARS.two;
  return winner === null || winner === mySide;
}
