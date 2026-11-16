import { PALETTE } from './art-palette.js';
import { clamp, ellipse, hash, paint, polygon, roundedRect, starPoints } from './art-shapes.js';
import { drawCone } from './art-road.js';

function effectProgress(progress, time, speed = 1) {
  if (Number.isFinite(progress)) return clamp(progress, 0, 1);
  return ((time * speed) % 1 + 1) % 1;
}

export function drawSpeedStreaks(ctx, { width, height, roadLeft, roadWidth, time = 0, speed = 1 }) {
  const energy = clamp(speed, 0, 1);
  const travel = height + 120;
  ctx.save();
  ctx.beginPath();
  ctx.rect(roadLeft + 12, 0, roadWidth - 24, height);
  ctx.clip();
  ctx.strokeStyle = PALETTE.roadEdge;
  ctx.lineCap = 'round';
  for (let index = 0; index < 14; index += 1) {
    const x = roadLeft + 18 + hash(index * 7.3) * (roadWidth - 36);
    const y = (hash(index * 4.9) * travel + time * (90 + energy * 220)) % travel - 60;
    ctx.globalAlpha = 0.1 + energy * 0.25 * (0.5 + hash(index) * 0.5);
    ctx.lineWidth = 1.5 + hash(index + 9) * 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + 8 + energy * 30);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawExhaustPuffs(ctx, x, y, { time = 0, progress = null, scale = 1 } = {}) {
  const phase = effectProgress(progress, time, 0.8);
  ctx.save();
  for (let index = 0; index < 4; index += 1) {
    const age = (phase + index / 4) % 1;
    const px = x + Math.sin(index * 2.4 + time) * 7 * scale * age;
    const py = y + age * 34 * scale;
    ctx.globalAlpha = (1 - age) * 0.42;
    ellipse(ctx, px, py, (4 + age * 8) * scale, (3 + age * 6) * scale, PALETTE.exhaust, PALETTE.ink, 1.2);
  }
  ctx.restore();
}

export function drawBumpBurst(ctx, x, y, { time = 0, progress = null, size = 72 } = {}) {
  const phase = effectProgress(progress, time, 1.1);
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = 1 - phase;
  for (let index = 0; index < 7; index += 1) {
    const angle = index * Math.PI * 2 / 7 - Math.PI / 2;
    const distance = size * (0.1 + phase * 0.45);
    const px = Math.cos(angle) * distance;
    const py = Math.sin(angle) * distance;
    const radius = size * 0.12 * (1 - phase * 0.35);
    polygon(ctx, starPoints(px, py, radius, radius * 0.48), index % 2 ? PALETTE.playerLight : PALETTE.star, PALETTE.ink, 1.8);
  }
  ctx.restore();
}

export function drawSplash(ctx, x, y, { time = 0, progress = null, size = 80 } = {}) {
  const phase = effectProgress(progress, time, 0.9);
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = (1 - phase) * 0.85;
  ctx.strokeStyle = PALETTE.puddleLight;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 0, size * (0.12 + phase * 0.4), size * (0.05 + phase * 0.14), 0, 0, Math.PI * 2);
  ctx.stroke();
  for (let index = 0; index < 8; index += 1) {
    const angle = index * Math.PI * 2 / 8;
    const distance = size * phase * 0.45;
    const px = Math.cos(angle) * distance;
    const py = Math.sin(angle) * distance * 0.45 - Math.sin(phase * Math.PI) * size * 0.28;
    ellipse(ctx, px, py, size * 0.035, size * 0.06, index % 2 ? PALETTE.puddle : PALETTE.puddleLight, null);
  }
  ctx.restore();
}

export function drawTippingCone(ctx, x, y, size, { time = 0, progress = null } = {}) {
  const phase = effectProgress(progress, time, 0.65);
  const tip = Math.sin(phase * Math.PI);
  ctx.save();
  ctx.translate(x, y - tip * size * 0.12);
  ctx.rotate(tip * 1.2);
  drawCone(ctx, 0, 0, size);
  ctx.restore();
}

