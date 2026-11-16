import { fractionOf } from "../../../kit/src/tabletop/grid.js";
import { byRank, bySuit } from "./card.js";
import { countWidth, drawAction, drawBracket, drawCount, drawEmptySpot, drawGlow } from "./marks.js";
import { fits, findMelds, meldKind } from "./melds.js";
import { cardName, cardNames } from "./names.js";
import { handPlaces, seatsLayout } from "./seats.js";
import { atLeast, backAt, backRow, drawStack, faceAt } from "./table.js";

const MOVE_MS = 300;
const OVERLAP = 0.45;
const BETWEEN = 0.35;

const ordered = (hand, local) => [...hand].sort(local.order === "rank" ? byRank : bySuit);
const chosen = (local, hand) => (local.selected ?? []).filter((one) => hand.includes(one));

function layout(size, state) {
  const base = seatsLayout(size, state.table.hands.reduce((most, hand) => Math.max(most, hand.length), 0), { least: 2 });
  const { pile, centre, mid, inner } = base;
  const gap = inner.w * 0.06;
  const stock = { x: mid - gap / 2 - pile.w, y: centre - pile.h / 2, ...pile };
  const discard = { x: mid + gap / 2, y: centre - pile.h / 2, ...pile };
  const r = Math.max(22, inner.w * 0.07);
  return { ...base, stock, discard, r, sort: { x: inner.x + base.pad + r, y: centre }, lay: { x: inner.x + inner.w - base.pad - r, y: centre } };
}

function meldPlaces(at, melds) {
  const { w, h } = at.small;
  return [at.upper, at.lower].flatMap((row, rowAt) => {
    const mine = melds.map((cards, index) => ({ cards, index })).filter(({ index }) => index % 2 === rowAt);
    const natural = mine.reduce((sum, { cards }) => sum + w + (cards.length - 1) * w * OVERLAP, 0) + Math.max(0, mine.length - 1) * w * BETWEEN;
    const squeeze = Math.min(1, (row.w - mine.length * w) / Math.max(1, natural - mine.length * w));
    let x = row.x + Math.max(0, (row.w - natural) / 2);
    return mine.map(({ cards, index }) => {
      const step = w * OVERLAP * squeeze;
      const spots = cards.map((one, order) => ({ card: one, x: x + order * step, y: row.y, w, h }));
      const box = { x, y: row.y, w: w + (cards.length - 1) * step, h };
      x += box.w + w * BETWEEN * squeeze;
      return { index, spots, box };
    });
  }).sort((a, b) => a.index - b.index);
}

function discarding(state, hand, picked) {
  return state.table.step === "play" && picked.length === 1 && (picked[0] !== state.table.took || hand.length === 1) ? picked[0] : null;
}

function buttons({ state, me, local, layout: at, size, t, canPlay }) {
  const { table } = state;
  const hand = ordered(table.hands[me], local);
  const picked = chosen(local, hand);
  const playStep = canPlay && table.step === "play";
  const drawStep = canPlay && table.step === "draw";
  const round = ({ x, y }) => fractionOf({ x: x - at.r, y: y - at.r, w: at.r * 2, h: at.r * 2 }, size);
  const list = [{ key: "sort", box: round(at.sort), label: t(local.order === "rank" ? "sortSuit" : "sortRank"), disabled: !hand.length, data: {} }];
  for (const { card: one, reach } of handPlaces(at, hand, new Set(picked))) {
    const marked = picked.includes(one);
    list.push({ key: one, box: fractionOf(reach, size), label: t(marked ? "selectedCard" : "selectCard", { card: cardName(one, t) }), disabled: !playStep, data: { card: one, mark: marked ? "chosen" : null } });
  }
  list.push({ key: "stock", box: fractionOf(atLeast(at.stock, size), size), label: t("takeStock", { n: table.stock.length }), disabled: !drawStep || !table.stock.length, data: { act: "draw" } });
  const top = table.discard.at(-1);
  const out = playStep ? discarding(state, hand, picked) : null;
  if (out !== null) list.push({ key: "discard", box: fractionOf(atLeast(at.discard, size), size), label: t("discardCard", { card: cardName(out, t) }), disabled: false, data: { act: "discard" } });
  else if (top !== undefined) list.push({ key: "discard", box: fractionOf(atLeast(at.discard, size), size), label: t(drawStep ? "takeDiscard" : "discardTop", { card: cardName(top, t) }), disabled: !drawStep, data: { act: "take" } });
  if (playStep && meldKind(picked)) list.push({ key: "lay", box: round(at.lay), label: t("layDown"), disabled: false, data: { act: "lay" } });
  for (const { index, box } of meldPlaces(at, table.melds)) {
    const cards = cardNames(table.melds[index], t);
    const adds = playStep && picked.length === 1 && fits(table.melds[index], picked[0]);
    list.push({ key: `m${index}`, box: fractionOf(atLeast(box, size), size), label: adds ? t("addTo", { card: cardName(picked[0], t), cards }) : t("meldOf", { cards }), disabled: !adds, data: { meld: index } });
  }
  return list;
}

