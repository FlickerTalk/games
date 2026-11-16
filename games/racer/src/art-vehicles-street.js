import { PALETTE } from './art-palette.js';
import { ellipse, paint, polygon, roundedRect } from './art-shapes.js';
import {
  drawFrontLamps,
  drawRearLights,
  drawWheel,
  drawWheels,
  flashBody,
  startVehicle
} from './art-vehicles-base.js';

function motorbikeBody(ctx, width, height) {
  roundedRect(ctx, -width * 0.16, -height * 0.38, width * 0.32, height * 0.74, width * 0.15);
}

export function drawMotorbike(ctx, x, y, width, height, options = {}) {
  const state = startVehicle(ctx, x, y, width, height, options);
  drawWheel(ctx, 0, -height * 0.34, width * 0.14, height * 0.27, state.turn * 0.34);
  drawWheel(ctx, 0, height * 0.34, width * 0.16, height * 0.26);
  motorbikeBody(ctx, width, height);
  paint(ctx, state.color.value, PALETTE.ink, 3);
  ctx.save();
  ctx.translate(0, -height * 0.28);
  ctx.rotate(state.turn * 0.3);
  ctx.beginPath();
  ctx.moveTo(-width * 0.29, 0);
  ctx.lineTo(width * 0.29, 0);
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = Math.max(2.5, width * 0.07);
  ctx.lineCap = 'round';
  ctx.stroke();
  for (const side of [-1, 1]) {
    ellipse(ctx, side * width * 0.29, 0, width * 0.055, width * 0.055, state.color.light, PALETTE.ink, 1.5);
  }
  ctx.restore();
  roundedRect(ctx, -width * 0.23, -height * 0.02, width * 0.46, height * 0.28, width * 0.17);
  paint(ctx, state.color.dark, PALETTE.ink, 2.5);
  ellipse(ctx, 0, -height * 0.09, width * 0.21, height * 0.13, state.color.light, PALETTE.ink, 2.5);
  roundedRect(ctx, -width * 0.16, -height * 0.13, width * 0.32, height * 0.07, width * 0.05);
  paint(ctx, PALETTE.robotVisor, PALETTE.ink, 1.5);
  drawFrontLamps(ctx, width, height, -height * 0.42, 0);
  drawRearLights(ctx, width, height, state.braking, height * 0.43, 0);
  if (state.flashing) flashBody(ctx, motorbikeBody, width, height);
  ctx.restore();
}

function kartBody(ctx, width, height) {
  roundedRect(ctx, -width * 0.31, -height * 0.36, width * 0.62, height * 0.73, width * 0.12);
}

export function drawKart(ctx, x, y, width, height, options = {}) {
  const state = startVehicle(ctx, x, y, width, height, options);
  for (const side of [-1, 1]) {
    drawWheel(ctx, side * width * 0.38, -height * 0.27, width * 0.2, height * 0.23, state.turn * 0.3);
    drawWheel(ctx, side * width * 0.38, height * 0.28, width * 0.2, height * 0.24);
  }
  kartBody(ctx, width, height);
  paint(ctx, state.color.value, PALETTE.ink, 3.5);
  polygon(ctx, [[0, -height * 0.46], [-width * 0.2, -height * 0.29], [width * 0.2, -height * 0.29]], state.color.light, PALETTE.ink, 2.5);
  roundedRect(ctx, -width * 0.22, -height * 0.05, width * 0.44, height * 0.28, width * 0.12);
  paint(ctx, PALETTE.robotVisor, PALETTE.ink, 2.5);
  ellipse(ctx, 0, -height * 0.1, width * 0.16, height * 0.1, PALETTE.trafficCream, PALETTE.ink, 2);
  roundedRect(ctx, -width * 0.25, height * 0.29, width * 0.5, height * 0.11, width * 0.04);
  paint(ctx, state.color.dark, PALETTE.ink, 2);
  drawFrontLamps(ctx, width, height, -height * 0.36, 0.18);
  drawRearLights(ctx, width, height, state.braking, height * 0.4, 0.2);
  if (state.flashing) flashBody(ctx, kartBody, width, height);
  ctx.restore();
}

function truckBody(ctx, width, height) {
  roundedRect(ctx, -width * 0.39, -height * 0.48, width * 0.78, height * 0.95, width * 0.1);
}