export function drawCountdown(ctx, x, y, width, { time = 0 } = {}) {
  const height = width * 0.34;
  const phase = Math.floor(((time % 4) + 4) % 4);
  const active = phase < 3 ? phase : -1;
  const colors = [PALETTE.trafficRed, PALETTE.player, PALETTE.greenLight];
  ctx.save();
  ctx.translate(x, y);
  roundedRect(ctx, -width / 2, -height / 2 + 4, width, height, height * 0.28);
  paint(ctx, PALETTE.ink, null);
  roundedRect(ctx, -width / 2, -height / 2, width, height, height * 0.28);
  paint(ctx, PALETTE.cityDark, PALETTE.ink, 3);
  for (let index = 0; index < 3; index += 1) {
    const px = (index - 1) * width * 0.27;
    if (index === active) {
      ctx.globalAlpha = 0.22;
      ellipse(ctx, px, 0, height * 0.42, height * 0.42, colors[index], null);
      ctx.globalAlpha = 1;
    }
    ellipse(ctx, px, 0, height * 0.27, height * 0.27, index === active ? colors[index] : PALETTE.lampOff, PALETTE.ink, 2);
    if (index === active) ellipse(ctx, px - height * 0.07, -height * 0.08, height * 0.055, height * 0.055, PALETTE.white, null);
  }
  ctx.restore();
}

export function drawFinishArch(ctx, x, y, width, { time = 0 } = {}) {
  const bannerHeight = width * 0.16;
  const poleHeight = width * 0.27;
  const cell = (width - 16) / 12;
  ctx.save();
  ctx.lineCap = 'round';
  for (const side of [x + 7, x + width - 7]) {
    ctx.beginPath();
    ctx.moveTo(side, y + bannerHeight * 0.5);
    ctx.lineTo(side, y + bannerHeight + poleHeight);
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 9;
    ctx.stroke();
    ctx.strokeStyle = PALETTE.roadEdge;
    ctx.lineWidth = 5;
    ctx.stroke();
    const wave = Math.sin(time * 4 + side) * width * 0.008;
    polygon(ctx, [[side, y + 2], [side + width * 0.07, y + width * 0.035 + wave], [side, y + width * 0.07]], PALETTE.player, PALETTE.ink, 2);
  }
  roundedRect(ctx, x, y, width, bannerHeight, bannerHeight * 0.18);
  paint(ctx, PALETTE.hud, PALETTE.ink, 3);
  for (let row = 0; row < 2; row += 1) {
    for (let column = 0; column < 12; column += 1) {
      ctx.fillStyle = (row + column) % 2 ? PALETTE.white : PALETTE.ink;
      ctx.fillRect(x + 8 + column * cell, y + 6 + row * (bannerHeight - 12) / 2, cell + 0.3, (bannerHeight - 12) / 2 + 0.3);
    }
  }
  ctx.restore();
}

export function drawConfetti(ctx, { width, height, time = 0, progress = null }) {
  const phase = Number.isFinite(progress) ? clamp(progress, 0, 1) : time * 0.28;
  const colors = [PALETTE.player, PALETTE.robot, PALETTE.trafficRed, PALETTE.playerGlass, PALETTE.greenLight];
  ctx.save();
  for (let index = 0; index < 28; index += 1) {
    const speed = 0.7 + hash(index * 3.1) * 0.55;
    const x = hash(index * 7.7) * width + Math.sin(time * 1.8 + index) * 8;
    const y = ((hash(index * 5.2 + 3) + phase * speed) % 1) * height;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(time * (0.8 + hash(index) * 2) + index);
    ctx.fillStyle = colors[index % colors.length];
    if (index % 3 === 0) {
      ellipse(ctx, 0, 0, 3.5, 3.5, colors[index % colors.length], null);
    } else {
      ctx.fillRect(-3, -6, 6, 12);
    }
    ctx.restore();
  }
  ctx.restore();
}
