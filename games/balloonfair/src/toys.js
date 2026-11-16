import { TAU, circle, clamp, ease, ellipse, line, paint, polygon, roundedRect } from "../../../kit/src/canvas/pen.js";
import { rimmed } from "./balloons.js";

function placed(ctx, x, y, angle, firing, size, draw) {
  ctx.save();
  ctx.translate(x, y + Math.sin(clamp(firing) * Math.PI) * size * 0.055);
  ctx.rotate(angle + Math.PI / 2);
  draw();
  ctx.restore();
}

function popgun(ctx, s, { toys, ink }) {
  roundedRect(ctx, -s * 0.16, s * 0.12, s * 0.32, s * 0.42, s * 0.1);
  paint(ctx, toys.woodLight, ink, 4);
  roundedRect(ctx, -s * 0.39, -s * 0.2, s * 0.78, s * 0.4, s * 0.16);
  paint(ctx, toys.body, ink, 4);
  roundedRect(ctx, -s * 0.18, -s * 0.48, s * 0.36, s * 0.35, s * 0.1);
  paint(ctx, toys.barrel, ink, 4);
  ellipse(ctx, 0, -s * 0.48, s * 0.18, s * 0.08, toys.corkLight, ink, 4);
  ellipse(ctx, 0, -s * 0.48, s * 0.1, s * 0.04, ink);
  circle(ctx, s * 0.22, 0, s * 0.065, toys.knob, ink, 3);
  ctx.beginPath();
  ctx.arc(0, s * 0.21, s * 0.12, 0, Math.PI);
  paint(ctx, null, ink, 4);
}

function blaster(ctx, s, { toys, ink }, tank) {
  roundedRect(ctx, -s * 0.08, s * 0.12, s * 0.27, s * 0.4, s * 0.08);
  paint(ctx, toys.body, ink, 4);
  roundedRect(ctx, -s * 0.42, -s * 0.25, s * 0.76, s * 0.42, s * 0.16);
  paint(ctx, toys.body, ink, 4);
  roundedRect(ctx, -s * 0.35, -s * 0.44, s * 0.32, s * 0.58, s * 0.12);
  paint(ctx, toys.tank, ink, 4);
  const water = s * 0.43 * clamp(tank);
  if (water > 0) {
    roundedRect(ctx, -s * 0.3, s * 0.04 - water, s * 0.22, water, Math.min(s * 0.06, water / 2));
    paint(ctx, toys.water);
  }
  roundedRect(ctx, s * 0.17, -s * 0.43, s * 0.22, s * 0.3, s * 0.07);
  paint(ctx, toys.nozzle, ink, 4);
  polygon(ctx, [[s * 0.2, -s * 0.42], [s * 0.47, -s * 0.52], [s * 0.47, -s * 0.36], [s * 0.2, -s * 0.3]], toys.waterLight, ink, 4);
  circle(ctx, s * 0.16, -s * 0.04, s * 0.055, toys.knob, ink, 3);
}

const BOW_ENDS = 0.12;
const BOW_DRAW = 0.27;

function bow(ctx, s, theme, pull, arrow) {
  const { toys, ink } = theme.art;
  const drawn = BOW_ENDS * s + clamp(pull) * s * BOW_DRAW;
  line(ctx, [[-s * 0.45, s * BOW_ENDS], [0, drawn], [s * 0.45, s * BOW_ENDS]], toys.string, 2.5);
  if (arrow) drawArrow(ctx, 0, drawn - s * 0.36, s * 0.8, -Math.PI / 2, theme);
  ctx.beginPath();
  ctx.moveTo(-s * 0.48, s * BOW_ENDS);
  ctx.quadraticCurveTo(0, -s * 0.6, s * 0.48, s * BOW_ENDS);
  ctx.lineCap = "round";
  paint(ctx, null, ink, s * 0.1);
  paint(ctx, null, toys.woodLight, s * 0.055);
  circle(ctx, 0, -s * 0.24, s * 0.07, toys.body, ink, 3);
}

