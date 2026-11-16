import { drawExhaustPuffs } from './art-effects.js';
import { PALETTE } from './art-palette.js';
import { clamp, ellipse, paint, polygon, roundedRect } from './art-shapes.js';

export const VEHICLE_COLORS = Object.freeze([
  { id: 'sunshine', name: 'Sunshine yellow', value: '#FFCF3F', light: '#FFE584', dark: '#E89A2D' },
  { id: 'ocean', name: 'Ocean blue', value: '#4F9BE8', light: '#A9DFE8', dark: '#3273B8' },
  { id: 'coral', name: 'Coral red', value: '#F26B5E', light: '#FFB39B', dark: '#C94B4C' },
  { id: 'mint', name: 'Mint teal', value: '#42B8A5', light: '#9DE5D4', dark: '#268477' },
  { id: 'tangerine', name: 'Tangerine orange', value: '#F39A45', light: '#FFD08A', dark: '#C86C35' },
  { id: 'lavender', name: 'Lavender purple', value: '#B39AF2', light: '#D9CDFB', dark: '#7764B8' }
].map(Object.freeze));

export function vehicleColor(color = 'sunshine') {
  if (Number.isFinite(color)) return VEHICLE_COLORS[((Math.floor(color) % 6) + 6) % 6];
  const match = VEHICLE_COLORS.find((entry) => entry === color || entry.id === color || entry.name === color);
  return match || VEHICLE_COLORS[0];
}

export function drawWheel(ctx, x, y, width, height, angle = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  roundedRect(ctx, -width / 2, -height / 2, width, height, width * 0.35);
  paint(ctx, PALETTE.tire, PALETTE.ink, 2);
  roundedRect(ctx, -width * 0.18, -height * 0.25, width * 0.36, height * 0.5, width * 0.12);
  paint(ctx, PALETTE.hub, null);
  ctx.restore();
}

export function drawWheels(ctx, width, height, steer) {
  const wheelWidth = width * 0.17;
  const wheelHeight = height * 0.2;
  for (const side of [-1, 1]) {
    drawWheel(ctx, side * width * 0.4, -height * 0.27, wheelWidth, wheelHeight, steer * 0.28);
    drawWheel(ctx, side * width * 0.4, height * 0.28, wheelWidth, wheelHeight);
  }
}

function drawHeadlights(ctx, width, height) {
  ctx.globalAlpha = 0.15;
  polygon(ctx, [
    [-width * 0.28, -height * 0.34], [width * 0.28, -height * 0.34],
    [width * 0.72, -height * 1.25], [-width * 0.72, -height * 1.25]
  ], PALETTE.lampLight, null);
  ctx.globalAlpha = 0.13;
  polygon(ctx, [
    [-width * 0.16, -height * 0.38], [width * 0.16, -height * 0.38],
    [width * 0.38, -height * 1.05], [-width * 0.38, -height * 1.05]
  ], PALETTE.white, null);
  ctx.globalAlpha = 1;
}

export function beginVehicle(ctx, x, y, width, height, steer, headlights, time = 0, accelerating = false) {
  const turn = clamp(steer, -1, 1);
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = 0.18;
  ellipse(ctx, width * 0.04, height * 0.06, width * 0.48, height * 0.46, PALETTE.ink, null);
  ctx.globalAlpha = 1;
  ctx.rotate(turn * 0.07);
  ctx.transform(1, 0, turn * 0.035, 1, 0, 0);
  ctx.lineJoin = 'round';
  if (accelerating) drawExhaustPuffs(ctx, 0, height * 0.43, { time, scale: Math.max(0.45, width / 70) });
  if (headlights) drawHeadlights(ctx, width, height);
  return turn;
}

export function startVehicle(ctx, x, y, width, height, options) {
  const { steer = 0, headlights = false, time = 0, accelerating = false, bumped = false, color = 'sunshine' } = options;
  return {
    turn: beginVehicle(ctx, x, y, width, height, steer, headlights, time, accelerating),
    color: vehicleColor(color),
    flashing: isFlashing(bumped, time),
    braking: Boolean(options.braking),
    time
  };
}

export function flashBody(ctx, path, width, height) {
  ctx.globalAlpha = 0.68;
  path(ctx, width, height);
  paint(ctx, PALETTE.white, null);
  ctx.globalAlpha = 1;
}

export function isFlashing(bumped, time) {
  return bumped && Math.floor(time * 12) % 2 === 0;
}

export function drawRearLights(ctx, width, height, braking, y = height * 0.4, spacing = 0.28) {
  const sides = spacing === 0 ? [0] : [-1, 1];
  if (braking) {
    ctx.globalAlpha = 0.32;
    for (const side of sides) {
      ellipse(ctx, side * width * spacing, y, width * 0.16, height * 0.075, PALETTE.trafficRed, null);
    }
    ctx.globalAlpha = 1;
  }
  for (const side of sides) {
    ellipse(ctx, side * width * spacing, y, width * (braking ? 0.095 : 0.065), height * (braking ? 0.035 : 0.027), PALETTE.trafficRed, null);
    if (braking) ellipse(ctx, side * width * spacing, y, width * 0.035, height * 0.012, PALETTE.white, null);
  }
}

export function drawFrontLamps(ctx, width, height, y = -height * 0.4, spacing = 0.25) {
  for (const side of [-1, 1]) {
    ellipse(ctx, side * width * spacing, y, width * 0.065, height * 0.025, PALETTE.white, PALETTE.ink, 1.5);
  }
}
