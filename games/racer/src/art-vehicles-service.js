import { PALETTE } from './art-palette.js';
import { ellipse, paint, polygon, roundedRect } from './art-shapes.js';
import {
  drawFrontLamps,
  drawRearLights,
  drawWheels,
  flashBody,
  startVehicle
} from './art-vehicles-base.js';

function policeBody(ctx, width, height) {
  roundedRect(ctx, -width * 0.41, -height * 0.46, width * 0.82, height * 0.91, width * 0.2);
}

export function drawPolice(ctx, x, y, width, height, options = {}) {
  const state = startVehicle(ctx, x, y, width, height, options);
  drawWheels(ctx, width, height, state.turn);
  policeBody(ctx, width, height);
  paint(ctx, PALETTE.white, PALETTE.ink, 3.5);
  roundedRect(ctx, -width * 0.31, -height * 0.34, width * 0.62, height * 0.21, width * 0.09);
  paint(ctx, PALETTE.robotVisor, PALETTE.ink, 2.5);
  for (const side of [-1, 1]) {
    roundedRect(ctx, side * width * 0.31 - width * 0.1, -height * 0.04, width * 0.2, height * 0.27, width * 0.04);
    paint(ctx, PALETTE.city, null);
  }
  roundedRect(ctx, -width * 0.32, -height * 0.11, width * 0.64, height * 0.11, width * 0.04);
  paint(ctx, PALETTE.ink, PALETTE.ink, 2);
  const pulse = 0.5 + Math.sin(state.time * 7) * 0.5;
  for (const side of [-1, 1]) {
    const strength = side < 0 ? pulse : 1 - pulse;
    const lampColor = side < 0 ? PALETTE.trafficBlue : PALETTE.trafficRed;
    ctx.globalAlpha = 0.18 + strength * 0.25;
    ellipse(ctx, side * width * 0.17, -height * 0.055, width * 0.18, height * 0.075, lampColor, null);
    ctx.globalAlpha = 0.65 + strength * 0.35;
    roundedRect(ctx, side * width * 0.17 - width * 0.13, -height * 0.095, width * 0.26, height * 0.08, width * 0.035);
    paint(ctx, lampColor, PALETTE.ink, 1.5);
    ctx.globalAlpha = 1;
  }
  roundedRect(ctx, -width * 0.24, height * 0.24, width * 0.48, height * 0.1, width * 0.04);
  paint(ctx, PALETTE.playerGlass, PALETTE.ink, 2);
  drawFrontLamps(ctx, width, height, -height * 0.4, 0.25);
  drawRearLights(ctx, width, height, state.braking, height * 0.41, 0.27);
  if (state.flashing) flashBody(ctx, policeBody, width, height);
  ctx.restore();
}

function firetruckBody(ctx, width, height) {
  roundedRect(ctx, -width * 0.42, -height * 0.48, width * 0.84, height * 0.95, width * 0.1);
}

export function drawFiretruck(ctx, x, y, width, height, options = {}) {
  const state = startVehicle(ctx, x, y, width, height, options);
  drawWheels(ctx, width, height, state.turn);
  firetruckBody(ctx, width, height);
  paint(ctx, PALETTE.trafficRed, PALETTE.ink, 3.5);
  roundedRect(ctx, -width * 0.33, -height * 0.4, width * 0.66, height * 0.19, width * 0.055);
  paint(ctx, PALETTE.playerGlass, PALETTE.ink, 2.5);
  roundedRect(ctx, -width * 0.3, -height * 0.12, width * 0.6, height * 0.5, width * 0.04);
  paint(ctx, PALETTE.trafficCream, PALETTE.ink, 2);
  for (const side of [-1, 1]) {
    roundedRect(ctx, side * width * 0.13 - width * 0.035, -height * 0.09, width * 0.07, height * 0.45, width * 0.02);
    paint(ctx, PALETTE.hub, PALETTE.ink, 1.5);
  }
  for (let rung = 0; rung < 5; rung += 1) {
    roundedRect(ctx, -width * 0.13, -height * 0.055 + rung * height * 0.085, width * 0.26, height * 0.035, height * 0.012);
    paint(ctx, PALETTE.hub, PALETTE.ink, 1);
  }
  roundedRect(ctx, -width * 0.35, -height * 0.16, width * 0.7, height * 0.06, height * 0.02);
  paint(ctx, PALETTE.white, null);
  drawFrontLamps(ctx, width, height, -height * 0.43, 0.27);
  drawRearLights(ctx, width, height, state.braking, height * 0.43, 0.29);
  if (state.flashing) flashBody(ctx, firetruckBody, width, height);
  ctx.restore();
}

function icecreamBody(ctx, width, height) {
  roundedRect(ctx, -width * 0.41, -height * 0.47, width * 0.82, height * 0.94, width * 0.14);
}

export function drawIcecream(ctx, x, y, width, height, options = {}) {
  const state = startVehicle(ctx, x, y, width, height, options);
  drawWheels(ctx, width, height, state.turn);
  icecreamBody(ctx, width, height);
  paint(ctx, state.color.value, PALETTE.ink, 3.5);
  roundedRect(ctx, -width * 0.32, -height * 0.39, width * 0.64, height * 0.18, width * 0.08);
  paint(ctx, PALETTE.playerGlass, PALETTE.ink, 2.5);
  roundedRect(ctx, -width * 0.34, -height * 0.12, width * 0.68, height * 0.47, width * 0.08);
  paint(ctx, PALETTE.white, PALETTE.ink, 2);
  polygon(ctx, [
    [-width * 0.14, -height * 0.015], [width * 0.14, -height * 0.015], [0, height * 0.25]
  ], PALETTE.coneLight, PALETTE.ink, 2);
  ellipse(ctx, 0, -height * 0.055, width * 0.19, height * 0.105, PALETTE.trafficRed, PALETTE.ink, 2);
  ellipse(ctx, -width * 0.06, -height * 0.085, width * 0.055, height * 0.03, PALETTE.white, null);
  for (const side of [-1, 1]) {
    roundedRect(ctx, side * width * 0.3 - width * 0.07, height * 0.02, width * 0.14, height * 0.24, width * 0.035);
    paint(ctx, state.color.light, PALETTE.ink, 1.5);
  }
  drawFrontLamps(ctx, width, height, -height * 0.42, 0.25);
  drawRearLights(ctx, width, height, state.braking, height * 0.42, 0.28);
  if (state.flashing) flashBody(ctx, icecreamBody, width, height);
  ctx.restore();
}