export function drawToy(ctx, tool, x, y, size, theme, { firing = 0, tank = 1, pull = 0, angle = -Math.PI / 2, arrow = true } = {}) {
  placed(ctx, x, y, tool === "bow" ? angle : -Math.PI / 2, firing, size, () =>
    rimmed(ctx, theme, () => {
      if (tool === "blaster") blaster(ctx, size, theme.art, tank);
      else if (tool === "bow") bow(ctx, size, theme, pull, arrow);
      else popgun(ctx, size, theme.art);
    }),
  );
}

export function drawArrow(ctx, x, y, length, angle, theme) {
  const { toys, ink } = theme.art;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle + Math.PI / 2);
  rimmed(ctx, theme, () => {
    line(ctx, [[0, length * 0.45], [0, -length * 0.37]], toys.wood, Math.max(3, length * 0.045));
    polygon(ctx, [[0, length * 0.33], [-length * 0.13, length * 0.46], [0, length * 0.42], [length * 0.13, length * 0.46]], toys.body, ink, 2);
    ctx.beginPath();
    ctx.moveTo(-length * 0.12, -length * 0.47);
    ctx.quadraticCurveTo(0, -length * 0.58, length * 0.12, -length * 0.47);
    ctx.lineTo(length * 0.09, -length * 0.35);
    ctx.quadraticCurveTo(0, -length * 0.4, -length * 0.09, -length * 0.35);
    ctx.closePath();
    paint(ctx, toys.cup, ink, 3);
  });
  ctx.restore();
}

export function drawCork(ctx, x, y, size, angle, theme) {
  const { toys, ink } = theme.art;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  rimmed(ctx, theme, () => {
    roundedRect(ctx, -size * 0.38, -size * 0.45, size * 0.76, size * 0.9, size * 0.25);
    paint(ctx, toys.corkLight, ink, 3);
  });
  line(ctx, [[-size * 0.22, -size * 0.1], [size * 0.2, -size * 0.18]], toys.cork, 2);
  line(ctx, [[-size * 0.18, size * 0.17], [size * 0.16, size * 0.12]], toys.cork, 2);
  ctx.restore();
}

const AIM_DOTS = 7;

export function drawAimLine(ctx, x, y, length, angle, pull, theme) {
  const { effects, ink } = theme.art;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle + Math.PI / 2);
  rimmed(ctx, theme, () => {
    for (let at = 1; at <= AIM_DOTS; at += 1) circle(ctx, 0, (-length * at) / AIM_DOTS, 3 + pull * 2 + at * 0.2, at === AIM_DOTS ? effects.aimEnd : effects.aim, ink, 1.5);
  });
  ctx.restore();
}

export function drawSplash(ctx, x, y, radius, progress, theme) {
  const p = clamp(progress);
  if (p >= 1) return;
  const { toys, white, ink } = theme.art;
  const r = radius * (0.25 + ease(p) * 0.75);
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = 1 - p * 0.7;
  circle(ctx, 0, 0, r, toys.waterLight, toys.water, 7 * (1 - p * 0.5));
  for (let at = 0; at < 10; at += 1) {
    const angle = (at * TAU) / 10;
    ellipse(ctx, Math.cos(angle) * r * 1.1, Math.sin(angle) * r * 1.1, 5, 9, toys.water, ink, 1.5);
  }
  circle(ctx, -r * 0.25, -r * 0.2, r * 0.12, white);
  ctx.restore();
}

export function drawMissPuff(ctx, x, y, size, progress, theme) {
  const p = clamp(progress);
  if (p >= 1) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = 1 - p;
  rimmed(ctx, theme, () => {
    for (let at = 0; at < 4; at += 1) {
      const angle = (at * TAU) / 4 + Math.PI / 4;
      circle(ctx, Math.cos(angle) * size * p * 0.5, Math.sin(angle) * size * p * 0.5, size * (0.18 - p * 0.06), theme.art.effects.miss, theme.art.ink, 2);
    }
  });
  ctx.restore();
}

export function drawGauge(ctx, x, y, width, share, ui) {
  const height = 12;
  ctx.save();
  roundedRect(ctx, x - width / 2, y - height / 2, width, height, height / 2);
  paint(ctx, ui.track, ui.border, ui.line);
  const filled = clamp(share);
  if (filled > 0) {
    roundedRect(ctx, x - width / 2, y - height / 2, Math.max(height, width * filled), height, height / 2);
    paint(ctx, ui.accent);
  }
  ctx.restore();
}
