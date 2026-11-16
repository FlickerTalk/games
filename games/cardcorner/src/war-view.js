import { CARD_RATIO } from "../../../kit/src/cards/faces.js";
import { fractionOf } from "../../../kit/src/tabletop/grid.js";
import { countWidth, drawCount, drawEmptySpot, drawGlow, drawProgress } from "./marks.js";
import { cardName } from "./names.js";
import { atLeast, backAt, cardRow, drawStack, faceAt, frameOf } from "./table.js";
import { LIMIT } from "./war.js";

const LAY_MS = 260;
const STEP_MS = 90;
const CLEAR_MS = 300;
const PILE = 0.13;
const UP = 0.17;
const PAD = 0.02;

function layout(size) {
  const frame = frameOf(size);
  const { inner } = frame;
  const W = inner.w;
  const [pw, uw, pad] = [W * PILE, W * UP, W * PAD];
  const [ph, uh] = [pw * CARD_RATIO, uw * CARD_RATIO];
  const mid = inner.x + W / 2;
  const middle = inner.y + W / 2;
  const piles = [{ x: mid - pw / 2, y: inner.y + W - pad - ph, w: pw, h: ph }, { x: mid - pw / 2, y: inner.y + pad, w: pw, h: ph }];
  const rows = [{ x: inner.x + pad, y: middle + pad / 2, w: W - 2 * pad, h: uh }, { x: inner.x + pad, y: middle - pad / 2 - uh, w: W - 2 * pad, h: uh }];
  const count = Math.max(20, W * 0.07);
  const track = { x: inner.x + pad * 2 + countWidth(LIMIT, count) + pad, y: piles[1].y + ph / 2 - Math.max(3, W * 0.012), w: W * 0.14, h: Math.max(6, W * 0.024) };
  return { size, frame, inner, piles, rows, up: { w: uw, h: uh }, count, track, pad };
}

const seatOf = (side, me) => (side === me ? 0 : 1);

function laid(table) {
  const fresh = table.pot.some((cards) => cards.length);
  const from = fresh || !table.last ? table : table.last;
  return { pot: from.pot, open: from.open, winner: fresh ? null : (table.last?.winner ?? null), settled: !fresh && Boolean(table.last) };
}

function places(at, cards, side, me) {
  return cardRow(at.rows[seatOf(side, me)], cards.length, at.up, { step: 1.06 });
}

function buttons({ state, me, layout: at, size, t, canPlay }) {
  const { piles } = state.table;
  const { open } = laid(state.table);
  const box = (seatAt) => fractionOf(atLeast(at.piles[seatAt], size), size);
  const list = [
    { key: "mine", box: box(0), label: t("turnCard", { n: piles[me].length }), disabled: !canPlay, data: { act: "turn" } },
    { key: "theirs", box: box(1), label: t("theirPile", { n: piles[1 - me].length }), disabled: true, data: {} },
  ];
  const [mine, theirs] = [open[me].at(-1), open[1 - me].at(-1)];
  if (mine === undefined && theirs === undefined) return list;
  const said = [mine !== undefined && t("yourCard", { card: cardName(mine, t) }), theirs !== undefined && t("theirCard", { card: cardName(theirs, t) })].filter(Boolean).join(" · ");
  const area = { x: at.rows[1].x, y: at.rows[1].y, w: at.rows[1].w, h: at.rows[0].y + at.rows[0].h - at.rows[1].y };
  return [...list, { key: "table", box: fractionOf(area, size), label: said, disabled: true, data: {} }];
}

function press(key, { canPlay, ctx }) {
  if (key === "mine" && canPlay) ctx.play("f");
}

function label({ state, me, t }) {
  const { piles, battles } = state.table;
  return `${t("name")}, ${t("war")}: ${t("battle", { n: Math.min(LIMIT, battles + 1), limit: LIMIT })} · ${t("yourPile", { n: piles[me].length })} · ${t("theirPile", { n: piles[1 - me].length })}`;
}

function paintRow(ctx, theme, at, { pot, open, winner, settled }, side, seen) {
  const { me, hidden, ratio, sprites } = seen;
  const spots = places(at, pot[side], side, me);
  pot[side].forEach((one, index) => {
    if (hidden.has(`p${side}:${index}`)) return;
    if (open[side].includes(one)) faceAt(ctx, theme, sprites, one, spots[index], ratio);
    else backAt(ctx, theme, sprites, spots[index], ratio);
  });
  const last = spots.at(-1);
  if (last && settled && !hidden.has(`p${side}:${spots.length - 1}`) && (winner === side || winner === null)) drawGlow(ctx, theme, last, { chosen: winner === side });
}

function paint(ctx, theme, seen) {
  const { state, me, layout: at, ratio, sprites, canPlay } = seen;
  const { piles, battles } = state.table;
  const line = theme.tables.slate.line;
  [me, 1 - me].forEach((side, seatAt) => {
    const pile = at.piles[seatAt];
    if (piles[side].length) drawStack(ctx, theme, sprites, pile, piles[side].length, ratio);
    else drawEmptySpot(ctx, theme, pile, line);
    if (seatAt === 0 && canPlay) drawGlow(ctx, theme, pile);
    drawCount(ctx, theme, piles[side].length, pile.x + pile.w + at.pad * 1.5, pile.y + pile.h / 2, at.count, { active: !state.end && state.next === side });
  });
  const shown = laid(state.table);
  for (const side of [1 - me, me]) paintRow(ctx, theme, at, shown, side, seen);
  const y = at.track.y + at.track.h / 2;
  drawCount(ctx, theme, Math.min(LIMIT, battles), at.track.x - at.pad, y, at.count, { end: true });
  drawProgress(ctx, theme, at.track, battles, LIMIT);
  drawCount(ctx, theme, LIMIT, at.track.x + at.track.w + at.pad, y, at.count);
}

function cleared(before, me, at) {
  const { table } = before;
  if (table.pot.some((cards) => cards.length) || !table.last || table.last.winner === null) return [];
  const home = at.piles[seatOf(table.last.winner, me)];
  return [0, 1].flatMap((side) => {
    const spots = places(at, table.last.pot[side], side, me);
    return table.last.pot[side].map((one, index) => (table.last.open[side].includes(one) ? { card: one, from: spots[index], to: home, ms: CLEAR_MS, flip: "down" } : { card: null, from: spots[index], to: home, ms: CLEAR_MS }));
  });
}

function flights(before, after, move, me, size) {
  const at = layout(size);
  const side = before.next;
  const now = laid(after.table);
  const had = before.table.pot[side].length;
  const spots = places(at, now.pot[side], side, me);
  const home = at.piles[seatOf(side, me)];
  const fresh = now.pot[side].slice(had).map((one, step) => {
    const open = now.open[side].includes(one);
    return { card: open ? one : null, from: home, to: spots[had + step], delay: step * STEP_MS, ms: LAY_MS, flip: open ? "up" : null, hide: [`p${side}:${had + step}`] };
  });
  return [...cleared(before, me, at), ...fresh];
}

const cues = () => [{ cue: "card", at: 0 }];

export const warView = { table: "war", layout, buttons, press, label, paint, flights, cues };
