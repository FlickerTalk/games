import { drawRobotCar } from './art-cars.js';
import { drawPlayerVehicle, vehicleTint } from './art-vehicles.js';
import { DAY_THEME, PALETTE } from './art-palette.js';
import { clamp, ellipse, paint, polygon, roundedRect } from './art-shapes.js';

function drawTinyFlag(ctx, x, y, size, ink) {
  ctx.beginPath();
  ctx.moveTo(x, y - size * 0.55);
  ctx.lineTo(x, y + size * 0.55);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  const cell = size * 0.23;
  for (let row = 0; row < 2; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      ctx.fillStyle = (row + column) % 2 ? PALETTE.white : PALETTE.ink;
      ctx.fillRect(x + column * cell, y - size * 0.54 + row * cell, cell, cell);
    }
  }
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y - size * 0.54, cell * 3, cell * 2);
}

function drawProgressIcon(ctx, drawCar, x, y, size, leading) {
  if (leading) {
    ctx.globalAlpha = 0.3;
    ellipse(ctx, x, y, size * 0.55, size * 0.43, PALETTE.trophy, null);
    ctx.globalAlpha = 1;
    polygon(ctx, [
      [x - size * 0.2, y - size * 0.47], [x - size * 0.22, y - size * 0.65],
      [x - size * 0.06, y - size * 0.54], [x, y - size * 0.7],
      [x + size * 0.07, y - size * 0.54], [x + size * 0.22, y - size * 0.65],
      [x + size * 0.2, y - size * 0.47]
    ], PALETTE.trophy, PALETTE.ink, 1.4);
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI / 2);
  drawCar(ctx, 0, 0, size * 0.54, size * 0.78, { time: 0 });
  ctx.restore();
}

function drawHalfwayMark(ctx, x, y, height, ink) {
  ctx.beginPath();
  ctx.moveTo(x, y + height * 0.14);
  ctx.lineTo(x, y + height * 0.86);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.stroke();
  ellipse(ctx, x, y + height * 0.14, height * 0.09, height * 0.09, PALETTE.player, PALETTE.ink, 1.5);
}

export function drawProgressStrip(ctx, x, y, width, height, { player = 0, robot = 0 } = {}, vehicle = {}, rival = null, { halfway = null } = {}, { hud } = DAY_THEME) {
  const playerProgress = clamp(player, 0, 1);
  const robotProgress = clamp(robot, 0, 1);
  ctx.save();
  roundedRect(ctx, x, y + 3, width, height, height * 0.28);
  paint(ctx, PALETTE.ink, null);
  roundedRect(ctx, x, y, width, height, height * 0.28);
  paint(ctx, hud.strip, hud.edge, 3);
  const iconSize = height * 0.68;
  const start = x + iconSize * 0.65;
  const end = x + width - iconSize * 0.75;
  const rows = [y + height * 0.3, y + height * 0.73];
  const progress = [playerProgress, robotProgress];
  rows.forEach((rowY, index) => {
    const carX = start + (end - start) * progress[index];
    ctx.beginPath();
    ctx.moveTo(start, rowY);
    ctx.lineTo(end, rowY);
    ctx.strokeStyle = hud.track;
    ctx.lineWidth = height * 0.1;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(start, rowY);
    ctx.lineTo(carX, rowY);
    const other = rival ? vehicleTint(rival.kind, rival.color) : PALETTE.robotLight;
    ctx.strokeStyle = index === 0 ? vehicleTint(vehicle.kind, vehicle.color) : other;
    ctx.lineWidth = height * 0.07;
    ctx.stroke();
  });
  if (halfway !== null) drawHalfwayMark(ctx, start + (end - start) * halfway, y, height, hud.text);
  drawTinyFlag(ctx, end + iconSize * 0.18, y + height * 0.5, height * 0.42, hud.text);
  const drawPlayer = (context, px, py, w, h, options) => drawPlayerVehicle(context, px, py, w, h, { ...options, ...vehicle });
  drawProgressIcon(ctx, drawPlayer, start + (end - start) * playerProgress, rows[0], iconSize, playerProgress > robotProgress + 0.015);
  const drawOther = rival ? (context, px, py, w, h, options) => drawPlayerVehicle(context, px, py, w, h, { ...options, ...rival }) : drawRobotCar;
  drawProgressIcon(ctx, drawOther, start + (end - start) * robotProgress, rows[1], iconSize, robotProgress > playerProgress + 0.015);
  ctx.restore();
}

