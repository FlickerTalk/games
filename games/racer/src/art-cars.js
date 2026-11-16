import { PALETTE } from './art-palette.js';
import { ellipse, paint, polygon, roundedRect } from './art-shapes.js';
import {
  beginVehicle,
  drawRearLights,
  drawWheel,
  drawWheels,
  flashBody,
  isFlashing,
  vehicleColor
} from './art-vehicles-base.js';

function playerBody(ctx, width, height) {
  ctx.beginPath();
  ctx.moveTo(0, -height * 0.5);
  ctx.bezierCurveTo(width * 0.24, -height * 0.5, width * 0.37, -height * 0.36, width * 0.4, -height * 0.15);
  ctx.lineTo(width * 0.45, height * 0.3);
  ctx.quadraticCurveTo(width * 0.43, height * 0.47, width * 0.25, height * 0.48);
  ctx.lineTo(-width * 0.25, height * 0.48);
  ctx.quadraticCurveTo(-width * 0.43, height * 0.47, -width * 0.45, height * 0.3);
  ctx.lineTo(-width * 0.4, -height * 0.15);
  ctx.bezierCurveTo(-width * 0.37, -height * 0.36, -width * 0.24, -height * 0.5, 0, -height * 0.5);
  ctx.closePath();
}

export function drawPlayerCar(ctx, x, y, width, height, {
  steer = 0,
  bumped = false,
  time = 0,
  braking = false,
  headlights = false,
  color = 'sunshine',
  accelerating = false
} = {}) {
  const bodyColor = vehicleColor(color);
  const turn = beginVehicle(ctx, x, y, width, height, steer, headlights, time, accelerating);
  drawWheels(ctx, width, height, turn);
  roundedRect(ctx, -width * 0.51, height * 0.32, width * 1.02, height * 0.12, height * 0.04);
  paint(ctx, bodyColor.dark, PALETTE.ink, 3);
  playerBody(ctx, width, height);
  paint(ctx, bodyColor.value, PALETTE.ink, 4);
  roundedRect(ctx, -width * 0.27, -height * 0.3, width * 0.54, height * 0.25, width * 0.12);
  paint(ctx, PALETTE.playerGlass, PALETTE.ink, 3);
  roundedRect(ctx, -width * 0.25, height * 0.1, width * 0.5, height * 0.17, width * 0.09);
  paint(ctx, PALETTE.playerGlass, PALETTE.ink, 3);
  roundedRect(ctx, -width * 0.055, -height * 0.44, width * 0.11, height * 0.12, width * 0.04);
  paint(ctx, bodyColor.light, null);
  for (const side of [-1, 1]) {
    ellipse(ctx, side * width * 0.24, -height * 0.39, width * 0.075, height * 0.035, PALETTE.white, PALETTE.ink, 2);
  }
  drawRearLights(ctx, width, height, braking);
  if (isFlashing(bumped, time)) flashBody(ctx, playerBody, width, height);
  ctx.restore();
}

function robotBody(ctx, width, height) {
  roundedRect(ctx, -width * 0.46, -height * 0.39, width * 0.92, height * 0.82, width * 0.17);
}

export function drawRobotCar(ctx, x, y, width, height, { steer = 0, bumped = false, time = 0, braking = false, headlights = false } = {}) {
  const turn = beginVehicle(ctx, x, y, width, height, steer, headlights);
  const flashing = isFlashing(bumped, time);
  drawWheels(ctx, width, height * 0.9, turn);
  ctx.beginPath();
  ctx.moveTo(0, -height * 0.37);
  ctx.lineTo(0, -height * 0.5 + Math.sin(time * 5) * height * 0.012);
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 3;
  ctx.stroke();
  ellipse(ctx, 0, -height * 0.51 + Math.sin(time * 5) * height * 0.012, width * 0.09, width * 0.09, PALETTE.robotEye, PALETTE.ink, 2);
  for (const side of [-1, 1]) {
    roundedRect(ctx, side * width * 0.42 - width * 0.08, -height * 0.2, width * 0.16, height * 0.24, width * 0.05);
    paint(ctx, PALETTE.robotDark, PALETTE.ink, 2);
  }
  robotBody(ctx, width, height);
  paint(ctx, PALETTE.robot, PALETTE.ink, 4);
  roundedRect(ctx, -width * 0.36, -height * 0.29, width * 0.72, height * 0.29, width * 0.12);
  paint(ctx, PALETTE.robotVisor, PALETTE.ink, 3);
  for (const side of [-1, 1]) {
    ellipse(ctx, side * width * 0.15, -height * 0.18, width * 0.055, height * 0.035, PALETTE.robotEye, null);
  }
  ctx.beginPath();
  ctx.arc(0, -height * 0.12, width * 0.12, Math.PI * 0.15, Math.PI * 0.85);
  ctx.strokeStyle = PALETTE.robotEye;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  roundedRect(ctx, -width * 0.28, height * 0.12, width * 0.56, height * 0.17, width * 0.07);
  paint(ctx, PALETTE.robotLight, PALETTE.ink, 2);
  for (const side of [-1, 1]) {
    ellipse(ctx, side * width * 0.23, height * 0.32, width * 0.05, width * 0.05, braking ? PALETTE.trafficRed : PALETTE.robotEye, PALETTE.ink, 1.5);
  }
  if (flashing) flashBody(ctx, robotBody, width, height);
  ctx.restore();
}

