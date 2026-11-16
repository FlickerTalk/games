import { roundedRect } from "../../../kit/src/canvas/pen.js";
import { COURTS, COURT_UNIT, PIPS, RANKS, SUITS } from "./deck.js";
import { decodePath, tracePath } from "./path.js";
import { ART } from "./theme.js";

const WIDE = 240;
const TALL = 336;
export const CARD_RATIO = TALL / WIDE;

const SUIT_BOX = 1200;
const GLYPH_BOX = 1000;
const PIP = 70;
const INDEX = { x: -98.4, rank: -140, suit: -105.62, glyph: 32, mark: 26.769 };
const FRAME = { x: -82.4, y: -130.4, w: 164.8, h: 260.8 };
const CORNER = 55.68;
const LAYER = { w: 1300, h: 2000, lines: [6, 3], squash: 0.972, outline: 36 };

const isRed = (suit) => suit === 1 || suit === 2;
const suitOf = (card) => Math.floor(card / 13);
const rankOf = (card) => card % 13;

function trace(ctx, text) {
  ctx.beginPath();
  tracePath(ctx, decodePath(text));
}

function suitMark(ctx, suit, x, y, size, colour) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / SUIT_BOX, size / SUIT_BOX);
  trace(ctx, SUITS[suit]);
  ctx.fillStyle = colour;
  ctx.fill();
  ctx.restore();
}

export function drawSuit(ctx, theme, suit, x, y, size) {
  suitMark(ctx, suit, x, y, size, isRed(suit) ? theme.deck.red : theme.deck.black);
}

function corner(ctx, rank, suit, colour) {
  ctx.save();
  ctx.translate(INDEX.x, INDEX.rank);
  ctx.scale(INDEX.glyph / GLYPH_BOX, INDEX.glyph / GLYPH_BOX);
  trace(ctx, RANKS[rank]);
  Object.assign(ctx, { strokeStyle: colour, lineWidth: 80, lineCap: "square", lineJoin: "miter", miterLimit: 1.5 });
  ctx.stroke();
  ctx.restore();
  suitMark(ctx, suit, INDEX.x, INDEX.suit, INDEX.mark, colour);
}

function figurePip(ctx, deck, suit, [x, y, size, turn, outlined]) {
  const half = Math.floor(size / 2);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, LAYER.squash);
  ctx.rotate((turn * Math.PI) / 180);
  ctx.translate(-half, -half);
  ctx.scale(size / SUIT_BOX, size / SUIT_BOX);
  ctx.translate(SUIT_BOX / 2, SUIT_BOX / 2);
  trace(ctx, SUITS[suit]);
  ctx.fillStyle = isRed(suit) ? deck.red : deck.black;
  ctx.fill();
  if (outlined) {
    Object.assign(ctx, { strokeStyle: deck.blue, lineWidth: LAYER.outline, lineCap: "round", lineJoin: "round" });
    ctx.stroke();
  }
  ctx.restore();
}

function layer(ctx, deck, court, suit, index) {
  const fills = [deck.gold, deck.red, deck.blue, deck.black];
  ctx.save();
  ctx.translate(FRAME.x, FRAME.y);
  ctx.scale(FRAME.w / LAYER.w, FRAME.h / LAYER.h);
  ctx.save();
  ctx.scale(COURT_UNIT, COURT_UNIT);
  trace(ctx, court.layers[index]);
  if (index < fills.length) {
    ctx.fillStyle = fills[index];
    ctx.fill();
  } else {
    Object.assign(ctx, { strokeStyle: deck.blue, lineWidth: LAYER.lines[index - fills.length] / COURT_UNIT, lineCap: "round", lineJoin: "round" });
    ctx.stroke();
  }
  ctx.restore();
  if (index === 5) for (const pip of court.pips) figurePip(ctx, deck, suit, pip);
  ctx.restore();
}

function both(ctx, paint) {
  paint();
  ctx.save();
  ctx.rotate(Math.PI);
  paint();
  ctx.restore();
}

