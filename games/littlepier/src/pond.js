import { randomOf } from "../../../kit/src/canvas/random.js";

export const CREATURES = Object.freeze([
  "sprat", "ribbon", "angel", "seahorse", "crab", "turtle",
  "jelly", "octopus", "squid", "star", "scallop", "puffer",
  "ray", "eel", "shrimp", "whale", "dolphin", "seal",
  "lobster", "hermit", "nautilus", "seaBunny", "leaf", "sunfish",
]);

export const FINDS = Object.freeze(["boot", "chest", "bottle"]);

export const EDGE = 0.14;
export const MOST_VISITORS = 56;

const SPACING = 2.3;
const FIRST_ENTER = -9;
const LAST_ENTER = 92;

const HABITATS = Object.freeze([
  { name: "shallow", share: 0.44, depth: [0.1, 0.36], speed: [1, 1.25], kinds: [[0, 3], [1, 3], [2, 2], [6, 2], [22, 2], [23, 1], [16, 1], [11, 1]] },
  { name: "middle", share: 0.34, depth: [0.4, 0.7], speed: [0.8, 1.05], kinds: [[3, 2], [5, 2], [8, 2], [13, 2], [14, 3], [17, 1], [20, 1], [15, 1]] },
  { name: "floor", share: 0.22, depth: [0.84, 0.93], speed: [0.45, 0.6], kinds: [[4, 3], [9, 2], [10, 2], [7, 1], [12, 1], [18, 1], [19, 2], [21, 1]] },
]);

const FIND_DEPTH = Object.freeze({ boot: 0.62, chest: 0.9, bottle: 0.24 });

export const isFind = (kind) => typeof kind === "string";

export const habitatOf = (kind) => HABITATS.find((one) => one.kinds.some(([at]) => at === kind))?.name ?? null;

const within = ([low, high], random) => low + (high - low) * random();

function pick(list, random) {
  const total = list.reduce((sum, [, weight]) => sum + weight, 0);
  let left = random() * total;
  for (const [value, weight] of list) {
    left -= weight;
    if (left < 0) return value;
  }
  return list.at(-1)[0];
}

function creature(id, enter, random) {
  const habitat = pick(HABITATS.map((one) => [one, one.share]), random);
  return { id, kind: pick(habitat.kinds, random), depth: within(habitat.depth, random), speed: within(habitat.speed, random), direction: random() < 0.5 ? 1 : -1, enter };
}

function finds(random) {
  const order = [...FINDS];
  for (let at = order.length - 1; at > 0; at -= 1) {
    const other = Math.floor(random() * (at + 1));
    [order[at], order[other]] = [order[other], order[at]];
  }
  return order.map((kind, at) => ({ kind, depth: FIND_DEPTH[kind], speed: 0.5, direction: random() < 0.5 ? 1 : -1, enter: 12 + at * 27 + random() * 6 }));
}

const made = new Map();

export function visitorsOf(seed) {
  if (made.has(seed)) return made.get(seed);
  const random = randomOf(`${seed}/pond`);
  const list = [];
  for (let enter = FIRST_ENTER; enter < LAST_ENTER; enter += SPACING) list.push(creature(0, enter + random() * SPACING * 0.5, random));
  for (const find of finds(random)) list.push(find);
  list.sort((one, two) => one.enter - two.enter);
  const visitors = Object.freeze(list.map((one, id) => Object.freeze({ ...one, id })));
  made.set(seed, visitors);
  return visitors;
}

export function visitorAt(visitor, time, pace) {
  const travelled = (time - visitor.enter) * visitor.speed * pace;
  const x = visitor.direction > 0 ? -EDGE + travelled : 1 + EDGE - travelled;
  const floor = isFind(visitor.kind) || habitatOf(visitor.kind) === "floor";
  return { x, y: floor ? visitor.depth : visitor.depth + Math.sin(time * 1.1 + visitor.id) * 0.012 };
}

export function inPond(visitor, time, pace) {
  if (time < visitor.enter) return false;
  const { x } = visitorAt(visitor, time, pace);
  return x >= -EDGE - 1e-9 && x <= 1 + EDGE + 1e-9;
}
