import { box } from "../../../kit/src/canvas/index.js";
import { GOAL_RATIO, snapAim } from "./kicks.js";

const PAD = 8;
const GAP = 6;
const LOW = 0.06;
const MIN_SWIPE = 24;
export const TALLY = Object.freeze({ size: 14, gap: 4, pad: 8, tall: 26 });
const TALLY_WIDE = 5 * TALLY.size + 4 * TALLY.gap + 2 * TALLY.pad;
const THIRDS = ["left", "middle", "right"];

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

function barOf(width, height) {
  const row = height < 420 ? 48 : 56;
  const bar = box(PAD, PAD, width - 2 * PAD, row);
  const music = box(bar.x + bar.w - row, bar.y, row, row);
  const speaker = box(music.x - row, bar.y, row, row);
  const pause = box(speaker.x - row, bar.y, row, row);
  const volume = box(Math.max(PAD, Math.min(width - PAD - 240, speaker.x + speaker.w / 2 - 120)), bar.y + bar.h + 6, 240, 64);
  const under = bar.y + bar.h + GAP;
  const tallies = [box(PAD, under, TALLY_WIDE, TALLY.tall), box(width - PAD - TALLY_WIDE, under, TALLY_WIDE, TALLY.tall)];
  return { bar, row, controls: { pause, speaker, music }, volume, tallies };
}

function pitchOf(width, height, fill, top) {
  const bottom = height - PAD;
  const room = Math.max(0, bottom - top);
  const goalTall = clamp(Math.min(room * 0.34, (width * 0.76) / GOAL_RATIO), 40, 260);
  const goal = box((width - goalTall * GOAL_RATIO) / 2, top + Math.min(56, room * 0.09), goalTall * GOAL_RATIO, goalTall);
  const halo = clamp(Math.min(132, room * 0.36), 88, 132);
  const lowest = bottom - halo / 2 - (fill ? PAD : 0);
  const ball = { x: width / 2, y: Math.min(lowest, Math.max(top + room * 0.72, goal.y + goal.h + halo / 2 + 16)), size: clamp(goalTall * 0.26, 28, 46) };
  const keeper = { x: width / 2, y: goal.y + goalTall * 0.68, size: goalTall * 0.72 };
  const tall = clamp(goalTall * 0.75, 64, 132);
  const shooter = { x: ball.x - Math.max(halo * 0.5 + tall * 0.28, width * 0.25), y: Math.min(ball.y + tall * 0.2, height - tall * 0.58), size: tall };
  const zone = box(0, top, width, goal.y + goal.h * 1.25 - top);
  return { goal, ball, keeper, shooter, zone, spot: box(ball.x - halo / 2, ball.y - halo / 2, halo, halo), reach: clamp((ball.y - goal.y - goal.h) * 0.8, 60, 190) };
}

export function playLayout(width, height, { fill = false } = {}) {
  const top = barOf(width, height);
  return { width, height, fill, ...top, ...pitchOf(width, height, fill, top.tallies[0].y + TALLY.tall + GAP) };
}

export const toScreen = ({ goal }, { x, y }) => [goal.x + x * goal.w, goal.y + (1 - y) * goal.h];

export const toGoal = ({ goal }, { x, y }) => ({ x: (x - goal.x) / goal.w, y: (goal.y + goal.h - y) / goal.h });

const carry = ({ ball, goal, reach }) => (ball.y - goal.y - goal.h / 2) / reach;

export function aimOf(layout, to) {
  const { ball } = layout;
  const [dx, dy] = [to.x - ball.x, to.y - ball.y];
  if (-dy < MIN_SWIPE) return null;
  const by = carry(layout);
  const point = toGoal(layout, { x: ball.x + dx * by, y: ball.y + dy * by });
  return snapAim({ x: point.x, y: Math.max(LOW, point.y) });
}

export function swipeFor(layout, aim) {
  const { ball } = layout;
  const [x, y] = toScreen(layout, aim);
  const by = carry(layout);
  return { x: ball.x + (x - ball.x) / by, y: ball.y + (y - ball.y) / by };
}

export function playTargets(layout, { volume = false, role = null } = {}) {
  const { pause, speaker, music } = layout.controls;
  const controls = [{ kind: "pause", value: "pause", ...pause }, { kind: "speaker", value: "speaker", ...speaker }, { kind: "music", value: "music", ...music }];
  if (volume) return [{ kind: "volume", value: "volume", ...layout.volume }, ...controls];
  if (!role) return controls;
  const { zone } = layout;
  const wide = zone.w / THIRDS.length;
  return [...controls, ...THIRDS.map((value, at) => ({ kind: role, value, ...box(zone.x + at * wide, zone.y, wide, zone.h) }))];
}
