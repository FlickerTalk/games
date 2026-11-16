import { circle, line, paint, polygon, roundedRect } from "../../../kit/src/canvas/pen.js";
import { drawPieceShadow } from "../../../kit/src/tabletop/frame.js";
import { easeInOut } from "../../../kit/src/tabletop/motion.js";
import { drawDice } from "./dice.js";
import { POINT_SHARE, barSpot, layoutFor, pipsAt, stackSpot, trayBox, trayCountAt, traySpot } from "./layout.js";
import { drawHitRing, drawLastMove, drawOffTarget, drawPendingClock, drawSelection, drawSourceDot, drawTarget } from "./marks.js";
import { FONT, drawChecker } from "./pieces.js";

const COUNTED = 6;
const RIM = 3;
const FADED = 0.55;
const SHAKE_REACH = 0.25;

function drawDigits(ctx, text, x, y, size, colour, align = "center") {
  ctx.save();
  ctx.font = `800 ${Math.round(size)}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.direction = "ltr";
  ctx.fillStyle = colour;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawGrain(ctx, theme, layout) {
  const { table, rail } = layout;
  const rows = 9;
  for (let at = 0; at < rows; at += 1) {
    const y = table.y + rail + (at * (table.h - rail * 3)) / rows;
    for (const x of [table.x + rail * (0.3 + (at % 3) * 0.18), table.x + table.w - rail * (0.75 - (at % 3) * 0.18)]) {
      line(ctx, [[x, y], [x + rail * 0.3, y + rail * 1.6]], theme.board.detail, Math.max(1, rail * 0.14));
    }
  }
}

function drawCase(ctx, theme, layout) {
  const { table, field, bar, tray, line: width, rail } = layout;
  const corner = rail * 1.2;
  const depth = Math.max(2, table.h * 0.012);
  const thin = Math.max(1, width * 0.6);
  if (theme.rim) {
    roundedRect(ctx, table.x, table.y, table.w, table.h + depth, corner);
    paint(ctx, null, theme.rim, width + RIM);
  }
  roundedRect(ctx, table.x, table.y + depth, table.w, table.h, corner);
  paint(ctx, theme.ink, null, 0);
  roundedRect(ctx, table.x, table.y, table.w, table.h, corner);
  paint(ctx, theme.board.case, theme.ink, width);
  drawGrain(ctx, theme, layout);
  roundedRect(ctx, field.x, field.y, field.w, field.h, rail * 0.35);
  paint(ctx, theme.board.field, theme.ink, thin);
  roundedRect(ctx, tray.x, tray.y, tray.w, tray.h, rail * 0.45);
  paint(ctx, theme.board.tray, theme.ink, thin);
  line(ctx, [[tray.x + tray.w * 0.2, tray.y + tray.h / 2], [tray.x + tray.w * 0.8, tray.y + tray.h / 2]], theme.board.detail, thin);
  roundedRect(ctx, bar.x, bar.y, bar.w, bar.h, bar.w * 0.2);
  paint(ctx, theme.board.rail, theme.ink, thin);
}

function drawPoints(ctx, theme, layout) {
  const { field, bar, pointWidth: width } = layout;
  const length = field.h * POINT_SHARE;
  const stroke = Math.max(1, width * 0.055);
  for (let column = 0; column < 12; column += 1) {
    const x = field.x + column * width + (column >= 6 ? bar.w : 0);
    for (const top of [true, false]) {
      const base = top ? field.y : field.y + field.h;
      const tip = top ? base + length : base - length;
      polygon(ctx, [[x + 1, base], [x + width - 1, base], [x + width / 2, tip]], column % 2 ? theme.board.pointA : theme.board.pointB, theme.ink, stroke);
      circle(ctx, x + width / 2, base + (top ? 1 : -1) * Math.min(7, width * 0.3), Math.max(1.2, width * 0.055), theme.board.tray);
    }
  }
}

export function spotOf(layout, view, side, { place, index, count }) {
  if (place === "b") return barSpot(layout, side === view.me, index, count);
  if (place === "o") return traySpot(layout, side === view.me, index, count);
  return stackSpot(layout, place, index, count, { mirrored: view.mirrored });
}

const ownerOf = (view, point) => (view.points[point][0] ? 0 : view.points[point][1] ? 1 : null);
const countAt = (view, side, place) => (place === "b" ? view.bar[side] : place === "o" ? view.off[side] : view.points[place][side]);
const topOf = (layout, view, side, place) => {
  const count = countAt(view, side, place);
  return spotOf(layout, view, side, { place, index: Math.max(0, count - 1), count: Math.max(1, count) });
};
const nextOf = (layout, view, side, place) => {
  const count = countAt(view, side, place);
  return spotOf(layout, view, side, { place, index: count, count: count + 1 });
};

function drawPile(ctx, theme, layout, view, side, place) {
  const count = countAt(view, side, place);
  const faded = view.faded && view.faded.place === place && view.faded.side === side;
  const shake = side === view.me ? (view.shakes ?? []).find((one) => one.place === place) : null;
  for (let index = 0; index < (place === "o" ? Math.min(count, 5) : count); index += 1) {
    const spot = spotOf(layout, view, side, { place, index, count });
    const last = index === count - 1;
    const x = spot.x + (last && shake ? shake.offset * spot.r * SHAKE_REACH : 0);
    drawChecker(ctx, theme, x, spot.y, spot.r, { side, count: last && place !== "o" && count >= COUNTED ? count : 0, alpha: last && faded ? FADED : 1 });
  }
}

function drawCheckers(ctx, theme, layout, view) {
  for (let point = 0; point < 24; point += 1) {
    const side = ownerOf(view, point);
    if (side !== null) drawPile(ctx, theme, layout, view, side, point);
  }
  const sides = [view.me, 1 - view.me];
  for (const side of sides) drawPile(ctx, theme, layout, view, side, "b");
  for (const side of sides) {
    drawPile(ctx, theme, layout, view, side, "o");
    if (view.off[side] > 0) {
      const { x, y, size } = trayCountAt(layout, side === view.me);
      drawDigits(ctx, String(view.off[side]), x, y, size, theme.marks.count);
    }
  }
}

function drawGroundMarks(ctx, theme, layout, view) {
  for (const { from, to, side } of view.last ?? []) {
    const start = from === "b" ? barSpot(layout, side === view.me, 0, 1) : nextOf(layout, view, side, from);
    drawLastMove(ctx, theme, start, topOf(layout, view, side, to), layout.radius);
  }
}

function drawChoiceMarks(ctx, theme, layout, view) {
  const me = view.me;
  for (const place of view.sources ?? []) {
    const spot = nextOf(layout, view, me, place);
    drawSourceDot(ctx, theme, spot.x, spot.y, layout.radius, view.time);
  }
  if (view.chosen !== null && view.chosen !== undefined) {
    const spot = topOf(layout, view, me, view.chosen);
    drawSelection(ctx, theme, spot.x, spot.y, spot.r, view.time);
  }
  for (const { place, hit } of view.targets ?? []) {
    if (place === "o") {
      const box = trayBox(layout, true);
      drawOffTarget(ctx, theme, box.x + box.w / 2, box.y + box.h / 2, layout.radius, view.time);
      continue;
    }
    const spot = hit ? topOf(layout, view, 1 - me, place) : nextOf(layout, view, me, place);
    drawTarget(ctx, theme, spot.x, spot.y, layout.radius, { hit, time: view.time });
  }
}

function drawMoving(ctx, theme, layout, view) {
  if (view.hitRing) {
    const spot = topOf(layout, view, view.hitRing.side, view.hitRing.place);
    drawHitRing(ctx, theme, spot.x, spot.y, spot.r, view.hitRing.progress);
  }
  for (const { side, from, to, progress } of view.flying ?? []) {
    const [start, end] = [spotOf(layout, view, side, from), spotOf(layout, view, side, to)];
    const eased = easeInOut(progress);
    const [x, y] = [start.x + (end.x - start.x) * eased, start.y + (end.y - start.y) * eased];
    drawPieceShadow(ctx, x, y, layout.radius, { colour: theme.ink, lift: layout.radius * 0.3 });
    drawChecker(ctx, theme, x, y, layout.radius, { side });
  }
  if (view.floating) {
    const { side, x, y, lift } = view.floating;
    drawPieceShadow(ctx, x, y, layout.radius, { colour: theme.ink, lift });
    drawChecker(ctx, theme, x, y, layout.radius, { side, lift });
  }
}

function drawDock(ctx, theme, layout, view) {
  if (view.dice) drawDice(ctx, theme, layout, { ...view.dice, time: view.time });
  if (!view.pips) return;
  pipsAt(layout).forEach((spot, at) => {
    const side = at === 0 ? view.me : 1 - view.me;
    drawChecker(ctx, theme, spot.mark.x, spot.mark.y, spot.mark.r, { side });
    drawDigits(ctx, String(view.pips[at]), spot.x, spot.y, spot.size, theme.ui.text, spot.align);
  });
}

export function drawTable(ctx, theme, view) {
  const layout = layoutFor(view.size);
  ctx.save();
  drawCase(ctx, theme, layout);
  drawPoints(ctx, theme, layout);
  drawGroundMarks(ctx, theme, layout, view);
  drawCheckers(ctx, theme, layout, view);
  drawChoiceMarks(ctx, theme, layout, view);
  if (view.pending !== null && view.pending !== undefined) {
    const spot = topOf(layout, view, view.me, view.pending);
    drawPendingClock(ctx, theme, spot.x, spot.y, spot.r);
  }
  drawMoving(ctx, theme, layout, view);
  drawDock(ctx, theme, layout, view);
  ctx.restore();
}
