import { drawAvatar } from "../../../kit/src/avatars/index.js";
import { circle, clamp, ellipse, line, paint, polygon, roundedRect, starPath } from "../../../kit/src/canvas/pen.js";

export const POSES_SHOWN = Object.freeze(["idle", "move", "turn", "bump", "shrug", "cheer"]);
const SHAPES = ["box", "capsule", "wide", "cone", "ball", "star"];
const EXPRESSION = { idle: "happy", move: "focused", turn: "focused", bump: "surprised", shrug: "oops", cheer: "cheering" };

function body(ctx, shape, s, colour, ink, width) {
  if (shape === 1) roundedRect(ctx, -s * 0.28, -s * 0.37, s * 0.56, s * 0.7, s * 0.25);
  else if (shape === 2) roundedRect(ctx, -s * 0.42, -s * 0.28, s * 0.84, s * 0.58, s * 0.18);
  else if (shape === 3) {
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.42);
    ctx.lineTo(s * 0.36, s * 0.28);
    ctx.quadraticCurveTo(0, s * 0.42, -s * 0.36, s * 0.28);
    ctx.closePath();
  } else if (shape === 4) {
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.36, 0, Math.PI * 2);
  } else if (shape === 5) roundedRect(ctx, -s * 0.34, -s * 0.3, s * 0.68, s * 0.6, s * 0.08);
  else roundedRect(ctx, -s * 0.34, -s * 0.33, s * 0.68, s * 0.65, s * 0.19);
  paint(ctx, colour, ink, width);
}

function limbs(ctx, shape, s, { colour, pose, art, width }) {
  const wide = shape === 2 ? 0.43 : 0.34;
  for (const side of [-1, 1]) {
    roundedRect(ctx, side * s * wide - s * 0.1, s * 0.15, s * 0.2, s * 0.24, s * 0.07);
    paint(ctx, art.robot.feet, art.ink, width);
  }
  const armY = { cheer: -s * 0.2, shrug: -s * 0.1 }[pose] ?? s * 0.04;
  const reach = pose === "shrug" ? 0.47 : 0.45;
  for (const side of [-1, 1]) {
    line(ctx, [[side * s * 0.29, 0], [side * s * reach, armY]], art.ink, width * 1.5);
    ellipse(ctx, side * s * reach, armY, s * 0.075, s * 0.075, colour, art.ink, width * 0.7);
  }
}

function antenna(ctx, shape, s, art, width) {
  if (shape === 4) return;
  for (const at of shape === 5 ? [-0.18, 0.18] : [0]) {
    line(ctx, [[s * at, -s * 0.31], [s * at, -s * 0.46]], art.ink, width);
    ellipse(ctx, s * at, -s * 0.47, s * 0.065, s * 0.065, art.robot.antenna, art.ink, width * 0.7);
  }
}

function sway(pose, s, time) {
  if (pose === "move") return { dx: 0, dy: Math.sin(time * 10) * s * 0.025, turn: 0 };
  if (pose === "bump") return { dx: Math.sin(time * 22) * s * 0.045, dy: 0, turn: 0 };
  if (pose === "cheer") return { dx: 0, dy: -Math.abs(Math.sin(time * 5)) * s * 0.07, turn: 0 };
  if (pose === "turn") return { dx: 0, dy: 0, turn: Math.sin(time * 8) * 0.16 };
  if (pose === "shrug") return { dx: 0, dy: 0, turn: Math.sin(time * 6) * 0.12 };
  return { dx: 0, dy: 0, turn: 0 };
}

function screen(ctx, cx, cy, radius, face, pose, art, time) {
  circle(ctx, cx, cy, radius, art.robot.visor, art.ink, Math.max(1.5, radius * 0.12));
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.92, 0, Math.PI * 2);
  ctx.clip();
  drawAvatar(ctx, cx, cy + radius * 0.12, radius * 2.15, { ...face, face: EXPRESSION[pose] ?? "happy", time });
  ctx.restore();
}

export function drawRobot(ctx, x, y, size, { look = "box", dir = 0, pose = "idle", time = 0, face = { who: "flick" } } = {}, theme) {
  const { art } = theme;
  const shape = Math.max(0, SHAPES.indexOf(look));
  const colour = (art.robots[look] ?? art.robots.box).body;
  const width = Math.max(2, size * 0.045);
  const { dx, dy, turn } = sway(pose, size, time);
  const angle = (dir * Math.PI) / 2 + turn;
  ctx.save();
  ctx.translate(x + dx, y + dy);
  ctx.rotate(angle);
  limbs(ctx, shape, size, { colour, pose, art, width });
  body(ctx, shape, size, colour, art.ink, width);
  antenna(ctx, shape, size, art, width);
  polygon(ctx, [[0, -size * 0.37], [-size * 0.07, -size * 0.27], [size * 0.07, -size * 0.27]], art.robot.nose);
  if (shape === 5) {
    starPath(ctx, 0, size * 0.21, size * 0.07);
    paint(ctx, art.robot.nose, null, 0);
  }
  ctx.restore();
  const lift = (shape === 3 ? 0.07 : -0.04) * size;
  screen(ctx, x + dx - Math.sin(angle) * lift, y + dy + Math.cos(angle) * lift, size * (shape === 3 ? 0.19 : 0.21), face, pose, art, time);
}

export function drawGiftBox(ctx, area, shake, theme) {
  const { ink, present } = theme.art;
  const size = Math.min(area.w, area.h) * 0.9;
  const t = clamp(shake);
  ctx.save();
  ctx.translate(area.x + area.w / 2, area.y + area.h * 0.58);
  ctx.rotate(Math.sin(t * Math.PI * 4) * 0.12 * (1 - t));
  roundedRect(ctx, -size * 0.36, -size * 0.3, size * 0.72, size * 0.64, size * 0.12);
  paint(ctx, present.box, ink, size * 0.04);
  roundedRect(ctx, -size * 0.42, -size * 0.34, size * 0.84, size * 0.2, size * 0.07);
  paint(ctx, present.ribbon, ink, size * 0.035);
  roundedRect(ctx, -size * 0.08, -size * 0.3, size * 0.16, size * 0.64, 0);
  paint(ctx, present.ribbon, ink, size * 0.025);
  ellipse(ctx, -size * 0.12, -size * 0.4, size * 0.15, size * 0.1, present.ribbon, ink, size * 0.03);
  ellipse(ctx, size * 0.12, -size * 0.4, size * 0.15, size * 0.1, present.ribbon, ink, size * 0.03);
  starPath(ctx, 0, size * 0.05, size * 0.12);
  paint(ctx, theme.art.cream, ink, size * 0.025);
  ctx.restore();
}
