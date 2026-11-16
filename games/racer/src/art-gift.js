import { PALETTE } from './art-palette.js';
import { drawPresent } from './art-present.js';
import { clamp, ellipse, hash, paint, polygon, roundedRect, starPoints } from './art-shapes.js';
import { drawPlayerVehicle } from './art-vehicles.js';

export const GIFT_REVEAL_SECONDS = 2.6;

function smoothstep(value) {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function drawBurst(ctx, x, y, size, time) {
  const progress = clamp((time - 0.72) / 1.25, 0, 1);
  if (progress <= 0 || progress >= 1) return;
  const colors = [PALETTE.player, PALETTE.robot, PALETTE.trafficRed, PALETTE.playerGlass, PALETTE.greenLight];
  ctx.save();
  ctx.globalAlpha = 1 - smoothstep((progress - 0.65) / 0.35);
  for (let index = 0; index < 18; index += 1) {
    const angle = -Math.PI * 0.9 + index * Math.PI * 0.8 / 17;
    const distance = size * (0.2 + progress * (0.85 + hash(index) * 0.55));
    const px = x + Math.cos(angle) * distance;
    const py = y + Math.sin(angle) * distance + progress * progress * size * 0.65;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(index + progress * 4);
    if (index % 3 === 0) {
      polygon(ctx, starPoints(0, 0, size * 0.055, size * 0.025), colors[index % colors.length], PALETTE.ink, 1);
    } else {
      ctx.fillStyle = colors[index % colors.length];
      ctx.fillRect(-size * 0.025, -size * 0.045, size * 0.05, size * 0.09);
    }
    ctx.restore();
  }
  ctx.restore();
}

export function drawGiftReveal(ctx, { width, height, kind, color = 'sunshine', time = 0 }) {
  const t = clamp(time, 0, GIFT_REVEAL_SECONDS);
  const size = clamp(Math.min(width, height) * 0.31, 82, 150);
  const boxX = width / 2;
  const boxY = height * 0.68;
  const opening = smoothstep((t - 0.42) / 0.38);
  const pop = smoothstep((t - 0.62) / 0.72);
  const wobble = t < 0.58 ? 0.9 : 0;
  ctx.save();
  ctx.fillStyle = PALETTE.sky;
  ctx.fillRect(0, 0, width, height);
  ellipse(ctx, width * 0.12, height * 0.16, size * 0.35, size * 0.35, PALETTE.playerLight, null);
  ellipse(ctx, width * 0.9, height * 0.3, size * 0.42, size * 0.42, PALETTE.grassLight, null);
  roundedRect(ctx, width * 0.08, height * 0.08, width * 0.84, height * 0.84, 34);
  paint(ctx, PALETTE.card, PALETTE.ink, 4);
  ctx.globalAlpha = 0.16;
  ellipse(ctx, boxX, boxY + size * 0.39, size * 0.62, size * 0.15, PALETTE.ink, null);
  ctx.globalAlpha = 1;
  drawPresent(ctx, boxX, boxY, size, { time: t, wobble, open: opening });
  if (t > 0.62) {
    const vehicleWidth = size * 0.62 * (0.55 + pop * 0.45);
    const vehicleY = boxY - size * 0.18 - pop * height * 0.29 - Math.sin(pop * Math.PI) * size * 0.18;
    drawPlayerVehicle(ctx, boxX, vehicleY, vehicleWidth, vehicleWidth * 1.58, {
      kind, color, time: t, steer: Math.sin(t * 4) * 0.12
    });
  }
  drawBurst(ctx, boxX, boxY - size * 0.25, size, t);
  ctx.restore();
}
