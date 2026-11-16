import { DAY_THEME, PALETTE } from './art-palette.js';
import { clamp, ellipse, paint, polygon, roundedRect } from './art-shapes.js';
import { drawRoadside } from './art-scenery.js';

export { drawRoadside } from './art-scenery.js';

function drawKerbs(ctx, height, roadLeft, roadWidth, scroll) {
  const period = 30;
  const offset = ((scroll % period) + period) % period - period;
  for (let y = offset; y < height; y += period) {
    const row = Math.round((y - scroll) / period);
    ctx.fillStyle = row % 2 ? PALETTE.roadEdge : PALETTE.trafficRed;
    ctx.fillRect(roadLeft + 1, y, 9, period + 0.5);
    ctx.fillRect(roadLeft + roadWidth - 10, y, 9, period + 0.5);
  }
}

function drawCrossings(ctx, height, roadLeft, roadWidth, scroll) {
  const spacing = 520;
  const start = Math.floor(-scroll / spacing) - 1;
  const rows = Math.ceil(height / spacing) + 3;
  const cell = (roadWidth - 34) / 10;
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = PALETTE.roadEdge;
  for (let row = start; row < start + rows; row += 1) {
    const y = row * spacing + scroll;
    for (let column = 0; column < 10; column += 2) {
      ctx.fillRect(roadLeft + 17 + column * cell, y, cell, 24);
    }
  }
  ctx.restore();
}

export function drawRoad(ctx, { width, height, roadLeft, roadWidth, lanes = 3, scroll = 0, scenery = 'meadow' }, ground = DAY_THEME.ground) {
  ctx.save();
  drawRoadside(ctx, { width, height, roadLeft, roadWidth, scroll, scenery }, ground);
  ctx.fillStyle = scenery === 'night' ? PALETTE.asphaltNight : PALETTE.asphalt;
  ctx.fillRect(roadLeft, 0, roadWidth, height);
  if (scenery === 'night') drawCrossings(ctx, height, roadLeft, roadWidth, scroll);
  drawKerbs(ctx, height, roadLeft, roadWidth, scroll);
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(roadLeft, 0);
  ctx.lineTo(roadLeft, height);
  ctx.moveTo(roadLeft + roadWidth, 0);
  ctx.lineTo(roadLeft + roadWidth, height);
  ctx.stroke();
  const count = clamp(Math.round(lanes), 1, 5);
  const dashHeight = 29;
  const period = 57;
  const offset = ((scroll % period) + period) % period - period;
  ctx.fillStyle = PALETTE.lane;
  for (let lane = 1; lane < count; lane += 1) {
    const x = roadLeft + roadWidth * lane / count;
    for (let y = offset; y < height; y += period) {
      roundedRect(ctx, x - 2, y, 4, dashHeight, 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function drawFinishLine(ctx, x, y, width) {
  const columns = 12;
  const cell = width / columns;
  ctx.save();
  for (let row = 0; row < 2; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      ctx.fillStyle = (row + column) % 2 ? PALETTE.white : PALETTE.ink;
      ctx.fillRect(x + column * cell, y + row * cell, cell + 0.5, cell + 0.5);
    }
  }
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, width, cell * 2);
  ctx.restore();
}

export function drawCone(ctx, x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = 0.18;
  ellipse(ctx, size * 0.04, size * 0.38, size * 0.43, size * 0.11, PALETTE.ink, null);
  ctx.globalAlpha = 1;
  roundedRect(ctx, -size * 0.43, size * 0.25, size * 0.86, size * 0.2, size * 0.07);
  paint(ctx, PALETTE.cone, PALETTE.ink, 2.5);
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.47);
  ctx.quadraticCurveTo(size * 0.08, -size * 0.43, size * 0.29, size * 0.28);
  ctx.lineTo(-size * 0.29, size * 0.28);
  ctx.quadraticCurveTo(-size * 0.08, -size * 0.43, 0, -size * 0.47);
  ctx.closePath();
  paint(ctx, PALETTE.coneLight, PALETTE.ink, 2.5);
  polygon(ctx, [[-size * 0.19, -size * 0.02], [size * 0.19, -size * 0.02], [size * 0.24, size * 0.12], [-size * 0.24, size * 0.12]], PALETTE.white, null);
  ctx.restore();
}

export function drawPuddle(ctx, x, y, width, height, { time = 0 } = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(-width * 0.48, 0);
  ctx.bezierCurveTo(-width * 0.52, -height * 0.35, -width * 0.2, -height * 0.52, width * 0.03, -height * 0.39);
  ctx.bezierCurveTo(width * 0.3, -height * 0.55, width * 0.54, -height * 0.2, width * 0.43, height * 0.08);
  ctx.bezierCurveTo(width * 0.55, height * 0.36, width * 0.12, height * 0.5, -width * 0.08, height * 0.35);
  ctx.bezierCurveTo(-width * 0.32, height * 0.5, -width * 0.54, height * 0.24, -width * 0.48, 0);
  paint(ctx, PALETTE.puddle, PALETTE.ink, 2.5);
  const shimmer = Math.sin(time * 2.4) * width * 0.035;
  ctx.strokeStyle = PALETTE.puddleLight;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-width * 0.24 + shimmer, -height * 0.12);
  ctx.quadraticCurveTo(-width * 0.05, -height * 0.27, width * 0.14 + shimmer, -height * 0.14);
  ctx.moveTo(width * 0.08 - shimmer, height * 0.16);
  ctx.lineTo(width * 0.25 - shimmer, height * 0.1);
  ctx.stroke();
  ctx.restore();
}

export function drawHalfwayBand(ctx, x, y, width) {
  const height = width / 14;
  ctx.save();
  ctx.fillStyle = PALETTE.player;
  ctx.fillRect(x, y - height / 2, width, height);
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y - height / 2, width, height);
  for (let index = 0; index < 8; index += 1) {
    ellipse(ctx, x + (width * (index + 0.5)) / 8, y, height * 0.22, height * 0.22, PALETTE.white, null);
  }
  for (const [pole, toward] of [[x - width * 0.03, -1], [x + width * 1.03, 1]]) {
    ctx.beginPath();
    ctx.moveTo(pole, y + height / 2);
    ctx.lineTo(pole, y - height * 2.4);
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.stroke();
    polygon(ctx, [[pole, y - height * 2.4], [pole + toward * height * 1.3, y - height * 1.95], [pole, y - height * 1.5]], PALETTE.player, PALETTE.ink, 2);
  }
  ctx.restore();
}
