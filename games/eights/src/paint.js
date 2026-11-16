import { paint, roundedRect } from "../../../kit/src/canvas/pen.js";
import { boardFrame, drawBoardFrame } from "../../../kit/src/tabletop/frame.js";
import { easeInOut } from "../../../kit/src/tabletop/motion.js";
import { CARD_RATIO, drawBack, drawFace } from "./faces.js";
import { handRows, handSlots } from "./hand.js";
import { countWidth, drawCount, drawEmptySpot, drawGlow, drawLastMark, drawPassMark, drawPendingClock, drawPicker, drawShade, drawSuitChip } from "./marks.js";

const BY_ROWS = [null, { lift: 0.045, pile: 0.23, back: 0.1 }, { lift: 0.03, pile: 0.19, back: 0.09 }, { lift: 0.015, pile: 0.155, back: 0.08 }];
const HAND_WIDTH = 0.18;
const PAD = 0.02;
const GAP = 0.025;
const MOST_BACKS = 10;
const layouts = new Map();

function middle(inner, top, bottom, part) {
  const W = inner.w;
  const [pw, mid] = [W * part.pile, inner.x + W / 2];
  const ph = pw * CARD_RATIO;
  const centre = (top + bottom) / 2;
  const gap = W * 0.1;
  const stock = { x: mid - gap / 2 - pw, y: centre - ph / 2, w: pw, h: ph };
  const pile = { x: mid + gap / 2, y: centre - ph / 2, w: pw, h: ph };
  const r = Math.min(W * 0.075, ph * 0.3);
  return { stock, pile, suit: { x: pile.x + pw + W * 0.03 + r, y: centre, r }, centre };
}

function picker(inner, centre, ph) {
  const W = inner.w;
  const gap = Math.max(3, W * 0.02);
  const d = Math.min(Math.max(44, ph * 0.75), (W * 0.99 - 5 * gap) / 4);
  const [w, h] = [4 * d + 5 * gap, d + 2 * gap];
  const panel = { x: inner.x + (W - w) / 2, y: centre - h / 2, w, h };
  return { panel, chips: [0, 1, 2, 3].map((suit) => ({ suit, x: panel.x + gap + d / 2 + suit * (d + gap), y: centre, r: d / 2 })) };
}

export function layoutFor(size, count) {
  const frame = boardFrame(size, { padding: 0.012 });
  const { inner } = frame;
  const W = inner.w;
  const [hw, pad, gap] = [W * HAND_WIDTH, W * PAD, W * GAP];
  const rows = handRows(count, { span: W, width: hw });
  const key = `${size}:${rows}`;
  if (layouts.has(key)) return layouts.get(key);
  const part = BY_ROWS[rows];
  const [hh, bw, lift] = [hw * CARD_RATIO, W * part.back, W * part.lift];
  const [bh, ph] = [bw * CARD_RATIO, W * part.pile * CARD_RATIO];
  const free = W - 2 * pad - bh - ph - hh - lift - 2 * gap;
  const step = rows > 1 ? Math.min(hh * 0.62, free / (rows - 1)) : 0;
  const handHeight = hh + (rows - 1) * step + lift;
  const hand = { box: { x: inner.x, y: inner.y + W - pad - handHeight, w: W, h: handHeight }, width: hw, height: hh, rows, step, lift };
  const rival = { box: { x: inner.x, y: inner.y + pad, w: W, h: bh }, width: bw, height: bh };
  const table = middle(inner, rival.box.y + bh + gap, hand.box.y - gap, part);
  const layout = { size, frame, inner, rival, hand, ...table, count: Math.max(18, W * 0.075), picker: picker(inner, table.centre, ph) };
  layouts.set(key, layout);
  return layout;
}

export function handPlaces(layout, cards, lifted = new Set()) {
  const { box, width, height, rows, step, lift } = layout.hand;
  return handSlots(box, cards.length, { width, height, rows, step, lift, lifted: (index) => lifted.has(cards[index]) }).map((slot, index) => ({ ...slot, card: cards[index] }));
}

export function backPlaces(layout, count) {
  const { box, width, height } = layout.rival;
  const shown = Math.min(count, MOST_BACKS);
  const step = width * 0.36;
  const group = width + Math.max(0, shown - 1) * step + layout.inner.w * 0.02 + countWidth(count, layout.count);
  const left = box.x + (box.w - group) / 2;
  return { backs: Array.from({ length: shown }, (_, at) => ({ x: left + at * step, y: box.y, w: width, h: height })), count: { x: left + group - countWidth(count, layout.count), y: box.y + height / 2 } };
}

const faceAt = (ctx, theme, sprites, card, box, ratio, at) => sprites.draw(ctx, `f${card}`, box, (pen, size) => drawFace(pen, theme, card, 0, 0, size.w), ratio, at);
const backAt = (ctx, theme, sprites, box, ratio, at) => sprites.draw(ctx, "back", box, (pen, size) => drawBack(pen, theme, 0, 0, size.w), ratio, at);

function turned(ctx, box, angle, paintAt) {
  ctx.save();
  ctx.translate(box.x + box.w / 2, box.y + box.h / 2);
  ctx.rotate(angle);
  paintAt({ x: -box.w / 2, y: -box.h / 2, w: box.w, h: box.h });
  ctx.restore();
}

