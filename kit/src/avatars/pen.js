export const INK = "#243247";
export const CREAM = "#FFFDF5";
export const TAU = Math.PI * 2;

export function paint(ctx, fill, stroke = INK, width = 3) {
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke && width > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
  }
}

export function circle(ctx, x, y, radius, fill, stroke = INK, width = 3.2) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  paint(ctx, fill, stroke, width);
}

export function ellipse(ctx, x, y, radiusX, radiusY, fill, stroke = INK, width = 3) {
  ctx.beginPath();
  ctx.ellipse(x, y, radiusX, radiusY, 0, 0, TAU);
  paint(ctx, fill, stroke, width);
}

export function line(ctx, points, colour = INK, width = 3.2) {
  ctx.beginPath();
  points.forEach(([x, y], index) => (index ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  paint(ctx, null, colour, width);
}

export function polygon(ctx, points, fill, stroke = INK, width = 3) {
  ctx.beginPath();
  points.forEach(([x, y], index) => (index ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  paint(ctx, fill, stroke, width);
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
