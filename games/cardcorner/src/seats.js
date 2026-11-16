import { CARD_RATIO } from "../../../kit/src/cards/faces.js";
import { handRows, handSlots } from "../../../kit/src/cards/hand.js";
import { frameOf } from "./table.js";

const BY_ROWS = [null, { pile: 0.15, small: 0.085 }, { pile: 0.13, small: 0.075 }, { pile: 0.1, small: 0.06 }];
const HAND_WIDTH = 0.16;
const PAD = 0.015;
const GAP = 0.012;
const LIFT = 0.02;
const layouts = new Map();

export function seatsLayout(size, count, { least = 1, lift: raise = LIFT } = {}) {
  const frame = frameOf(size);
  const { inner } = frame;
  const W = inner.w;
  const hw = W * HAND_WIDTH;
  const rows = count <= 4 ? 1 : Math.max(least, handRows(count, { span: W, width: hw }));
  const key = `${size}:${rows}:${raise}`;
  if (layouts.has(key)) return layouts.get(key);
  const part = BY_ROWS[rows];
  const [pad, gap, lift, hh] = [W * PAD, W * GAP, W * raise, hw * CARD_RATIO];
  const small = { w: W * part.small, h: W * part.small * CARD_RATIO };
  const pile = { w: W * part.pile, h: W * part.pile * CARD_RATIO };
  const free = W - 2 * pad - 3 * small.h - pile.h - hh - lift - 4 * gap;
  const step = rows > 1 ? Math.min(hh * 0.66, free / (rows - 1)) : 0;
  const handHeight = hh + (rows - 1) * step + lift;
  const hand = { box: { x: inner.x, y: inner.y + W - pad - handHeight, w: W, h: handHeight }, width: hw, height: hh, rows, step, lift };
  const rival = { x: inner.x, y: inner.y + pad, w: W, h: small.h };
  const upper = { x: inner.x + pad, y: rival.y + small.h + gap, w: W - 2 * pad, h: small.h };
  const lower = { x: inner.x + pad, y: hand.box.y - gap - small.h, w: W - 2 * pad, h: small.h };
  const layout = { size, frame, inner, rival, upper, lower, hand, small, pile, centre: (upper.y + small.h + lower.y) / 2, mid: inner.x + W / 2, count: Math.max(18, W * 0.07), pad };
  layouts.set(key, layout);
  return layout;
}

export function handPlaces(layout, cards, lifted = new Set()) {
  const { box, width, height, rows, step, lift } = layout.hand;
  return handSlots(box, cards.length, { width, height, rows, step, lift, lifted: (index) => lifted.has(cards[index]) }).map((slot, index) => ({ ...slot, card: cards[index] }));
}
