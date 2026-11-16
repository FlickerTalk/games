import { randomOf } from "../../../kit/src/canvas/random.js";
import { wave } from "./exact.js";

export const WORLD = Object.freeze({ width: 420, height: 480 });
export const FIELDS = Object.freeze(["land", "sea", "coast", "deep"]);
export const SCENERIES = Object.freeze(["meadow", "desert", "snow"]);
export const VEHICLE_SIZE = 80;
export const TARGET_SIZE = 56;
export const COAST_EDGE = WORLD.width * 0.48;
export const DIVED_Y = WORLD.height * 0.58;

const REGION_TOP = WORLD.height * 0.5;
const REGION = WORLD.height * 0.5;
const SEA = Object.freeze({ land: null, sea: WORLD.height * 0.65, coast: WORLD.height * 0.65, deep: WORLD.height * 0.26 });
const FLOOR = WORLD.height * 0.85;
const SIDE_X = [WORLD.width * 0.2, WORLD.width * 0.8];
const HEIGHT_COUNT = 49;
const ISLANDS = Object.freeze([[0.36, 46], [0.53, 34], [0.69, 50]]);

const LAND_GROUND = ["blocks", "cans", "vane", "bell", "windmill"];
const LAND_AIR = ["balloon", "pinata", "kite"];
const SEA_FLOAT = ["barrels", "buoy", "chestRaft", "bottles", "iceberg", "rubberRing"];
const SEA_ROCK = ["lighthouse", "pirateFlag"];
const DEEP_FLOAT = ["barrels", "buoy", "bottles", "rubberRing"];
const DEEP_MID = ["bubbles", "anchor"];
const DEEP_FLOOR = ["sunkenChest", "clam"];
const HELPERS = ["giftCrate", "rainCloud", "trampoline"];

export const TARGET_GROUPS = Object.freeze({
  land: Object.freeze([...LAND_GROUND, ...LAND_AIR]),
  sea: Object.freeze([...SEA_FLOAT, ...SEA_ROCK]),
  coast: Object.freeze([...LAND_GROUND, ...LAND_AIR, ...SEA_FLOAT]),
  deep: Object.freeze([...DEEP_FLOAT, ...DEEP_MID, ...DEEP_FLOOR]),
  helper: Object.freeze([...HELPERS]),
});

const KINDS = { ground: LAND_GROUND, air: LAND_AIR, float: SEA_FLOAT, rock: SEA_ROCK, mid: DEEP_MID, floor: DEEP_FLOOR };

const SLOTS = Object.freeze({
  land: {
    battle: [["ground", 0.42], ["ground", 0.6], ["air", 0.52, 0.3]],
    practice: [["ground", 0.36], ["ground", 0.5], ["ground", 0.64], ["ground", 0.8], ["air", 0.45, 0.26], ["air", 0.66, 0.2]],
    helpers: { giftCrate: ["air", 0.47, 0.17], trampoline: ["ground", 0.51] },
    trampoline: { practice: ["ground", 0.72] },
  },
  sea: {
    battle: [["float", 0.44], ["float", 0.62], ["rock", 1]],
    practice: [["float", 0.3], ["float", 0.45], ["float", 0.62], ["float", 0.8], ["rock", 0], ["rock", 2]],
    helpers: { giftCrate: ["air", 0.47, 0.17] },
  },
  coast: {
    battle: [["ground", 0.32], ["float", 0.62], ["air", 0.52, 0.3]],
    practice: [["ground", 0.3], ["ground", 0.4], ["float", 0.6], ["float", 0.72], ["float", 0.86], ["air", 0.52, 0.26]],
    helpers: { giftCrate: ["air", 0.45, 0.17], trampoline: ["ground", 0.42] },
    trampoline: { practice: ["ground", 0.2] },
  },
  deep: {
    battle: [["float", 0.52], ["mid", 0.44, 0.48], ["floor", 0.62]],
    practice: [["floor", 0.36], ["floor", 0.56], ["floor", 0.76], ["mid", 0.48, 0.44], ["mid", 0.68, 0.36], ["float", 0.62]],
    helpers: { giftCrate: ["air", 0.5, 0.12] },
  },
});

const DEEP_KINDS = { ...KINDS, float: DEEP_FLOAT };

export const seaOf = (field) => SEA[field] ?? null;

export const floorY = (x) => FLOOR + wave((x / WORLD.width) * Math.PI * 4) * 8;

export function familyOf(field, side, { practice = false } = {}) {
  if (field === "sea") return "ship";
  if (field === "coast") return side === 0 ? "tank" : "ship";
  if (field === "deep") return side === 0 && !practice ? "ship" : "sub";
  return "tank";
}

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

