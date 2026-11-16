import { randomOf } from "../../../kit/src/canvas/random.js";

export const STEPS_PER_SECOND = 40;
export const STEP_MS = 1000 / STEPS_PER_SECOND;
// v runs from 0 under the awning to 1 at the counter
export const START_V = 1.1;
export const GONE_V = -0.3;
export const REACH = Object.freeze([-0.04, 1.02]);
export const MOST_HITS = 180;
export const CLAIM_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

// size in stall units, pace in level rises
export const KINDS = Object.freeze({
  round: Object.freeze({ size: 0.19, need: 1, worth: 1, pace: 1, share: 34 }),
  oval: Object.freeze({ size: 0.18, need: 1, worth: 1, pace: 1.1, share: 26 }),
  small: Object.freeze({ size: 0.125, need: 1, worth: 2, pace: 1.8, share: 14 }),
  big: Object.freeze({ size: 0.27, need: 2, worth: 2, pace: 0.6, share: 10 }),
  star: Object.freeze({ size: 0.22, need: 1, worth: 1, pace: 0.85, share: 6 }),
  cloud: Object.freeze({ size: 0.23, need: 0, worth: 0, pace: 0.7, share: 10 }),
});

const PLAIN = ["round", "oval"];
const FIRST_AT = 20;
const QUIET_END = 2 * STEPS_PER_SECOND;
const EDGE = 0.12;
const KIDS = [-0.15, 0.03, 0.16];
const KID_SPREAD_STEPS = 16;
const KID_LIFT = 0.07;
const TOTAL_SHARE = Object.values(KINDS).reduce((sum, kind) => sum + kind.share, 0);

function kindFor(random, count) {
  if (count < 3) return PLAIN[Math.floor(random() * PLAIN.length)];
  let left = random() * TOTAL_SHARE;
  for (const [name, kind] of Object.entries(KINDS)) {
    left -= kind.share;
    if (left < 0) return name;
  }
  return "round";
}

function balloonOf(random, id, kind, at, rise) {
  const perStep = (rise * KINDS[kind].pace * (0.9 + 0.2 * random())) / STEPS_PER_SECOND;
  const u = EDGE + (1 - 2 * EDGE) * random();
  const end = Math.min(1 - EDGE, Math.max(EDGE, u + (random() - 0.5) * 0.3));
  return { id, kind, at, u, rise: perStep, slide: ((end - u) * perStep) / (START_V - GONE_V), parent: null, spread: 0 };
}

function kidsOf(random, star, rise) {
  return KIDS.map((spread, at) => ({
    id: star.id + 1 + at,
    kind: "small",
    at: null,
    u: 0,
    rise: (rise * (0.9 + 0.3 * random())) / STEPS_PER_SECOND,
    slide: 0,
    parent: star.id,
    spread: spread + (random() - 0.5) * 0.04,
  }));
}

export function scheduleOf(seed, { rate, rise, seconds }) {
  const random = randomOf(`${seed}/balloons`);
  const last = seconds * STEPS_PER_SECOND - QUIET_END;
  const gap = STEPS_PER_SECOND / rate;
  const schedule = [];
  let needed = 0;
  let count = 0;
  for (let at = FIRST_AT; at <= last; at += gap * (0.6 + 0.8 * random())) {
    const kind = kindFor(random, count);
    const cost = KINDS[kind].need + (kind === "star" ? KIDS.length : 0);
    if (needed + cost > MOST_HITS) break;
    const balloon = balloonOf(random, schedule.length, kind, Math.round(at), rise);
    schedule.push(balloon);
    if (kind === "star") schedule.push(...kidsOf(random, balloon, rise));
    needed += cost;
    count += 1;
  }
  return schedule;
}

const inside = (u) => Math.min(0.94, Math.max(0.06, u));

function kidPlace(schedule, kid, step, pops) {
  const pop = pops.get(kid.parent);
  if (!pop || step < pop.t) return null;
  const from = placeOf(schedule, schedule[kid.parent], pop.t, new Map());
  if (!from) return null;
  const age = step - pop.t;
  const out = Math.min(1, age / KID_SPREAD_STEPS);
  return { u: inside(from.u + kid.spread * out), v: from.v - kid.rise * age - KID_LIFT * out };
}

export function placeOf(schedule, balloon, step, pops) {
  const place = balloon.parent === null ? ownPlace(balloon, step) : kidPlace(schedule, balloon, step, pops);
  return place && place.v >= GONE_V ? place : null;
}

function ownPlace(balloon, step) {
  const age = step - balloon.at;
  return age < 0 ? null : { u: inside(balloon.u + balloon.slide * age), v: START_V - balloon.rise * age };
}

export const reachable = (place) => Boolean(place) && place.v >= REACH[0] && place.v <= REACH[1];

export function presentAt(schedule, step, pops) {
  const shown = [];
  for (const balloon of schedule) {
    if (pops.has(balloon.id)) continue;
    const place = placeOf(schedule, balloon, step, pops);
    if (place) shown.push({ balloon, ...place });
  }
  return shown;
}

const inOrder = (one, two) => one.t - two.t || one.seat - two.seat || one.id - two.id;

export function tally(schedule, claims) {
  const pops = new Map();
  const hits = new Map();
  const scores = [0, 0];
  for (const { id, t, seat } of [...claims].sort(inOrder)) {
    const balloon = schedule[id];
    if (!balloon || pops.has(id)) continue;
    const { need, worth } = KINDS[balloon.kind];
    if (need === 0 || !reachable(placeOf(schedule, balloon, t, pops))) continue;
    const count = (hits.get(id) ?? 0) + 1;
    hits.set(id, count);
    if (count < need) continue;
    pops.set(id, { t, seat });
    scores[seat] += worth;
  }
  return { pops, hits, scores };
}

const twelve = (value) => CLAIM_LETTERS[(value >> 6) & 63] + CLAIM_LETTERS[value & 63];
const CLAIMS = /^(?:[A-Za-z0-9_-]{4})*$/;

export const encodeClaims = (claims) => claims.map(({ id, t }) => twelve(id) + twelve(t)).join("");

export function decodeClaims(text, seat) {
  if (typeof text !== "string" || text.length > 4 * MOST_HITS || !CLAIMS.test(text)) return null;
  const claims = [];
  for (let at = 0; at < text.length; at += 4) {
    const [a, b, c, d] = [0, 1, 2, 3].map((offset) => CLAIM_LETTERS.indexOf(text[at + offset]));
    claims.push({ id: a * 64 + b, t: c * 64 + d, seat });
  }
  return claims;
}
