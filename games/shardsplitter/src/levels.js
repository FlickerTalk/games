import { defineProgress } from "../../../kit/src/progress/index.js";

const CLINKS_MOST = 4;
const frozen = (lists) => Object.freeze(lists.map((list) => Object.freeze(list)));

export const HANDS = frozen([[2, 5, 10], [2, 3, 5], [2, 3, 4], [2, 4, 5], [2, 3, 6], [2, 5, 7], [2, 3, 9], [2, 4, 8], [2, 4, 7], [3, 5, 7]]);

export const TEAM_HANDS = frozen([
  frozen([[2, 4], [3, 5]]),
  frozen([[2, 5], [3, 7]]),
  frozen([[2, 7], [3, 5]]),
  frozen([[2, 4, 8], [3, 5, 9]]),
  frozen([[3, 5, 15], [2, 4, 7]]),
  frozen([[3, 9], [2, 5, 10]]),
]);

export const LOOKS = Object.freeze({
  mallet: Object.freeze(["block", "round", "wedge"]),
  place: Object.freeze(["workshop", "ice", "candy"]),
});

export const PROGRESS = defineProgress({
  curve: {
    golems: { first: 5, step: 0.34, limit: 8, eased: -1 },
    most: { first: 30, step: 5, limit: 100, eased: -15 },
    hits: { first: 2, step: 0.2, limit: 4, eased: -1 },
    caps: { first: 0, step: 0.2, limit: 2, eased: -1 },
  },
  stars: { two: 70, three: 100 },
  gifts: { looks: ["block", "workshop", "round", "ice", "wedge", "candy"], free: 2, kinds: LOOKS },
});

export const handsFor = ({ team, tier }) => (team ? TEAM_HANDS[tier] : [HANDS[tier]]);

export function roundSetup(record, { team = false, seed }) {
  const round = PROGRESS.nextRound(record);
  const { golems, most, hits, caps } = round.values;
  const hands = team ? TEAM_HANDS : HANDS;
  return {
    level: round.level,
    eased: round.eased,
    team,
    tier: Math.floor((round.level - 1) / 2) % hands.length,
    golems: Math.max(3, Math.floor(golems)),
    most: Math.max(20, Math.floor(most)),
    hits: Math.max(1, Math.floor(hits)),
    caps: Math.max(0, Math.floor(caps)),
    seed,
  };
}

export const pointsFor = (clinks) => Math.max(10, 100 - 15 * clinks);

export const wonRound = (clinks) => clinks <= CLINKS_MOST;
