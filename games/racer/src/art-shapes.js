import { PALETTE } from './art-palette.js';

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(Math.abs(width) / 2, Math.abs(height) / 2, radius);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

export function paint(ctx, fill, stroke = PALETTE.ink, lineWidth = 3) {
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke && lineWidth > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

export function ellipse(ctx, x, y, radiusX, radiusY, fill, stroke = PALETTE.ink, lineWidth = 3) {
  ctx.beginPath();
  ctx.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
  paint(ctx, fill, stroke, lineWidth);
}

export function polygon(ctx, points, fill, stroke = PALETTE.ink, lineWidth = 3) {
  ctx.beginPath();
  points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath();
  paint(ctx, fill, stroke, lineWidth);
}

export function hash(value) {
  const x = Math.sin(value * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function starPoints(x, y, outer, inner, points = 5) {
  const vertices = [];
  for (let index = 0; index < points * 2; index += 1) {
    const angle = -Math.PI / 2 + index * Math.PI / points;
    const radius = index % 2 ? inner : outer;
    vertices.push([x + Math.cos(angle) * radius, y + Math.sin(angle) * radius]);
  }
  return vertices;
}