function drawTouchRing(ctx, x, y, radius, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha * 0.18;
  ellipse(ctx, x, y, radius * 1.25, radius * 1.25, PALETTE.playerGlass, null);
  ctx.globalAlpha = alpha * 0.72;
  ellipse(ctx, x, y, radius, radius, null, PALETTE.white, Math.max(2, radius * 0.11));
  ctx.globalAlpha = alpha * 0.5;
  ellipse(ctx, x, y, radius * 0.68, radius * 0.68, null, PALETTE.playerGlass, Math.max(1.5, radius * 0.07));
  ctx.restore();
}

export function drawTouchPoint(ctx, x, y, { pressed = false, time = 0 } = {}) {
  const fade = pressed ? 1 : clamp(1 - time / 0.45, 0, 1);
  if (fade === 0) return;
  const pulse = 1 + Math.sin(time * 6) * 0.08;
  const radius = 22 * pulse + (pressed ? 0 : time * 30);
  drawTouchRing(ctx, x, y, radius, fade * (pressed ? 1 : 0.8));
}

function drawHand(ctx, x, y, size) {
  const line = Math.max(2.2, size * 0.035);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.08);
  roundedRect(ctx, -size * 0.14, size * 0.61, size * 0.35, size * 0.2, size * 0.07);
  paint(ctx, PALETTE.playerGlass, PALETTE.ink, line);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-size * 0.09, 0, -size * 0.12, size * 0.07, -size * 0.12, size * 0.16);
  ctx.lineTo(-size * 0.12, size * 0.35);
  ctx.lineTo(-size * 0.25, size * 0.25);
  ctx.bezierCurveTo(-size * 0.32, size * 0.2, -size * 0.4, size * 0.25, -size * 0.35, size * 0.34);
  ctx.lineTo(-size * 0.2, size * 0.57);
  ctx.bezierCurveTo(-size * 0.14, size * 0.73, size * 0.02, size * 0.77, size * 0.16, size * 0.67);
  ctx.lineTo(size * 0.3, size * 0.47);
  ctx.bezierCurveTo(size * 0.36, size * 0.37, size * 0.3, size * 0.27, size * 0.22, size * 0.29);
  ctx.lineTo(size * 0.12, size * 0.33);
  ctx.lineTo(size * 0.12, size * 0.16);
  ctx.bezierCurveTo(size * 0.12, size * 0.07, size * 0.09, 0, 0, 0);
  ctx.closePath();
  paint(ctx, PALETTE.skin, PALETTE.ink, line);
  roundedRect(ctx, -size * 0.04, size * 0.075, size * 0.08, size * 0.12, size * 0.04);
  paint(ctx, PALETTE.trafficCream, null);
  ctx.beginPath();
  ctx.moveTo(size * 0.11, size * 0.42);
  ctx.quadraticCurveTo(size * 0.2, size * 0.38, size * 0.27, size * 0.41);
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = line * 0.65;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();
}

function drawSlideArrow(ctx, x, y, size) {
  const half = size * 0.47;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - half, y);
  ctx.lineTo(x + half, y);
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = Math.max(5, size * 0.07);
  ctx.stroke();
  ctx.strokeStyle = PALETTE.roadEdge;
  ctx.lineWidth = Math.max(2, size * 0.03);
  ctx.stroke();
  for (const side of [-1, 1]) {
    polygon(ctx, [
      [x + side * (half + size * 0.08), y],
      [x + side * (half - size * 0.07), y - size * 0.09],
      [x + side * (half - size * 0.07), y + size * 0.09]
    ], PALETTE.playerLight, PALETTE.ink, Math.max(1.8, size * 0.025));
  }
  ctx.restore();
}

export function drawTouchHint(ctx, x, y, size, { time = 0 } = {}) {
  const slide = Math.sin(time * 2.4) * size * 0.2;
  const pulse = 1 + Math.sin(time * 6) * 0.12;
  drawSlideArrow(ctx, x, y + size * 0.94, size);
  drawTouchRing(ctx, x + slide, y, size * 0.17 * pulse, 0.95);
  drawHand(ctx, x + slide, y, size);
}
