import { randomOf } from "../../../kit/src/canvas/random.js";
import { rivalPace } from "../../../kit/src/progress/rival.js";
import { TALL, WIDE, apart, wrapped } from "./arena.js";
import { release, steer } from "./craft.js";
import { RANGE } from "./match.js";

const PACE = { even: 0, full: 2, slowest: 0.7, fastest: 1.15 };
// steps of 1/120 s between two decisions, for a sure pilot and for an unsure one
const THINK = Object.freeze({ least: 14, more: 36, spread: 16 });
// sky widths
const TAIL = 0.1;
const SWERVE = 0.3;
const WANDER = 0.22;
const SLOWEST = 0.9;

const clamp = (value) => Math.min(1, Math.max(0, value));

export const createMind = (seed) => ({ seed, n: 0, wait: 0, plan: { kind: "chase", offset: 0 } });

function hunted(me, them) {
  if (me.lock > 0) return true;
  const { dx, dy, far } = apart(them, me);
  if (far > RANGE * 1.2 || far < 1e-6) return false;
  return (them.hx * dx + them.hy * dy) / far > 0.8 && (me.hx * dx + me.hy * dy) / far > 0;
}

function think(mind, me, them, sure) {
  const random = randomOf(`${mind.seed}/pilot/${mind.n}`);
  mind.n += 1;
  mind.wait = THINK.least + Math.round((1 - sure) * THINK.more + random() * THINK.spread);
  const [alert, lazy, side, slip] = [random(), random(), random(), random()];
  if (hunted(me, them) && alert < 0.6 + 0.4 * sure) {
    const kept = mind.plan.kind === "swerve" ? mind.plan.side : side < 0.5 ? 1 : -1;
    mind.plan = { kind: "swerve", side: kept };
  } else if (lazy < (1 - sure) * 0.15) mind.plan = { kind: "rest" };
  else mind.plan = { kind: "chase", offset: (slip * 2 - 1) * (1 - sure) * WANDER };
}

function fly(me, them, plan) {
  if (plan.kind === "rest") return release(me);
  const [x, y] = [wrapped(me.x, WIDE), wrapped(me.y, TALL)];
  if (plan.kind === "swerve") return steer(me, x - me.hy * plan.side * SWERVE + me.hx * 0.05, y + me.hx * plan.side * SWERVE + me.hy * 0.05);
  const { dx, dy } = apart(me, { x: them.x - them.hx * TAIL - them.hy * plan.offset, y: them.y - them.hy * TAIL + them.hx * plan.offset });
  return steer(me, x + dx, y + dy);
}

export function flickStep(match, seat, mind, { skill, pace = true }) {
  const [me, them] = [match.crafts[seat], match.crafts[1 - seat]];
  const sure = clamp(skill * (pace ? rivalPace(them.lost - me.lost, PACE) : 1));
  me.pace = pace ? SLOWEST + (1 - SLOWEST) * sure : 1;
  if (me.out > 0) return release(me);
  if (mind.wait > 0) mind.wait -= 1;
  else think(mind, me, them, sure);
  return fly(me, them, mind.plan);
}
