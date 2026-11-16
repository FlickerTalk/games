import { randomOf } from "../../../kit/src/canvas/random.js";

export const STEPS_PER_SECOND = 40;
export const STEP_MS = 1000 / STEPS_PER_SECOND;
// steps
export const ENTER = 50;
export const LULL = 50;
export const FIRST_AT = 40;
export const MOST_HITS = 150;
export const MOST_CLAIMS = MOST_HITS + 20;
export const CLEAR_BONUS = 10;
export const BONUS_STEPS = 160;
export const CLAIM_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

// size in field units, fires in orbs for each one a scout throws
export const KINDS = Object.freeze({
  scout: Object.freeze({ need: 1, worth: 1, size: 0.15, fires: 1 }),
  weaver: Object.freeze({ need: 1, worth: 1, size: 0.16, fires: 1 }),
  heavy: Object.freeze({ need: 2, worth: 3, size: 0.19, fires: 1 }),
  twin: Object.freeze({ need: 2, worth: 3, size: 0.17, fires: 1 }),
  gunner: Object.freeze({ need: 1, worth: 2, size: 0.16, fires: 3 }),
  elite: Object.freeze({ need: 3, worth: 5, size: 0.21, fires: 2 }),
  core: Object.freeze({ need: 6, worth: 8, size: 0.17, fires: 2 }),
});

export const ENEMIES = Object.freeze(["scout", "weaver", "heavy", "twin", "gunner", "elite"]);
export const FORMATIONS = Object.freeze(["rows", "vee", "snake", "ring"]);

const QUIET_END = 6 * STEPS_PER_SECOND;
const PERIOD = 240;
const EDGE = 0.08;
const DROP = 0.7;

// One turn of a wave between -1 and 1, from two parabolas: both phones must get the same number, which a sine does not promise.
export function swing(turns) {
  const part = turns - Math.floor(turns);
  const half = part < 0.5 ? part : part - 0.5;
  const height = 16 * half * (0.5 - half);
  return part < 0.5 ? height : 0 - height;
}

const SLOTS = {
  rows: (at, count) => {
    const columns = Math.min(count, 4);
    const inRow = Math.min(columns, count - Math.floor(at / columns) * columns);
    return [0.5 + ((at % columns) - (inRow - 1) / 2) * 0.19, 0.16 + Math.floor(at / columns) * 0.14];
  },
  vee: (at) => {
    const rank = Math.ceil(at / 2);
    return [0.5 + (at % 2 ? 1 : -1) * rank * 0.13, 0.36 - rank * 0.09];
  },
  snake: (at, count) => [0.5 + (at - (count - 1) / 2) * 0.14, 0.26],
  ring: () => [0.5, 0.29],
  boss: (at) => [0.5 + (at ? 0.17 : -0.17), 0.24],
};

const MOVES = {
  rows: (turn) => [0.1 * swing(turn), 0.02 * swing(turn * 2)],
  vee: (turn) => [0.14 * swing(turn * 0.8), 0.04 * swing(turn * 1.6 + 0.25)],
  snake: (turn, at) => [0.07 * swing(turn), 0.08 * swing(turn * 1.5 + at * 0.17)],
  ring: (turn, at, count) => [0.21 * swing(turn * 0.6 + at / count + 0.25) + 0.1 * swing(turn * 0.3), 0.12 * swing(turn * 0.6 + at / count)],
  boss: (turn) => [0.13 * swing(turn * 0.5), 0.03 * swing(turn)],
};

const within = (value, low, high) => Math.min(high, Math.max(low, value));

export function placeOf(group, enemy, age, pace) {
  if (age < 0) return null;
  const count = group.enemies.length;
  const [u, v] = SLOTS[group.formation](enemy.slot, count);
  const [du, dv] = MOVES[group.formation]((age * pace) / PERIOD, enemy.slot, count);
  const coming = age >= ENTER ? 0 : (1 - age / ENTER) ** 3;
  return { u: within(u + du, EDGE, 1 - EDGE), v: v + dv - coming * DROP };
}

function kindFor(random, tier) {
  const open = ENEMIES.slice(0, Math.max(1, Math.min(ENEMIES.length, Math.floor(tier))));
  return open[Math.floor(random() * open.length)];
}

function enemyOf(random, kind, slot, fire) {
  const every = Math.round((STEPS_PER_SECOND / (fire * KINDS[kind].fires)) * (0.8 + 0.4 * random()));
  return { id: 0, kind, slot, owner: null, every, phase: ENTER + Math.round(every * (0.1 + 0.6 * random())) };
}

