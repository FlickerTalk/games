import { boardFrame, drawBoardFrame } from "../../../kit/src/tabletop/frame.js";
import { cellCentre, gridIn } from "../../../kit/src/tabletop/grid.js";
import { circle, line, paint, roundedRect } from "../../../kit/src/canvas/pen.js";
import { drawClaimBurst, drawExtraTurn, drawLastLine, drawOpenLine, drawPendingClock } from "./marks.js";
import { drawClaimedBox, drawLine, strokeOf } from "./pieces.js";
import { BOXES, DOTS, H, LINES } from "./rules.js";

const PAD = 0.1;
const RULES = 10;
const layouts = new Map();

export function layoutFor(size) {
  if (!layouts.has(size)) {
    const frame = boardFrame(size, { padding: PAD });
    const grid = gridIn(frame.inner, { columns: BOXES });
    layouts.set(size, { frame, grid, step: grid.cell });
  }
  return layouts.get(size);
}

export function edgeOf({ grid, step }, line) {
  if (line < H) return { x: grid.x + ((line % BOXES) + 0.5) * step, y: grid.y + Math.floor(line / BOXES) * step, horizontal: true };
  const upright = line - H;
  return { x: grid.x + (upright % DOTS) * step, y: grid.y + (Math.floor(upright / DOTS) + 0.5) * step, horizontal: false };
}

export function touchBox(layout, line) {
  const { x, y } = edgeOf(layout, line);
  const side = layout.step / Math.SQRT2;
  return { x: x - side / 2, y: y - side / 2, w: side, h: side };
}

function drawPaper(ctx, theme, frame) {
  const { outer, radius } = frame;
  drawBoardFrame(ctx, frame, { wood: theme.board.paper, ink: theme.ink, rim: theme.rim });
  ctx.save();
  roundedRect(ctx, outer.x, outer.y, outer.w, outer.h, radius);
  ctx.clip();
  for (let rule = 1; rule < RULES; rule += 1) {
    const y = outer.y + (rule * outer.h) / RULES;
    line(ctx, [[outer.x, y], [outer.x + outer.w, y]], theme.board.rule, Math.max(1, outer.w * 0.003));
  }
  const margin = outer.x + outer.w * 0.07;
  line(ctx, [[margin, outer.y], [margin, outer.y + outer.h]], theme.board.margin, Math.max(1.5, outer.w * 0.004));
  ctx.restore();
  roundedRect(ctx, outer.x, outer.y, outer.w, outer.h, radius);
  paint(ctx, null, theme.ink, frame.line);
}

function drawBoxes(ctx, theme, { grid, step }, view) {
  view.boxes.forEach((owner, box) => {
    const pop = view.popping[box] ?? 1;
    if (owner === null || pop <= 0) return;
    const { x, y } = cellCentre(grid, box);
    drawClaimedBox(ctx, theme, x, y, step * 0.88, owner, { pop });
  });
}

function drawLines(ctx, theme, layout, view) {
  for (let one = 0; one < LINES; one += 1) {
    const { x, y, horizontal } = edgeOf(layout, one);
    const side = view.drawers[one];
    const progress = view.moving?.line === one ? view.moving.progress : 1;
    if (!view.lines[one] || progress < 1) drawOpenLine(ctx, theme, x, y, layout.step, { horizontal, open: view.open && !view.lines[one] });
    if (view.lines[one]) drawLine(ctx, theme, x, y, layout.step, { side, horizontal, progress, alpha: one === view.pending ? 0.55 : 1 });
  }
}

function drawDots(ctx, theme, { grid, step }) {
  for (let row = 0; row < DOTS; row += 1) {
    for (let col = 0; col < DOTS; col += 1) circle(ctx, grid.x + col * step, grid.y + row * step, step * 0.07, theme.ink, theme.marks.white, Math.max(1, step * 0.01));
  }
}

function drawAbove(ctx, theme, layout, view) {
  const { grid, step } = layout;
  if (view.last !== null && view.last !== view.pending && !view.moving) {
    const { x, y } = edgeOf(layout, view.last);
    drawLastLine(ctx, theme, x, y, step);
  }
  for (const { box, side, progress } of view.bursts) {
    const { x, y } = cellCentre(grid, box);
    drawClaimBurst(ctx, theme, x, y, step, side, progress);
  }
  for (const { box, side, progress } of view.extra) {
    const { x, y } = cellCentre(grid, box);
    drawExtraTurn(ctx, theme, x, y, step, side, progress);
  }
  if (view.pending !== null) {
    const { x, y } = edgeOf(layout, view.pending);
    drawPendingClock(ctx, theme, x, y, Math.max(6, strokeOf(step) * 1.4));
  }
}

export function drawBoard(ctx, theme, view) {
  const layout = layoutFor(view.size);
  drawPaper(ctx, theme, layout.frame);
  drawBoxes(ctx, theme, layout, view);
  drawLines(ctx, theme, layout, view);
  drawDots(ctx, theme, layout);
  drawAbove(ctx, theme, layout, view);
}