export function heightsFor(field, seed) {
  const random = randomOf(`${seed}/hills`);
  const phase = random() * Math.PI * 2;
  const ripple = 0.7 + random() * 0.6;
  return Array.from({ length: HEIGHT_COUNT }, (_, index) => {
    const x = index / (HEIGHT_COUNT - 1);
    if (field === "sea" || field === "deep") return 0;
    const small = wave(x * Math.PI * 5.1 * ripple + phase * 0.7) * 0.045;
    if (field === "coast") return clamp(0.78 - x * 0.42 + small, 0.3, 0.9);
    return clamp(0.57 + wave(x * Math.PI * 2.2 + phase) * 0.16 + small, 0.28, 0.86);
  });
}

function elevation(heights, x) {
  const position = clamp(x / WORLD.width, 0, 1) * (heights.length - 1);
  const index = Math.min(heights.length - 2, Math.floor(position));
  const mix = position - index;
  return heights[index] * (1 - mix) + heights[index + 1] * mix;
}

export const hasGround = (field, x) => field === "land" || (field === "coast" && x < COAST_EDGE);

export function groundY(world, x) {
  if (!hasGround(world.field, x)) return Infinity;
  let surface = REGION_TOP + REGION * (1 - elevation(world.heights, x));
  for (const crater of world.craters) {
    const dx = x - crater.x;
    if (Math.abs(dx) < crater.r) surface = Math.max(surface, crater.y + Math.sqrt(crater.r * crater.r - dx * dx));
  }
  return surface;
}

export const islandsOf = (field) => (field === "sea" ? ISLANDS.map(([at, size]) => ({ x: WORLD.width * at, y: SEA.sea + 5, size })) : []);

function onIsland(field, x, y) {
  return islandsOf(field).some((island) => {
    const across = (x - island.x) / (island.size * 0.55);
    const down = (y - island.y) / (island.size * 0.45);
    return y <= island.y && across * across + down * down <= 1;
  });
}

export function solidAt(world, x, y) {
  if (hasGround(world.field, x)) return y >= groundY(world, x);
  if (world.field === "deep") return y >= floorY(x);
  return onIsland(world.field, x, y);
}

export function vehicleAt(world, side) {
  const family = familyOf(world.field, side, { practice: world.practice });
  const x = SIDE_X[side];
  const size = VEHICLE_SIZE;
  const sea = seaOf(world.field);
  if (family === "tank") {
    const y = groundY(world, x) + size * 0.06;
    return { side, family, x, y, size, under: false, hit: { x, y: y - size * 0.4, r: size * 0.4 } };
  }
  if (family === "ship") return { side, family, x, y: sea, size, under: false, hit: { x, y: sea - size * 0.2, r: size * 0.42 } };
  const under = Boolean(world.under?.[side]);
  const y = under ? DIVED_Y : sea;
  return { side, family, x, y, size, under, hit: { x, y: y - size * 0.05, r: size * (under ? 0.28 : 0.4) } };
}

function shuffled(list, random) {
  const copy = [...list];
  for (let at = copy.length - 1; at > 0; at -= 1) {
    const other = Math.floor(random() * (at + 1));
    [copy[at], copy[other]] = [copy[other], copy[at]];
  }
  return copy;
}

function slotPoint(world, [kind, at, high]) {
  const x = WORLD.width * at;
  const size = kind === "mid" ? TARGET_SIZE * 0.85 : TARGET_SIZE;
  if (kind === "ground") return { x, y: groundY(world, x) - size * 0.42, size };
  if (kind === "float") return { x, y: seaOf(world.field) - size * 0.22, size };
  if (kind === "floor") return { x, y: floorY(x) - size * 0.3, size };
  if (kind === "rock") {
    const island = islandsOf(world.field)[at];
    return { x: island.x, y: island.y - island.size * 0.45 - size * 0.4, size };
  }
  return { x, y: WORLD.height * high, size };
}

function helperOf(world, slots, random, practice) {
  const choices = Object.keys(slots.helpers).concat("rainCloud");
  const kind = choices[Math.floor(random() * choices.length)];
  if (kind === "rainCloud") {
    const side = practice ? 0 : Math.floor(random() * 2);
    return { kind, ...slotPoint(world, ["air", SIDE_X[side] / WORLD.width, 0.15]), hit: false };
  }
  const slot = kind === "trampoline" && practice ? slots.trampoline.practice : slots.helpers[kind];
  return { kind, ...slotPoint(world, slot), hit: false };
}

export function layTargets(world, { practice = false } = {}) {
  const random = randomOf(`${world.seed}/targets/${practice ? "practice" : "battle"}`);
  const slots = SLOTS[world.field];
  const kinds = world.field === "deep" ? DEEP_KINDS : KINDS;
  const decks = Object.fromEntries(Object.entries(kinds).map(([kind, list]) => [kind, shuffled(list, random)]));
  const taken = Object.fromEntries(Object.keys(kinds).map((kind) => [kind, 0]));
  const laid = (practice ? slots.practice : slots.battle).map((slot) => {
    const deck = decks[slot[0]];
    const kind = deck[taken[slot[0]]++ % deck.length];
    return { kind, ...slotPoint(world, slot), hit: false };
  });
  return [...laid, helperOf(world, slots, random, practice)];
}