export function drawTruck(ctx, x, y, width, height, options = {}) {
  const state = startVehicle(ctx, x, y, width, height, options);
  drawWheels(ctx, width * 0.94, height, state.turn);
  truckBody(ctx, width, height);
  paint(ctx, state.color.value, PALETTE.ink, 3.5);
  roundedRect(ctx, -width * 0.31, -height * 0.4, width * 0.62, height * 0.19, width * 0.07);
  paint(ctx, PALETTE.playerGlass, PALETTE.ink, 2.5);
  roundedRect(ctx, -width * 0.3, -height * 0.01, width * 0.6, height * 0.4, width * 0.045);
  paint(ctx, state.color.dark, PALETTE.ink, 2.5);
  roundedRect(ctx, -width * 0.22, height * 0.04, width * 0.44, height * 0.29, width * 0.03);
  paint(ctx, PALETTE.tire, PALETTE.ink, 1.5);
  for (const side of [-1, 1]) {
    roundedRect(ctx, side * width * 0.31 - width * 0.035, -height * 0.03, width * 0.07, height * 0.45, width * 0.02);
    paint(ctx, state.color.light, null);
  }
  drawFrontLamps(ctx, width, height, -height * 0.43, 0.25);
  drawRearLights(ctx, width, height, state.braking, height * 0.43, 0.27);
  if (state.flashing) flashBody(ctx, truckBody, width, height);
  ctx.restore();
}

function busBody(ctx, width, height) {
  roundedRect(ctx, -width * 0.4, -height * 0.49, width * 0.8, height * 0.97, width * 0.19);
}

export function drawBus(ctx, x, y, width, height, options = {}) {
  const state = startVehicle(ctx, x, y, width, height, options);
  drawWheels(ctx, width, height, state.turn);
  busBody(ctx, width, height);
  paint(ctx, state.color.value, PALETTE.ink, 3.5);
  roundedRect(ctx, -width * 0.3, -height * 0.39, width * 0.6, height * 0.18, width * 0.09);
  paint(ctx, PALETTE.playerGlass, PALETTE.ink, 2.5);
  for (const side of [-1, 1]) {
    for (let row = 0; row < 3; row += 1) {
      roundedRect(ctx, side * width * 0.28 - width * 0.085, -height * 0.12 + row * height * 0.16, width * 0.17, height * 0.11, width * 0.04);
      paint(ctx, PALETTE.glass, PALETTE.ink, 1.5);
    }
  }
  ellipse(ctx, 0, height * 0.1, width * 0.13, height * 0.15, state.color.light, PALETTE.ink, 2);
  roundedRect(ctx, -width * 0.26, height * 0.4, width * 0.52, height * 0.055, height * 0.02);
  paint(ctx, PALETTE.white, null);
  drawFrontLamps(ctx, width, height, -height * 0.29, 0.23);
  drawRearLights(ctx, width, height, state.braking, height * 0.44, 0.28);
  if (state.flashing) flashBody(ctx, busBody, width, height);
  ctx.restore();
}

function tractorBody(ctx, width, height) {
  roundedRect(ctx, -width * 0.22, -height * 0.43, width * 0.44, height * 0.79, width * 0.09);
}

export function drawTractor(ctx, x, y, width, height, options = {}) {
  const state = startVehicle(ctx, x, y, width, height, options);
  for (const side of [-1, 1]) {
    drawWheel(ctx, side * width * 0.31, -height * 0.29, width * 0.18, height * 0.22, state.turn * 0.3);
    drawWheel(ctx, side * width * 0.35, height * 0.24, width * 0.28, height * 0.36);
  }
  tractorBody(ctx, width, height);
  paint(ctx, state.color.value, PALETTE.ink, 3.5);
  roundedRect(ctx, -width * 0.17, -height * 0.35, width * 0.34, height * 0.31, width * 0.06);
  paint(ctx, state.color.light, PALETTE.ink, 2);
  roundedRect(ctx, -width * 0.25, height * 0.01, width * 0.5, height * 0.23, width * 0.08);
  paint(ctx, PALETTE.robotVisor, PALETTE.ink, 2.5);
  ellipse(ctx, 0, height * 0.04, width * 0.15, height * 0.09, PALETTE.trafficCream, PALETTE.ink, 2);
  roundedRect(ctx, width * 0.12, -height * 0.45, width * 0.075, height * 0.2, width * 0.025);
  paint(ctx, PALETTE.tire, PALETTE.ink, 1.5);
  for (const side of [-1, 1]) {
    roundedRect(ctx, side * width * 0.32 - width * 0.11, height * 0.06, width * 0.22, height * 0.1, width * 0.04);
    paint(ctx, state.color.value, PALETTE.ink, 2);
  }
  drawFrontLamps(ctx, width, height, -height * 0.38, 0.12);
  drawRearLights(ctx, width, height, state.braking, height * 0.4, 0.3);
  if (state.flashing) flashBody(ctx, tractorBody, width, height);
  ctx.restore();
}