function groupOf(random, { tier, fire }) {
  const formation = FORMATIONS[Math.floor(random() * FORMATIONS.length)];
  const count = 3 + Math.floor(random() * 3) + (formation === "ring" ? 1 : 0);
  const main = kindFor(random, tier);
  const enemies = Array.from({ length: count }, (_, slot) => enemyOf(random, random() < 0.3 ? kindFor(random, tier) : main, slot, fire));
  return { formation, latest: 0, enemies };
}

function bossOf(random, { fire }) {
  const enemies = [0, 1].map((seat) => ({ ...enemyOf(random, "core", seat, fire), owner: seat }));
  return { formation: "boss", latest: 0, enemies };
}

const needOf = (group) => group.enemies.reduce((sum, enemy) => sum + KINDS[enemy.kind].need, 0);

export function scheduleOf(seed, { groups, pace, fire, tier, seconds, boss = false }) {
  const random = randomOf(`${seed}/waves`);
  const roundSteps = seconds * STEPS_PER_SECOND;
  const gap = (roundSteps - QUIET_END - FIRST_AT) / Math.max(1, groups - 1);
  const made = [];
  let needed = boss ? 2 * KINDS.core.need : 0;
  for (let at = 0; at < groups - (boss ? 1 : 0); at += 1) {
    const group = groupOf(random, { tier, fire });
    if (needed + needOf(group) > MOST_HITS) break;
    needed += needOf(group);
    made.push(group);
  }
  if (boss) made.push(bossOf(random, { fire }));
  let id = 0;
  made.forEach((group, at) => {
    group.at = at;
    group.latest = FIRST_AT + Math.round(at * gap);
    for (const enemy of group.enemies) {
      enemy.id = id;
      enemy.group = at;
      id += 1;
    }
  });
  return { groups: made, enemies: made.flatMap((group) => group.enemies), pace, roundSteps };
}

const inOrder = (one, two) => one.t - two.t || one.seat - two.seat || one.id - two.id;

function startOf(schedule, cleared, at) {
  const { latest } = schedule.groups[at];
  return at > 0 && cleared[at - 1] !== null ? Math.min(latest, cleared[at - 1] + LULL) : latest;
}

export function tally(schedule, claims) {
  const pops = new Map();
  const hits = new Map();
  const scores = [0, 0];
  const left = schedule.groups.map((group) => group.enemies.length);
  const cleared = schedule.groups.map(() => null);
  for (const { id, t, seat } of [...claims].sort(inOrder)) {
    const enemy = schedule.enemies[id];
    if (!enemy || pops.has(id) || (enemy.owner !== null && enemy.owner !== seat)) continue;
    if (t < startOf(schedule, cleared, enemy.group) || t > schedule.roundSteps) continue;
    const count = (hits.get(id) ?? 0) + 1;
    hits.set(id, count);
    if (count < KINDS[enemy.kind].need) continue;
    pops.set(id, { t, seat });
    scores[seat] += KINDS[enemy.kind].worth;
    left[enemy.group] -= 1;
    if (left[enemy.group] === 0) cleared[enemy.group] = t;
  }
  const starts = schedule.groups.map((_, at) => startOf(schedule, cleared, at));
  const clearedAt = cleared.every((step) => step !== null) ? Math.max(...cleared) : null;
  const bonus = clearedAt === null ? 0 : CLEAR_BONUS + Math.floor((schedule.roundSteps - clearedAt) / BONUS_STEPS);
  return { pops, hits, scores, starts, clearedAt, bonus, total: scores[0] + scores[1] + bonus };
}

export function presentAt(schedule, { pops, starts }, step) {
  const shown = [];
  for (const group of schedule.groups) {
    const age = step - starts[group.at];
    if (age < 0) continue;
    for (const enemy of group.enemies) {
      if (!pops.has(enemy.id)) shown.push({ enemy, ...placeOf(group, enemy, age, schedule.pace) });
    }
  }
  return shown;
}

export function placeAt(schedule, { starts }, id, step) {
  const enemy = schedule.enemies[id];
  const group = schedule.groups[enemy.group];
  return placeOf(group, enemy, step - starts[group.at], schedule.pace);
}

const twelve = (value) => CLAIM_LETTERS[(value >> 6) & 63] + CLAIM_LETTERS[value & 63];
const CLAIMS = /^(?:[A-Za-z0-9_-]{4})*$/;

export const encodeClaims = (claims) => claims.map(({ id, t }) => twelve(id) + twelve(t)).join("");

export function decodeClaims(text, seat) {
  if (typeof text !== "string" || text.length > 4 * MOST_CLAIMS || !CLAIMS.test(text)) return null;
  const claims = [];
  for (let at = 0; at < text.length; at += 4) {
    const [a, b, c, d] = [0, 1, 2, 3].map((offset) => CLAIM_LETTERS.indexOf(text[at + offset]));
    claims.push({ id: a * 64 + b, t: c * 64 + d, seat });
  }
  return claims;
}