function courtFace(ctx, deck, card) {
  const suit = suitOf(card);
  const court = COURTS[suit * 3 + rankOf(card) - 10];
  const colour = isRed(suit) ? deck.red : deck.black;
  for (let index = 0; index < 6; index += 1) both(ctx, () => layer(ctx, deck, court, suit, index));
  both(ctx, () => {
    corner(ctx, rankOf(card), suit, colour);
    suitMark(ctx, suit, court.corner[0], court.corner[1], CORNER, colour);
  });
  ctx.beginPath();
  ctx.rect(FRAME.x, FRAME.y, FRAME.w, FRAME.h);
  Object.assign(ctx, { strokeStyle: deck.blue, lineWidth: 1 });
  ctx.stroke();
}

function numberFace(ctx, deck, card) {
  const suit = suitOf(card);
  const colour = isRed(suit) ? deck.red : deck.black;
  const { top, turned } = PIPS[rankOf(card)];
  corner(ctx, rankOf(card), suit, colour);
  for (const [x, y] of top) suitMark(ctx, suit, x, y, PIP, colour);
  ctx.save();
  ctx.rotate(Math.PI);
  corner(ctx, rankOf(card), suit, colour);
  for (const [x, y] of turned) suitMark(ctx, suit, x, y, PIP, colour);
  ctx.restore();
}

function blank(ctx, fill, scale) {
  roundedRect(ctx, -WIDE / 2 + 0.5, -TALL / 2 + 0.5, WIDE - 1, TALL - 1, 12);
  ctx.fillStyle = fill;
  ctx.fill();
  Object.assign(ctx, { strokeStyle: ART.deck.black, lineWidth: Math.max(1, 0.8 / scale) });
  ctx.stroke();
}

function onCard(ctx, x, y, width, paint) {
  const scale = width / WIDE;
  ctx.save();
  ctx.translate(x + width / 2, y + (width * CARD_RATIO) / 2);
  ctx.scale(scale, scale);
  paint(scale);
  ctx.restore();
}

export function drawFace(ctx, theme, card, x, y, width) {
  onCard(ctx, x, y, width, (scale) => {
    blank(ctx, theme.deck.paper, scale);
    if (rankOf(card) >= 10) courtFace(ctx, theme.deck, card);
    else numberFace(ctx, theme.deck, card);
  });
}

const FIELD = { x: WIDE / 2 - 16, y: TALL / 2 - 16 };

function diagonal(ctx, offset, slope) {
  const ends = [-FIELD.x, FIELD.x].map((x) => [x, slope * x + offset]);
  const clipped = ends.map(([x, y]) => {
    if (Math.abs(y) <= FIELD.y) return [x, y];
    const edge = Math.sign(y) * FIELD.y;
    return [(edge - offset) / slope, edge];
  });
  ctx.moveTo(...clipped[0]);
  ctx.lineTo(...clipped[1]);
}

function lattice(ctx, colour, spacing) {
  ctx.beginPath();
  for (let offset = -FIELD.x - FIELD.y + spacing / 2; offset < FIELD.x + FIELD.y; offset += spacing) {
    diagonal(ctx, offset, 1);
    diagonal(ctx, offset, -1);
  }
  Object.assign(ctx, { strokeStyle: colour, lineWidth: 3 });
  ctx.stroke();
}

export function drawBack(ctx, theme, x, y, width) {
  const { field, lattice: line, border } = theme.back;
  onCard(ctx, x, y, width, (scale) => {
    blank(ctx, border, scale);
    ctx.save();
    roundedRect(ctx, -FIELD.x, -FIELD.y, FIELD.x * 2, FIELD.y * 2, 6);
    ctx.fillStyle = field;
    ctx.fill();
    ctx.clip();
    lattice(ctx, line, 34);
    ctx.restore();
  });
}

export function sideMark(side) {
  const { body, mark } = ART.sides[side];
  const shape = mark === "circle" ? `<circle r="19" fill="${body}" stroke="${ART.ink}" stroke-width="3"/>` : `<polygon points="0,-21 20,0 0,21 -20,0" fill="${body}" stroke="${ART.ink}" stroke-width="3"/>`;
  const cards = (mark === "circle" ? [0] : [-3.5, 3.5]).map((dx) => `<rect x="${dx - 4.5}" y="-8" width="9" height="16" rx="1.5" fill="${ART.deck.paper}" stroke="${ART.ink}" stroke-width="1.6"/>`).join("");
  return `<svg viewBox="-24 -24 48 48" aria-hidden="true">${shape}${cards}</svg>`;
}
