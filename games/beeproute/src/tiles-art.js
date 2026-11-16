import { ellipse, line, paint, polygon, roundedRect, starPath } from "../../../kit/src/canvas/pen.js";

function floorDetails(ctx, x, y, size, world, look) {
  if (world === "workshop") {
    for (const [px, py] of [[0.22, 0.22], [0.78, 0.22], [0.22, 0.78], [0.78, 0.78]]) ellipse(ctx, x + size * px, y + size * py, size * 0.035, size * 0.035, look.line);
  } else if (world === "garden") {
    line(ctx, [[x + size * 0.25, y + size * 0.7], [x + size * 0.3, y + size * 0.58]], look.line, 2);
    line(ctx, [[x + size * 0.3, y + size * 0.63], [x + size * 0.38, y + size * 0.58]], look.line, 2);
  } else {
    line(ctx, [[x + size * 0.18, y + size * 0.72], [x + size * 0.42, y + size * 0.72]], look.line, 2);
    ellipse(ctx, x + size * 0.74, y + size * 0.28, size * 0.035, size * 0.035, look.line);
  }
}

function floor(ctx, x, y, size, look, world) {
  const pad = size * 0.045;
  roundedRect(ctx, x + pad, y + pad, size - pad * 2, size - pad * 2, size * 0.16);
  paint(ctx, look.floor, look.line, Math.max(2, size * 0.035));
  floorDetails(ctx, x, y, size, world, look);
}

function wall(ctx, x, y, size, look, world, art) {
  const pad = size * 0.12;
  const width = Math.max(2.5, size * 0.045);
  roundedRect(ctx, x + pad, y + pad + size * 0.07, size - pad * 2, size - pad * 2, size * 0.15);
  paint(ctx, look.wall, art.ink, width);
  roundedRect(ctx, x + pad, y + pad, size - pad * 2, size * 0.57, size * 0.15);
  paint(ctx, look.wallTop, art.ink, width);
  if (world === "garden") {
    ellipse(ctx, x + size * 0.35, y + size * 0.34, size * 0.1, size * 0.06, look.leaf);
    ellipse(ctx, x + size * 0.62, y + size * 0.3, size * 0.1, size * 0.06, look.leaf);
  } else line(ctx, [[x + size * 0.3, y + size * 0.29], [x + size * 0.7, y + size * 0.29]], look.line, 2.5);
}

function puddle(ctx, x, y, size, art, time) {
  const drift = Math.sin(time * 2) * size * 0.015;
  ctx.beginPath();
  ctx.ellipse(x + size * 0.5, y + size * 0.55, size * 0.34, size * 0.24, -0.15, 0, Math.PI * 2);
  paint(ctx, art.puddle.water, art.ink, Math.max(2, size * 0.035));
  ellipse(ctx, x + size * 0.28, y + size * 0.39, size * 0.12, size * 0.09, art.puddle.water, art.ink, 2);
  line(ctx, [[x + size * 0.35 + drift, y + size * 0.48], [x + size * 0.48 + drift, y + size * 0.43], [x + size * 0.58 + drift, y + size * 0.46]], art.puddle.light, Math.max(2, size * 0.04));
}

function door(ctx, x, y, size, art, open) {
  const left = x + size * 0.2;
  for (const post of [left, x + size * 0.8]) {
    roundedRect(ctx, post - size * 0.07, y + size * 0.18, size * 0.14, size * 0.64, size * 0.06);
    paint(ctx, art.door.post, art.ink, 2.5);
  }
  ctx.translate(left, y + size * 0.25);
  ctx.rotate(open ? -Math.PI * 0.42 : 0);
  roundedRect(ctx, 0, 0, size * 0.6, size * 0.18, size * 0.05);
  paint(ctx, open ? art.door.open : art.door.shut, art.ink, 2.5);
  ellipse(ctx, size * 0.5, size * 0.09, size * 0.035, size * 0.035, art.door.knob);
}

function goal(ctx, x, y, size, art, { time, powered }) {
  const pulse = powered ? 1 + Math.sin(time * 2.4) * 0.035 : 1;
  if (!powered) ctx.globalAlpha = 0.55;
  ellipse(ctx, x + size * 0.5, y + size * 0.52, size * 0.32, size * 0.32, art.goal.ring, art.ink, 2.5);
  ellipse(ctx, x + size * 0.5, y + size * 0.52, size * 0.23 * pulse, size * 0.23 * pulse, art.goal.inner, art.goal.edge, powered ? 3 : 2);
  starPath(ctx, x + size * 0.5, y + size * 0.52, size * 0.15);
  paint(ctx, art.goal.star, art.ink, 2);
}

export function drawBattery(ctx, x, y, size, theme, time = 0) {
  const { art } = theme;
  const bob = Math.sin(time * 3) * size * 0.035;
  ctx.save();
  ctx.translate(x, y + bob);
  roundedRect(ctx, -size * 0.25, -size * 0.34, size * 0.5, size * 0.68, size * 0.11);
  paint(ctx, art.battery.body, art.ink, Math.max(2, size * 0.045));
  roundedRect(ctx, -size * 0.12, -size * 0.43, size * 0.24, size * 0.12, size * 0.03);
  paint(ctx, art.battery.cap, art.ink, 2);
  const bolt = [[0.04, -0.23], [-0.12, 0.03], [0.01, 0.03], [-0.05, 0.25], [0.15, -0.06], [0.02, -0.06]];
  polygon(ctx, bolt.map(([px, py]) => [size * px, size * py]), art.battery.bolt, art.ink, 1.5);
  ctx.restore();
}

export function drawTile(ctx, kind, x, y, size, theme, { world = "workshop", time = 0, open = false, powered = true, collected = false } = {}) {
  const { art } = theme;
  const look = art.worlds[world] ?? art.worlds.workshop;
  ctx.save();
  floor(ctx, x, y, size, look, world);
  if (kind === "#") wall(ctx, x, y, size, look, world, art);
  else if (kind === "~") puddle(ctx, x, y, size, art, time);
  else if (kind === "D") door(ctx, x, y, size, art, open);
  else if (kind === "G") goal(ctx, x, y, size, art, { time, powered });
  else if (kind === "B" && collected) ellipse(ctx, x + size / 2, y + size / 2, size * 0.1, size * 0.1, art.battery.body);
  else if (kind === "B") drawBattery(ctx, x + size / 2, y + size / 2, size * 0.7, theme, time);
  ctx.restore();
}
