import { circle, clamp, ease, ellipse, line, paint, starPath } from "../../../kit/src/canvas/pen.js";

const PULSE = 4;

function splashPath(ctx, outer, inner, points) {
  ctx.beginPath();
  for (let at = 0; at < points * 2; at += 1) {
    const angle = -Math.PI / 2 + (at * Math.PI) / points;
    const radius = at % 2 ? inner : outer;
    if (at) ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    else ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  ctx.closePath();
}

export function drawMiss(ctx, theme, x, y, cell, progress = 1) {
  const p = clamp(progress);
  const { miss, white, foam } = theme.marks;
  ctx.save();
  ctx.translate(x, y);
  circle(ctx, 0, 0, cell * 0.19, miss, white, Math.max(1, cell * 0.06));
  circle(ctx, 0, 0, cell * 0.055, white);
  if (p < 1) {
    const distance = cell * 0.45 * ease(p);
    const radius = cell * 0.07 * (1 - p * 0.55);
    for (let drop = 0; drop < 6; drop += 1) {
      const angle = (drop * Math.PI) / 3 - Math.PI / 2;
      ellipse(ctx, Math.cos(angle) * distance, Math.sin(angle) * distance, radius * 0.65, radius, foam);
    }
  }
  ctx.restore();
}

export function drawHit(ctx, theme, x, y, cell, progress = 1) {
  const p = clamp(progress);
  const grow = 0.55 + ease(p) * 0.45;
  const { paint: colour, white } = theme.marks;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(grow, grow);
  ctx.rotate((1 - p) * -0.3);
  splashPath(ctx, cell * 0.43, cell * 0.3, 8);
  paint(ctx, colour, white, Math.max(1, cell * 0.045));
  const arm = cell * 0.15;
  const width = Math.max(1.5, cell * 0.07);
  line(ctx, [[-arm, -arm], [arm, arm]], white, width);
  line(ctx, [[arm, -arm], [-arm, arm]], white, width);
  ctx.restore();
}

export function drawAim(ctx, theme, x, y, size, time = 0) {
  const pulse = 1 + Math.sin(time * PULSE) * 0.035;
  const { white, flag } = theme.marks;
  const width = Math.max(1.5, size * 0.055);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pulse, pulse);
  circle(ctx, 0, 0, size * 0.4, null, white, width);
  circle(ctx, 0, 0, size * 0.31, null, theme.ink, width * 0.7);
  for (let corner = 0; corner < 4; corner += 1) {
    ctx.save();
    ctx.rotate((corner * Math.PI) / 2);
    line(ctx, [[-size * 0.13, -size * 0.46], [-size * 0.13, -size * 0.33], [size * 0.13, -size * 0.33]], flag, width);
    ctx.restore();
  }
  circle(ctx, 0, 0, Math.max(2, size * 0.075), flag, white, width * 0.5);
  ctx.restore();
}

export function drawLastShot(ctx, theme, x, y, cell) {
  const { white, flag } = theme.marks;
  const radius = cell * 0.44;
  circle(ctx, x, y, radius, null, white, Math.max(1, cell * 0.06));
  for (let dot = 0; dot < 4; dot += 1) {
    const angle = (dot * Math.PI) / 2 - Math.PI / 2;
    circle(ctx, x + Math.cos(angle) * radius, y + Math.sin(angle) * radius, Math.max(1.2, cell * 0.08), flag);
  }
}

export function drawOpenDot(ctx, theme, x, y, cell) {
  circle(ctx, x, y, Math.max(1, cell * 0.05), theme.board.line);
}

export function drawFoundBurst(ctx, theme, x, y, size, progress) {
  const p = clamp(progress);
  if (p <= 0 || p >= 1) return;
  const { star, gold } = theme.marks;
  ctx.save();
  ctx.globalAlpha *= 1 - p * 0.6;
  for (let spark = 0; spark < 6; spark += 1) {
    const angle = (spark * Math.PI) / 3 + p;
    const distance = size * (0.3 + ease(p) * 0.6);
    starPath(ctx, x + Math.cos(angle) * distance, y + Math.sin(angle) * distance, size * 0.2 * (1 - p * 0.45));
    paint(ctx, spark % 2 ? star : gold, theme.ink, 1);
  }
  ctx.restore();
}

export function drawPendingClock(ctx, theme, x, y, cell) {
  const radius = Math.max(5, cell * 0.14);
  const [cx, cy] = [x + cell / 2 - radius - 1, y - cell / 2 + radius + 1];
  ctx.save();
  circle(ctx, cx, cy, radius, theme.marks.white, theme.ink, 1.5);
  line(ctx, [[cx, cy - radius * 0.6], [cx, cy], [cx + radius * 0.45, cy + radius * 0.25]], theme.ink, 1.5);
  ctx.restore();
}
