import { defineProgress } from "../../../kit/src/progress/index.js";
import { FINISH } from "./rules.js";

export const LOOKS = Object.freeze({
  track: Object.freeze(["garden", "city", "moon"]),
  dice: Object.freeze(["cream", "sky", "mint", "rose"]),
});

export const PROGRESS = defineProgress({
  curve: { skill: { first: 0.55, step: 0.05, limit: 0.9, eased: -0.2 } },
  stars: { two: FINISH, three: FINISH + 10 },
  gifts: { looks: ["garden", "cream", "sky", "city", "mint", "moon", "rose"], free: 3, kinds: LOOKS },
});

export const flickSkill = (record) => PROGRESS.nextRound(record).values.skill;

export const scoreOf = (race, side) => (race.winner === side ? FINISH + (FINISH - race.at[1 - side]) : race.at[side]);
