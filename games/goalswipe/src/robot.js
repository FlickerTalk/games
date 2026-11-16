import { snapAim, snapDive } from "./kicks.js";

const HOME = { x: 0.5, y: 0.35 };
const SPOTS = [
  { x: 0.14, y: 0.25 }, { x: 0.86, y: 0.25 }, { x: 0.16, y: 0.72 }, { x: 0.84, y: 0.72 },
  { x: 0.3, y: 0.4 }, { x: 0.7, y: 0.4 }, { x: 0.5, y: 0.3 }, { x: 0.5, y: 0.75 },
];
const STRAY = [{ x: -0.12, y: 0.4 }, { x: 1.12, y: 0.4 }, { x: 0.3, y: 1.15 }, { x: 0.7, y: 1.15 }];

const pick = (list, random) => list[Math.min(list.length - 1, Math.floor(random() * list.length))];
const spread = (random, most) => (random() * 2 - 1) * most;

export function flickAim(random, { skill }) {
  const stray = random() < 0.24 - 0.2 * skill;
  const spot = pick(stray ? STRAY : SPOTS, random);
  return snapAim({ x: spot.x + spread(random, 0.06), y: Math.max(0.06, spot.y + spread(random, 0.08)) });
}

function away(aim, random) {
  const side = aim.x < 0.5 ? 1 : -1;
  return { x: 0.5 + side * (0.15 + random() * 0.3), y: 0.15 + random() * 0.5 };
}

const stretch = (aim) => Math.min(1, Math.hypot((aim.x - HOME.x) / 0.5, (aim.y - HOME.y) / 0.65));

export function flickDive(aim, random, { skill }) {
  const reads = random() < skill * (1 - 0.6 * stretch(aim));
  const point = reads ? { x: aim.x + spread(random, 0.07), y: aim.y + spread(random, 0.1) } : away(aim, random);
  return snapDive(point);
}