function press(key, { state, me, local, canPlay, ctx, wake }) {
  const { table } = state;
  const hand = table.hands[me];
  const picked = chosen(local, hand);
  if (key === "sort") {
    local.order = local.order === "rank" ? "suit" : "rank";
    wake();
    return;
  }
  if (!canPlay) return;
  if (table.step === "draw") {
    if (key === "stock" && table.stock.length) ctx.play("ds");
    if (key === "discard" && table.discard.length) ctx.play("dd");
    return;
  }
  if (Number.isInteger(key) && hand.includes(key)) {
    local.selected = picked.includes(key) ? picked.filter((one) => one !== key) : [...picked, key];
    ctx.sound?.play("cards-pick");
    wake();
  } else if (key === "discard" && discarding(state, hand, picked) !== null) ctx.play(`x${picked[0]}`);
  else if (key === "lay" && meldKind(picked)) ctx.play(`m${picked.join(".")}`);
  else if (typeof key === "string" && key[0] === "m" && picked.length === 1 && table.melds[Number(key.slice(1))] && fits(table.melds[Number(key.slice(1))], picked[0])) ctx.play(`a${picked[0]}.${key.slice(1)}`);
}

function label({ state, me, t }) {
  const { table } = state;
  const top = table.discard.at(-1);
  const parts = [t("theirHand", { n: table.hands[1 - me].length })];
  if (top !== undefined) parts.push(t("discardTop", { card: cardName(top, t) }));
  parts.push(t("yourHand", { n: table.hands[me].length }));
  return `${t("name")}, ${t("rummy")}: ${parts.join(" · ")}`;
}

function rivalRow(at, count) {
  return backRow(at.rival, count, at.small, at.count, countWidth(count, at.count));
}

function paintHand(ctx, theme, { state, me, local, layout: at, hidden, ratio, sprites }) {
  const hand = ordered(state.table.hands[me], local);
  const picked = chosen(local, hand);
  const slots = handPlaces(at, hand, new Set(picked));
  for (const slot of slots) {
    if (hidden.has(`h${slot.card}`)) continue;
    faceAt(ctx, theme, sprites, slot.card, slot, ratio);
    if (picked.includes(slot.card)) drawGlow(ctx, theme, slot, { chosen: true });
  }
  for (const meld of findMelds(hand)) {
    const first = hand.indexOf(meld[0]);
    const together = meld.every((one, order) => hand[first + order] === one) && slots[first].row === slots[first + meld.length - 1].row;
    if (!together) continue;
    const [from, to] = [slots[first], slots[first + meld.length - 1]];
    drawBracket(ctx, theme.marks.chosen, from.x + 2, Math.min(from.y, to.y) - at.hand.lift * 0.6, to.x + to.w - from.x - 4, at.hand.lift * 0.45);
  }
}

