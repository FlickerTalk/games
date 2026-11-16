import { defineProgress, roundSeconds } from "../../../kit/src/progress/index.js";

export const WORLDS = Object.freeze(["space", "sea", "land"]);

const named = (world, names) => Object.freeze(names.map((name) => `${world}-${name}`));

export const HULLS = Object.freeze({
  space: named("space", ["fighter", "interceptor", "gunship", "scout", "delta", "twin", "lancer", "ark"]),
  sea: named("sea", ["scout", "twin", "heavy", "ray", "sphere", "hunter", "carrier", "racer"]),
  land: named("land", ["skimmer", "racer", "crawler", "interceptor", "carrier", "glider", "striker", "lancer"]),
});

export const ZONES = Object.freeze({
  space: Object.freeze(["orbit", "nebula", "belt"]),
  sea: Object.freeze(["reef", "kelp", "trench"]),
  land: Object.freeze(["canyon", "salt", "storm"]),
});

const FREE_EACH = 2;
const inTurns = (from, to) => Array.from({ length: to - from }, (_, at) => WORLDS.map((world) => HULLS[world][from + at])).flat();

export const PROGRESS = defineProgress({
  timed: true,
  curve: {
    groups: { first: 6, step: 1.5, limit: 24, eased: -1.5 },
    // how many of the kinds of enemy come, the plain ones first
    tier: { first: 2, step: 0.5, limit: 6, eased: -1 },
    pace: { first: 0.8, step: 0.06, limit: 1.4, eased: -0.15 },
    // things thrown a second by a plain enemy
    fire: { first: 0.12, step: 0.015, limit: 0.27, eased: -0.04 },
    skill: { first: 0.4, step: 0.06, limit: 0.88, eased: -0.15 },
  },
  stars: { two: 20, three: 36 },
  gifts: { looks: [...inTurns(0, FREE_EACH), ...inTurns(FREE_EACH, 8)], free: FREE_EACH * WORLDS.length, kinds: HULLS },
});

const BOSS_EVERY = 3;
const TOGETHER = [3, 4, 5, 6];

function seedNumber(seed) {
  let sum = 0;
  for (const letter of String(seed)) sum += letter.codePointAt(0);
  return sum;
}

export function settingsFor(record, mode, seed) {
  const together = mode === "friend";
  const level = together ? TOGETHER[seedNumber(seed) % TOGETHER.length] : null;
  const round = PROGRESS.nextRound(together ? { ...PROGRESS.fresh(), level } : record);
  const { groups, tier, pace, fire, skill } = round.values;
  return { level: round.level, eased: round.eased, groups: Math.floor(groups), tier, pace, fire, skill, seconds: together ? roundSeconds(level) : round.seconds, boss: round.level % BOSS_EVERY === 0 };
}

const SHARE = 0.6;

export const wonRound = ({ cleared, score, worth }) => cleared || score >= Math.max(PROGRESS.spec.stars.two, worth * SHARE);

export const hullOf = (record, world) => (HULLS[world].includes(record.chosen?.[world]) ? record.chosen[world] : HULLS[world][0]);

export const zoneFor = (world, level) => ZONES[world][(Math.max(1, level) - 1) % ZONES[world].length];
