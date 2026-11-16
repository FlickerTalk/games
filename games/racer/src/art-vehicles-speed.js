import { PALETTE } from './art-palette.js';
import { ellipse, paint, polygon, roundedRect } from './art-shapes.js';
import {
  drawFrontLamps,
  drawRearLights,
  drawWheel,
  flashBody,
  startVehicle
} from './art-vehicles-base.js';

function racecarBody(ctx, width, height) {
  ctx.beginPath();
  ctx.moveTo(0, -height * 0.48);
  ctx.lineTo(width * 0.19, -height * 0.28);
  ctx.lineTo(width * 0.23, height * 0.31);
  ctx.quadraticCurveTo(0, height * 0.43, -width * 0.23, height * 0.31);
  ctx.lineTo(-width * 0.19, -height * 0.28);
  ctx.closePath();
}

export function drawRacecar(ctx, x, y, width, height, options = {}) {
  const state = startVehicle(ctx, x, y, width, height, options);
  for (const side of [-1, 1]) {
    drawWheel(ctx, side * width * 0.34, -height * 0.25, width * 0.18, height * 0.22, state.turn * 0.3);
    drawWheel(ctx, side * width * 0.35, height * 0.25, width * 0.2, height * 0.24);
  }
  racecarBody(ctx, width, height);
  paint(ctx, state.color.value, PALETTE.ink, 3);
  roundedRect(ctx, -width * 0.45, -height * 0.45, width * 0.9, height * 0.09, height * 0.025);
  paint(ctx, state.color.light, PALETTE.ink, 2.5);
  roundedRect(ctx, -width * 0.44, height * 0.34, width * 0.88, height * 0.1, height * 0.025);
  paint(ctx, state.color.dark, PALETTE.ink, 2.5);
  ellipse(ctx, 0, -height * 0.02, width * 0.18, height * 0.16, PALETTE.robotVisor, PALETTE.ink, 2.5);
  ellipse(ctx, 0, -height * 0.07, width * 0.12, height * 0.085, PALETTE.trafficCream, PALETTE.ink, 1.5);
  polygon(ctx, [[0, -height * 0.4], [-width * 0.055, -height * 0.22], [width * 0.055, -height * 0.22]], PALETTE.white, null);
  drawFrontLamps(ctx, width, height, -height * 0.39, 0.29);
  drawRearLights(ctx, width, height, state.braking, height * 0.38, 0.27);
  if (state.flashing) flashBody(ctx, racecarBody, width, height);
  ctx.restore();
}

function rocketBody(ctx, width, height) {
  ctx.beginPath();
  ctx.moveTo(0, -height * 0.49);
  ctx.bezierCurveTo(width * 0.23, -height * 0.34, width * 0.28, -height * 0.1, width * 0.25, height * 0.28);
  ctx.lineTo(width * 0.15, height * 0.42);
  ctx.lineTo(-width * 0.15, height * 0.42);
  ctx.lineTo(-width * 0.25, height * 0.28);
  ctx.bezierCurveTo(-width * 0.28, -height * 0.1, -width * 0.23, -height * 0.34, 0, -height * 0.49);
  ctx.closePath();
}

export function drawRocket(ctx, x, y, width, height, options = {}) {
  const state = startVehicle(ctx, x, y, width, height, options);
  for (const side of [-1, 1]) {
    drawWheel(ctx, side * width * 0.31, -height * 0.18, width * 0.15, height * 0.2, state.turn * 0.28);
    drawWheel(ctx, side * width * 0.33, height * 0.26, width * 0.17, height * 0.21);
    polygon(ctx, [
      [side * width * 0.18, height * 0.06], [side * width * 0.46, height * 0.33],
      [side * width * 0.39, height * 0.44], [side * width * 0.12, height * 0.3]
    ], state.color.dark, PALETTE.ink, 2.5);
  }
  rocketBody(ctx, width, height);
  paint(ctx, state.color.value, PALETTE.ink, 3.5);
  ellipse(ctx, 0, -height * 0.13, width * 0.18, height * 0.14, PALETTE.playerGlass, PALETTE.ink, 2.5);
  ellipse(ctx, -width * 0.05, -height * 0.18, width * 0.05, height * 0.035, PALETTE.white, null);
  polygon(ctx, [[0, -height * 0.45], [-width * 0.08, -height * 0.31], [width * 0.08, -height * 0.31]], PALETTE.white, null);
  roundedRect(ctx, -width * 0.18, height * 0.3, width * 0.36, height * 0.1, width * 0.04);
  paint(ctx, PALETTE.tire, PALETTE.ink, 2);
  for (const side of [-1, 0, 1]) {
    ellipse(ctx, side * width * 0.1, height * 0.34, width * 0.045, height * 0.025, state.color.light, null);
  }
  drawFrontLamps(ctx, width, height, -height * 0.31, 0.16);
  drawRearLights(ctx, width, height, state.braking, height * 0.39, 0.25);
  if (state.flashing) flashBody(ctx, rocketBody, width, height);
  ctx.restore();
}