function drawFelt(ctx, theme, layout) {
  const { frame, inner } = layout;
  drawBoardFrame(ctx, frame, { wood: theme.table.felt, ink: theme.ink, rim: theme.rim });
  const inset = inner.w * 0.008;
  ctx.save();
  ctx.setLineDash([inner.w * 0.012, inner.w * 0.018]);
  roundedRect(ctx, inner.x + inset, inner.y + inset, inner.w - inset * 2, inner.h - inset * 2, frame.radius * 0.7);
  paint(ctx, null, theme.table.line, Math.max(1, inner.w * 0.004));
  ctx.setLineDash([]);
  ctx.restore();
}

function drawRival(ctx, theme, layout, view, sprites) {
  if (!view.theirs) return;
  const { backs, count } = backPlaces(layout, view.theirs);
  for (const box of backs.slice(0, backs.length - (view.arriving ?? 0))) backAt(ctx, theme, sprites, box, view.ratio);
  drawCount(ctx, theme, view.theirs, count.x, count.y, layout.count);
}

function drawStock(ctx, theme, layout, view, sprites) {
  const { stock } = layout;
  const passAt = (alpha) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    drawPassMark(ctx, theme, stock.x + stock.w / 2, stock.y + stock.h / 2, Math.max(44, stock.w * 0.8));
    ctx.restore();
  };
  if (!view.stock) {
    drawEmptySpot(ctx, theme, stock);
    if (view.pass) passAt(1);
    else if (view.passing !== null && view.passing !== undefined) passAt(1 - view.passing);
    return;
  }
  const layers = Math.min(3, Math.ceil(view.stock / 12));
  const shift = Math.max(1, stock.w * 0.025);
  for (let layer = layers - 1; layer >= 0; layer -= 1) backAt(ctx, theme, sprites, { ...stock, x: stock.x + layer * shift, y: stock.y + layer * shift }, view.ratio);
  if (view.drawHint) drawGlow(ctx, theme, stock);
  drawCount(ctx, theme, view.stock, stock.x - layout.inner.w * 0.025, stock.y + stock.h / 2, layout.count, { end: true });
  if (view.pending === "stock") drawPendingClock(ctx, theme, stock);
}

const tilt = (card) => (((card * 37) % 11) - 5) * 0.014;

function drawPile(ctx, theme, layout, view, sprites) {
  const { pile } = layout;
  const shown = view.pile ?? [];
  if (!shown.length) {
    drawEmptySpot(ctx, theme, pile);
    return;
  }
  shown.slice(0, -1).forEach((card) => turned(ctx, pile, tilt(card), (box) => faceAt(ctx, theme, sprites, card, box, view.ratio)));
  faceAt(ctx, theme, sprites, shown.at(-1), pile, view.ratio);
  if (view.lastTheirs) drawLastMark(ctx, theme, pile);
  if (view.pending === "pile") drawPendingClock(ctx, theme, pile);
  if (view.suit) drawSuitChip(ctx, theme, view.suit.suit, layout.suit.x, layout.suit.y, layout.suit.r, view.suit.progress);
}

function drawHand(ctx, theme, layout, view, sprites) {
  for (const place of handPlaces(layout, view.mine, view.lifted)) {
    if (view.hidden.has(place.card)) continue;
    faceAt(ctx, theme, sprites, place.card, place, view.ratio);
    if (!view.open) continue;
    if (view.playable.has(place.card)) drawGlow(ctx, theme, place, { chosen: place.card === view.chosen });
    else drawShade(ctx, theme, place);
  }
}

const between = (from, to, amount) => ({ x: from.x + (to.x - from.x) * amount, y: from.y + (to.y - from.y) * amount, w: from.w + (to.w - from.w) * amount, h: from.h + (to.h - from.h) * amount });

function drawMoving(ctx, theme, view, sprites) {
  const { card, from, to, progress, flip } = view.moving;
  const box = between(from, to, easeInOut(progress));
  const showFace = card !== null && (!flip || progress >= 0.5);
  const squash = flip ? Math.max(0.05, Math.abs(Math.cos(progress * Math.PI))) : 1;
  ctx.save();
  ctx.translate(box.x + box.w / 2, box.y + box.h / 2);
  ctx.scale(squash, 1);
  const local = { x: -box.w / 2, y: -box.h / 2, w: box.w, h: box.h };
  const at = to.w >= from.w ? to : from;
  if (showFace) faceAt(ctx, theme, sprites, card, local, view.ratio, at);
  else backAt(ctx, theme, sprites, local, view.ratio, at);
  ctx.restore();
}

function drawFloating(ctx, theme, layout, view, sprites) {
  const { card, x, y } = view.floating;
  const [w, h] = [layout.hand.width * 1.06, layout.hand.height * 1.06];
  faceAt(ctx, theme, sprites, card, { x: x - w / 2, y: y - h / 2, w, h }, view.ratio);
}

export function drawTable(ctx, theme, view, sprites) {
  const layout = layoutFor(view.size, view.mine.length);
  drawFelt(ctx, theme, layout);
  drawRival(ctx, theme, layout, view, sprites);
  drawStock(ctx, theme, layout, view, sprites);
  drawPile(ctx, theme, layout, view, sprites);
  drawHand(ctx, theme, layout, view, sprites);
  if (view.picking) drawPicker(ctx, theme, layout.picker);
  if (view.moving) drawMoving(ctx, theme, view, sprites);
  if (view.floating) drawFloating(ctx, theme, layout, view, sprites);
  return layout;
}