function paint(ctx, theme, seen) {
  const { state, me, local, layout: at, hidden, ratio, sprites, canPlay } = seen;
  const { table } = state;
  const line = theme.tables.cloth.line;
  const theirs = table.hands[1 - me].length;
  const row = rivalRow(at, theirs);
  for (const box of row.backs.slice(0, row.backs.length - (hidden.has("r") ? 1 : 0))) backAt(ctx, theme, sprites, box, ratio);
  drawCount(ctx, theme, theirs, row.count.x, row.count.y, at.count, { active: !state.end && state.next !== me });
  const picked = chosen(local, table.hands[me]);
  for (const { index, spots, box } of meldPlaces(at, table.melds)) {
    for (const spot of spots) if (!hidden.has(`m${spot.card}`)) faceAt(ctx, theme, sprites, spot.card, spot, ratio);
    if (canPlay && table.step === "play" && picked.length === 1 && fits(table.melds[index], picked[0])) drawGlow(ctx, theme, box);
  }
  if (table.stock.length) drawStack(ctx, theme, sprites, at.stock, table.stock.length, ratio);
  else drawEmptySpot(ctx, theme, at.stock, line);
  drawCount(ctx, theme, table.stock.length, at.stock.x - at.inner.w * 0.02, at.stock.y + at.stock.h / 2, at.count, { end: true });
  const top = hidden.has("d") ? table.discard.at(-2) : table.discard.at(-1);
  if (top === undefined) drawEmptySpot(ctx, theme, at.discard, line);
  else faceAt(ctx, theme, sprites, top, at.discard, ratio);
  if (canPlay && table.step === "draw") {
    if (table.stock.length) drawGlow(ctx, theme, at.stock);
    if (top !== undefined) drawGlow(ctx, theme, at.discard);
  } else if (canPlay && discarding(state, table.hands[me], picked) !== null) drawGlow(ctx, theme, at.discard, { chosen: true });
  paintHand(ctx, theme, seen);
  if (table.hands[me].length) drawAction(ctx, theme, "sort", at.sort.x, at.sort.y, at.r);
  if (canPlay && table.step === "play" && meldKind(picked)) drawAction(ctx, theme, "lay", at.lay.x, at.lay.y, at.r);
}

function flights(before, after, move, me, size, local = {}) {
  const [from, to] = [layout(size, before), layout(size, after)];
  const side = before.next;
  const mine = side === me;
  const slot = (at, state, one) => handPlaces(at, ordered(state.table.hands[me], local)).find((place) => place.card === one);
  const rival = (at, state) => rivalRow(at, state.table.hands[1 - me].length).backs.at(-1) ?? at.rival;
  if (move === "ds" || move === "dd") {
    const one = after.table.hands[side].at(-1);
    const start = move === "ds" ? from.stock : from.discard;
    if (mine) return [{ card: one, from: start, to: slot(to, after, one), ms: MOVE_MS, flip: move === "ds" ? "up" : null, hide: [`h${one}`] }];
    return [{ card: move === "ds" ? null : one, from: start, to: rival(to, after), ms: MOVE_MS, flip: move === "ds" ? null : "down", hide: ["r"] }];
  }
  const origin = (one) => (mine ? slot(from, before, one) : rival(from, before));
  if (move[0] === "x") {
    const one = Number(move.slice(1));
    return [{ card: one, from: origin(one), to: to.discard, ms: MOVE_MS, flip: mine ? null : "up", hide: ["d"] }];
  }
  const moved = move[0] === "m" ? move.slice(1).split(".").map(Number) : [Number(move.slice(1).split(".")[0])];
  const spots = meldPlaces(to, after.table.melds).flatMap((meld) => meld.spots);
  return moved.map((one) => ({ card: one, from: origin(one), to: spots.find((spot) => spot.card === one), ms: MOVE_MS, flip: mine ? null : "up", hide: [`m${one}`] }));
}

function cues(before, after, move) {
  return move[0] === "d" ? [{ cue: "draw", at: 0 }] : [{ cue: "card", at: MOVE_MS }];
}

export const rummyView = { table: "rummy", layout, buttons, press, label, paint, flights, cues };
