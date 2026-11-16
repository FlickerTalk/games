import { TAU, clamp, ease, mix } from "../../../kit/src/canvas/pen.js";
import { depthScale } from "./ball.js";
import { toScreen } from "./layout.js";

// ms
export const FLIGHT = 620;
export const RESULT = 1500;
const DIVE = 300;
const BULGE = 1050;
const SPIN = 800;
const TRAIL_STEP = 28;
const TRAIL = 5;

const share = (from, ms, now) => clamp((now - from) / ms);
const smooth = (value) => value * value * (3 - 2 * value);
const flown = (kick, now) => Boolean(kick?.aim) && kick.flyAt !== null && now >= kick.flyAt;
const landed = (kick, now) => flown(kick, now) && now >= kick.landAt;

function inFlight(layout, kick, now) {
  const { ball } = layout;
  const [x, y] = toScreen(layout, kick.aim);
  const along = smooth(share(kick.flyAt, kick.landAt - kick.flyAt, now));
  const bend = Math.sin(along * Math.PI) * clamp((0.5 - kick.aim.x) * 0.2, -0.08, 0.08) * layout.width;
  return { x: mix(ball.x, x, along) + bend, y: mix(ball.y, y, along), scale: depthScale(along), turn: along * 5, alpha: 1, flying: along < 1 };
}

function afterLanding(layout, kick, now) {
  const { ball, goal } = layout;
  const [x, y] = toScreen(layout, kick.aim);
  const settled = ease(share(kick.landAt, RESULT, now));
  const still = { x, y, scale: depthScale(1), turn: 5, alpha: 1, flying: false };
  if (kick.outcome === "goal") return { ...still, y: y + settled * goal.h * 0.12 };
  if (kick.outcome !== "wide") return still;
  return { ...still, x: x + (x - ball.x) * 0.25 * settled, y: y + (y - ball.y) * 0.25 * settled, alpha: clamp(1 - share(kick.landAt, RESULT * 0.6, now)) };
}

export function ballAt(layout, kick, now) {
  const { ball } = layout;
  if (!flown(kick, now)) return { x: ball.x, y: ball.y, scale: 1, turn: 0, alpha: 1, flying: false };
  return landed(kick, now) ? afterLanding(layout, kick, now) : inFlight(layout, kick, now);
}

export function trailOf(layout, kick, now) {
  if (!flown(kick, now) || landed(kick, now)) return [];
  const points = [];
  for (let back = TRAIL; back >= 1; back -= 1) {
    const then = now - back * TRAIL_STEP;
    if (then >= kick.flyAt) points.push(ballAt(layout, kick, then));
  }
  return points.map(({ x, y }) => [x, y]);
}

function diving(layout, kick, now) {
  const home = layout.keeper;
  const { goal } = layout;
  const reached = ease(share(kick.diveAt, DIVE, now));
  const side = kick.dive.x - 0.5;
  const [x] = toScreen(layout, kick.dive);
  const rise = Math.max(0, kick.dive.y - 0.45) * goal.h * 0.5 - Math.abs(side) * goal.h * 0.12;
  return { ...home, x: mix(home.x, mix(home.x, x, 0.72), reached), y: home.y - rise * reached, pose: "dive", lean: clamp(side * 2, -1.15, 1.15) * reached, spin: 0 };
}

export function keeperAt(layout, kick, now) {
  const home = { ...layout.keeper, pose: "ready", lean: 0, spin: 0 };
  if (!kick) return home;
  const dived = kick.dive && kick.diveAt !== null && now >= kick.diveAt;
  const there = dived ? diving(layout, kick, now) : home;
  if (!landed(kick, now) || !kick.outcome) return there;
  if (kick.outcome === "wide") return { ...home, pose: "cheer" };
  if (kick.outcome === "goal") return { ...there, pose: "miss", lean: there.lean * 0.5 };
  const turned = ease(share(kick.landAt, SPIN, now));
  return { ...there, pose: "catch", lean: there.lean * (1 - turned), spin: turned * TAU };
}

export function shooterPoseAt(kick, now) {
  if (!flown(kick, now)) return "ready";
  if (!landed(kick, now) || !kick.outcome) return "kick";
  return kick.outcome === "goal" ? "cheer" : "miss";
}

export const bulgeAt = (kick, now) => (landed(kick, now) && kick.outcome === "goal" ? 1 - share(kick.landAt, BULGE, now) : 0);

export function ringOf(kick, now) {
  if (!kick?.aim || kick.ringAt === null || kick.ringAt === undefined || now < kick.ringAt || now >= kick.landAt) return null;
  return { progress: share(kick.ringAt, Math.max(1, kick.flyAt - kick.ringAt + FLIGHT * 0.4), now) };
}

export function reactionOf(kick, now) {
  if (!landed(kick, now) || !kick.outcome || kick.outcome === "wide") return 0;
  return (kick.outcome === "goal" ? 1 : 0.7) * (1 - share(kick.landAt, RESULT, now) * 0.6);
}
