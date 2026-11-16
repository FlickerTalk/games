import { isSeed, randomOf } from "../../../kit/src/canvas/random.js";
import { HANDS, TEAM_HANDS, handsFor } from "./levels.js";
import { endsOf, fewestHits, splitsCleanly, standingMost } from "./numbers.js";

export const STANDING_MOST = 12;
const REST_MOST = 13;
const SMALLEST = 4;
const LARGEST = 100;
const CODE = /^S([01])([0-9a-z])([3-9])([1-4])([0-3])(\d{3})([A-Za-z0-9_-]{8})$/;

const pools = new Map();

function fits(number, hands, { hits, cap, team }) {
  const all = hands.flat();
  if (!splitsCleanly(number, all, cap) || (cap !== null && number % cap !== 0)) return false;
  const end = [...endsOf(number, all)][0];
  if (end > REST_MOST || standingMost(number, all, cap) > STANDING_MOST || fewestHits(number, all, cap) > hits) return false;
  return !team || hands.every((hand) => !endsOf(number, hand, cap).has(end));
}

export function poolFor(hands, { most = LARGEST, hits = 4, cap = null, team = false } = {}) {
  const key = JSON.stringify([hands, most, hits, cap, team]);
  if (!pools.has(key)) {
    const found = [];
    for (let number = SMALLEST; number <= Math.min(most, LARGEST); number += 1) if (fits(number, hands, { hits, cap, team })) found.push(number);
    pools.set(key, Object.freeze(found));
  }
  return pools.get(key);
}

function widest(hands, setup, cap) {
  const { team } = setup;
  const narrow = poolFor(hands, { most: setup.most, hits: setup.hits, cap, team });
  return narrow.length >= setup.golems || cap !== null ? narrow : poolFor(hands, { cap, team });
}

function draw(pool, used, random) {
  const fresh = pool.filter((number) => !used.includes(number));
  const from = fresh.length ? fresh : pool.filter((number) => number !== used.at(-1));
  const list = from.length ? from : pool;
  return list[Math.floor(random() * list.length)];
}

function cappedGolem(hands, setup, used, random) {
  const caps = hands.flat().filter((cap) => widest(hands, setup, cap).some((number) => !used.includes(number)));
  if (!caps.length) return null;
  const cap = caps[Math.floor(random() * caps.length)];
  return { number: draw(widest(hands, setup, cap), used, random), cap };
}

export function generateRound(setup) {
  const hands = handsFor(setup);
  const random = randomOf(`${setup.seed}/golems`);
  const wearers = new Set();
  while (wearers.size < Math.min(setup.caps, setup.golems - 1)) wearers.add(1 + Math.floor(random() * (setup.golems - 1)));
  const used = [];
  const golems = [];
  for (let at = 0; at < setup.golems; at += 1) {
    const golem = (wearers.has(at) && cappedGolem(hands, setup, used, random)) || { number: draw(widest(hands, setup, null), used, random), cap: null };
    used.push(golem.number);
    golems.push(golem);
  }
  return { hands, golems };
}

export function encodeSetup({ team, tier, golems, hits, caps, most, seed }) {
  return `S${team ? 1 : 0}${tier.toString(36)}${golems}${hits}${caps}${String(most).padStart(3, "0")}${seed}`;
}

export function decodeSetup(code) {
  const found = typeof code === "string" ? CODE.exec(code) : null;
  if (!found || !isSeed(found[7])) return null;
  const team = found[1] === "1";
  const tier = Number.parseInt(found[2], 36);
  const most = Number(found[6]);
  if (tier >= (team ? TEAM_HANDS : HANDS).length || most < 20 || most > LARGEST) return null;
  return { team, tier, golems: Number(found[3]), hits: Number(found[4]), caps: Number(found[5]), most, seed: found[7] };
}
