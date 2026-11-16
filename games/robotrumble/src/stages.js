import { circle, ellipse, fadeEdges, line, paint, polygon, roundedRect } from "../../../kit/src/canvas/pen.js";

const WALL_SHARE = 0.66;
const DESIGN = { width: 384, wall: 563 };

function shelf(ctx, { x, y, w }, ground, unit, look) {
  const wall = ground - y;
  for (const share of [0.3, 0.65]) {
    const board = y + wall * share;
    ctx.fillStyle = look.board;
    ctx.fillRect(x, board, w, 16 * unit);
    line(ctx, [[x, board], [x + w, board]], look.edge, 3);
    line(ctx, [[x, board + 16 * unit], [x + w, board + 16 * unit]], look.edge, 3);
    line(ctx, [[x, board + 4 * unit], [x + w, board + 4 * unit]], look.boardLight, 3);
  }
  const [upper, lower] = [y + wall * 0.3, y + wall * 0.65];
  roundedRect(ctx, x + 34 * unit, upper - 43 * unit, 38 * unit, 43 * unit, 5);
  paint(ctx, look.toy, look.edge, 3);
  circle(ctx, x + 53 * unit, upper - 30 * unit, 7 * unit, look.toyDot, look.edge, 3);
  const ball = [x + w - 61 * unit, lower - 25 * unit];
  circle(ctx, ...ball, 25 * unit, look.ball, look.edge, 3);
  ctx.beginPath();
  ctx.arc(...ball, 17 * unit, -0.6, 0.8);
  ctx.lineCap = "round";
  paint(ctx, null, look.shine, 5 * unit);
}

function kitchen(ctx, { x, y, w }, ground, unit, look) {
  const tile = Math.max(58 * unit, w / 6);
  for (let at = x; at < x + w; at += tile) line(ctx, [[at, y], [at, ground]], look.tile, 3);
  for (let at = ground - tile; at > y; at -= tile) line(ctx, [[x, at], [x + w, at]], look.tile, 3);
  roundedRect(ctx, x + 22 * unit, ground - 60 * unit, 48 * unit, 55 * unit, 8 * unit);
  paint(ctx, look.mug, look.edge, 3);
  ctx.beginPath();
  ctx.arc(x + 71 * unit, ground - 37 * unit, 15 * unit, -Math.PI / 2, Math.PI / 2);
  paint(ctx, null, look.edge, 6 * unit);
  ellipse(ctx, x + w - 51 * unit, ground - 6 * unit, 43 * unit, 10 * unit, look.plate, look.edge, 3);
  ellipse(ctx, x + w - 51 * unit, ground - 9 * unit, 29 * unit, 6 * unit, look.food, look.edge, 2);
}

function carton(ctx, { x, y, w }, ground, unit, look) {
  polygon(ctx, [[x, y], [x + w * 0.26, y], [x + w * 0.18, ground], [x, ground]], look.side);
  polygon(ctx, [[x + w, y], [x + w * 0.74, y], [x + w * 0.82, ground], [x + w, ground]], look.side);
  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = look.tape;
  ctx.fillRect(x + w * 0.43, y, w * 0.14, ground - y);
  ctx.restore();
  line(ctx, [[x + w * 0.5, y], [x + w * 0.5, ground]], look.fold, 3);
  for (const hole of [x + 35 * unit, x + w - 35 * unit]) {
    circle(ctx, hole, ground - 45 * unit, 22 * unit, look.hole, look.fold, 3);
    circle(ctx, hole, ground - 45 * unit, 8 * unit, look.fold);
  }
}

const PLACES = { shelf, kitchen, box: carton };

function scenery(ctx, area, ground, stage, look) {
  const unit = Math.min(area.w / DESIGN.width, (ground - area.y) / DESIGN.wall);
  ctx.fillStyle = look.wall;
  ctx.fillRect(area.x, area.y, area.w, ground - area.y);
  (PLACES[stage] ?? shelf)(ctx, area, ground, Math.max(0.3, unit), look);
  ctx.fillStyle = look.floor;
  ctx.fillRect(area.x, ground, area.w, area.y + area.h - ground);
  const seam = ground + Math.min(28, (area.y + area.h - ground) * 0.4);
  line(ctx, [[area.x, seam], [area.x + area.w, seam]], look.edge, 3);
}

// ground: the line the robots stand on, in the canvas's own coordinates
export function drawStage(ctx, area, ground, stage, theme) {
  const look = theme.art.stages[stage] ?? theme.art.stages.shelf;
  ctx.save();
  ctx.beginPath();
  ctx.rect(area.x, area.y, area.w, area.h);
  ctx.clip();
  scenery(ctx, area, ground, stage, look);
  ctx.translate(area.x, area.y);
  fadeEdges(ctx, area.w, area.h, theme.ui.page);
  ctx.restore();
}

export function drawStageIcon(ctx, stage, area, theme) {
  const look = theme.art.stages[stage] ?? theme.art.stages.shelf;
  const inner = { x: area.x + 10, y: area.y + 10, w: area.w - 20, h: area.h - 20 };
  ctx.save();
  roundedRect(ctx, inner.x, inner.y, inner.w, inner.h, 10);
  ctx.clip();
  scenery(ctx, inner, inner.y + inner.h * WALL_SHARE, stage, look);
  ctx.restore();
}
