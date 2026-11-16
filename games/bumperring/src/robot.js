import { randomOf } from "../../../kit/src/canvas/random.js";
import { rivalPace } from "../../../kit/src/progress/rival.js";
import { CHARGE_STEPS, COOL, DASH, SLIDE } from "./body.js";
import { radiusNow } from "./match.js";

const PACE = { even: 0, full: 2, slowest: 0.7, fastest: 1.15 };
// cosine of the angle within which the arrow counts as on its aim
const ON_AIM = 0.9995;
const NEAR_EDGE = 0.62;
const MARGIN = 0.14;
const FIRST_WAIT = 90;

const clamp = (value) => Math.min(1, Math.max(0, value));

export const createMind = (seed) => ({ seed, n: 0, wait: FIRST_WAIT, plan: null });

export function edgeAhead(from, toward, radius) {
  const along = from.x * toward.x + from.y * toward.y;
  const inside = radius * radius - (from.x * from.x + from.y * from.y);
  return Math.sqrt(Math.max(0, along * along + inside)) - along;
}

function turnedBy({ x, y }, angle) {
  const cos = 1 - (angle * angle) / 2;
  const sin = angle - (angle * angle * angle) / 6;
  const [nx, ny] = [x * cos - y * sin, x * sin + y * cos];
  const length = Math.sqrt(nx * nx + ny * ny);
  return { x: nx / length, y: ny / length };
}

function aimAt(me, target, error) {
  const [dx, dy] = [target.x - me.x, target.y - me.y];
  const far = Math.sqrt(dx * dx + dy * dy);
  if (far < 1e-6) return { far, aim: { x: me.ax, y: me.ay } };
  return { far, aim: turnedBy({ x: dx / far, y: dy / far }, error) };
}

function makePlan(match, seat, mind, sure) {
  const random = randomOf(`${mind.seed}/flick/${mind.n}`);
  const [me, them] = [match.bodies[seat], match.bodies[1 - seat]];
  const radius = radiusNow(match);
  const out = Math.sqrt(me.x * me.x + me.y * me.y);
  const careful = random() < 0.75 + 0.25 * sure;
  const away = them.out > 0 || them.safe > 0;
  if ((out > NEAR_EDGE * radius && random() < sure + 0.2) || away) {
    if (out < 0.25) return null;
    return { home: true, error: 0, reach: out * 0.9, careful: true };
  }
  const error = (random() * 2 - 1) * (0.06 + (1 - sure) * 0.55);
  return { home: false, error, reach: 0.3 + 0.7 * random() + 0.4 * sure, careful };
}

function holdFor(match, me, plan, far, aim) {
  const wanted = plan.home ? plan.reach : far + plan.reach;
  const free = edgeAhead(me, aim, radiusNow(match)) - MARGIN;
  if (plan.careful && free < DASH.least * SLIDE) return null;
  const travel = plan.careful ? Math.min(wanted, free) : wanted;
  const power = clamp((travel / SLIDE - DASH.least) / (DASH.most - DASH.least));
  return Math.round(power * CHARGE_STEPS);
}

function rest(mind, sure) {
  const random = randomOf(`${mind.seed}/rest/${mind.n}`);
  mind.plan = null;
  mind.n += 1;
  mind.wait = COOL + Math.round((1 - sure) * 170 + random() * 70);
}

export function flickStep(match, seat, mind, { skill, pace = true }) {
  const [me, them] = [match.bodies[seat], match.bodies[1 - seat]];
  const ahead = pace ? rivalPace(them.lost - me.lost, PACE) : 1;
  const sure = clamp(skill * ahead);
  if (me.out > 0 || me.stun > 0) {
    me.down = false;
    mind.plan = null;
    return;
  }
  if (me.hold >= 0) {
    if (me.hold < mind.hold) return;
    me.down = false;
    rest(mind, sure);
    return;
  }
  me.down = false;
  if (mind.wait > 0) {
    mind.wait -= 1;
    return;
  }
  if (me.cool > 0) return;
  mind.plan ??= makePlan(match, seat, mind, sure);
  if (!mind.plan) {
    rest(mind, sure);
    return;
  }
  const { far, aim } = aimAt(me, mind.plan.home ? { x: 0, y: 0 } : them, mind.plan.error);
  if (me.ax * aim.x + me.ay * aim.y < ON_AIM) return;
  mind.hold = holdFor(match, me, mind.plan, far, aim);
  if (mind.hold === null) {
    rest(mind, sure);
    return;
  }
  me.down = true;
  me.tap = true;
}