function drawSmallCar(ctx, width, height) {
  roundedRect(ctx, -width * 0.41, -height * 0.47, width * 0.82, height * 0.94, width * 0.23);
  paint(ctx, PALETTE.trafficRed, PALETTE.ink, 3);
  roundedRect(ctx, -width * 0.31, -height * 0.25, width * 0.62, height * 0.43, width * 0.13);
  paint(ctx, PALETTE.glass, PALETTE.ink, 2.5);
  ctx.beginPath();
  ctx.moveTo(-width * 0.3, -height * 0.02);
  ctx.lineTo(width * 0.3, -height * 0.02);
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawVan(ctx, width, height) {
  roundedRect(ctx, -width * 0.45, -height * 0.48, width * 0.9, height * 0.96, width * 0.12);
  paint(ctx, PALETTE.trafficBlue, PALETTE.ink, 3);
  roundedRect(ctx, -width * 0.35, -height * 0.36, width * 0.7, height * 0.22, width * 0.08);
  paint(ctx, PALETTE.glass, PALETTE.ink, 2.5);
  roundedRect(ctx, -width * 0.31, height * 0.01, width * 0.62, height * 0.3, width * 0.06);
  paint(ctx, PALETTE.trafficCream, PALETTE.ink, 2);
}

function drawTruck(ctx, width, height) {
  roundedRect(ctx, -width * 0.46, -height * 0.49, width * 0.92, height * 0.38, width * 0.1);
  paint(ctx, PALETTE.trafficOrange, PALETTE.ink, 3);
  roundedRect(ctx, -width * 0.34, -height * 0.4, width * 0.68, height * 0.16, width * 0.05);
  paint(ctx, PALETTE.glass, PALETTE.ink, 2);
  roundedRect(ctx, -width * 0.47, -height * 0.06, width * 0.94, height * 0.54, width * 0.06);
  paint(ctx, PALETTE.trafficCream, PALETTE.ink, 3);
  for (const side of [-1, 1]) {
    roundedRect(ctx, side * width * 0.32 - width * 0.025, height * 0.01, width * 0.05, height * 0.38, 2);
    paint(ctx, PALETTE.trafficOrange, null);
  }
}

function drawBus(ctx, width, height) {
  roundedRect(ctx, -width * 0.45, -height * 0.49, width * 0.9, height * 0.98, width * 0.16);
  paint(ctx, PALETTE.trafficGreen, PALETTE.ink, 3);
  roundedRect(ctx, -width * 0.35, -height * 0.4, width * 0.7, height * 0.17, width * 0.06);
  paint(ctx, PALETTE.glass, PALETTE.ink, 2);
  for (let index = 0; index < 3; index += 1) {
    roundedRect(ctx, -width * 0.34, -height * 0.14 + index * height * 0.17, width * 0.68, height * 0.11, width * 0.035);
    paint(ctx, PALETTE.glass, PALETTE.ink, 1.8);
  }
  roundedRect(ctx, -width * 0.25, height * 0.4, width * 0.5, height * 0.045, 2);
  paint(ctx, PALETTE.trafficCream, null);
}

export function drawTrafficCar(ctx, x, y, width, height, { variant = 0, steer = 0, braking = false, headlights = false } = {}) {
  const kind = ((Math.floor(variant) % 4) + 4) % 4;
  const turn = beginVehicle(ctx, x, y, width, height, steer, headlights);
  drawWheels(ctx, width, height * (kind === 3 ? 0.94 : 0.86), turn);
  [drawSmallCar, drawVan, drawTruck, drawBus][kind](ctx, width, height);
  for (const side of [-1, 1]) {
    ellipse(ctx, side * width * 0.27, -height * 0.43, width * 0.055, height * 0.025, PALETTE.white, null);
  }
  drawRearLights(ctx, width, height, braking, height * 0.42);
  ctx.restore();
}

export { drawWheel, drawWheels } from './art-vehicles-base.js';
