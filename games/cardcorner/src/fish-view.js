import { paint as fill, roundedRect } from "../../../kit/src/canvas/pen.js";
import { drawRank } from "../../../kit/src/cards/faces.js";
import { fractionOf } from "../../../kit/src/tabletop/grid.js";
import { byRank, rankOf } from "./card.js";
import { countWidth, drawBubble, drawCount, drawEmptySpot, drawFish, drawGlow, drawMiniCards } from "./marks.js";
import { rankName } from "./names.js";
import { handPlaces, seatsLayout } from "./seats.js";
import { atLeast, backAt, backRow, cardRow, drawStack, faceAt } from "./table.js";

const MOVE_MS = 320;
const ASK_MS = 260;

const ordered = (hand) => [...hand].sort(byRank);

function layout(size, state) {
  const base = seatsLayout(size, state.table.hands.reduce((most, hand) => Math.max(most, hand.length), 0));
  const { pile, centre, mid, inner } = base;
  const pond = { x: mid - pile.w - inner.w * 0.1, y: centre - pile.h / 2, ...pile };
  const bubble = Math.max(34, pile.h * 0.62);
  return { ...base, pond, bubble: { x: mid + inner.w * 0.08, y: centre, size: bubble }, result: { x: mid + inner.w * 0.08 + bubble * 1.25, y: centre, size: bubble * 0.8 } };
}

const rivalRow = (at, count) => backRow(at.rival, count, at.small, at.count, countWidth(count, at.count));

function said({ last }, me, t) {
  if (!last || last.rank === null) return null;
  const asked = t(last.by === me ? "youAsked" : "theyAsked", { rank: rankName(last.rank, t) });
  return `${asked} · ${last.got ? t("gotCards", { n: last.got }) : t("goFish")}`;
}

function buttons({ state, me, layout: at, size, t, canPlay }) {
  const { table } = state;
  const hand = ordered(table.hands[me]);
  const list = handPlaces(at, hand).map(({ card: one, reach }) => ({ key: one, box: fractionOf(reach, size), label: t("askFor", { rank: rankName(rankOf(one), t) }), disabled: !canPlay, data: { card: one } }));
  const fishing = canPlay && !hand.length && table.pond.length > 0;
  list.push({ key: "pond", box: fractionOf(atLeast(at.pond, size), size), label: t(fishing ? "fishPond" : "pondLeft", { n: table.pond.length }), disabled: !fishing, data: { act: "fish" } });
  const words = said(table, me, t);
  const half = at.bubble.size / 2;
  if (words) list.push({ key: "said", box: fractionOf(atLeast({ x: at.bubble.x - half, y: at.bubble.y - half, w: at.result.x + at.result.size / 2 - at.bubble.x + half, h: at.bubble.size }, size), size), label: words, disabled: true, data: {} });
  return list;
}

function press(key, { state, me, canPlay, ctx }) {
  if (!canPlay) return;
  const hand = state.table.hands[me];
  if (key === "pond" && !hand.length && state.table.pond.length) ctx.play("d");
  else if (Number.isInteger(key) && hand.includes(key)) ctx.play(`a${rankOf(key)}`);
}

function label({ state, me, t }) {
  const { hands, books, pond } = state.table;
  const parts = [t("theirHand", { n: hands[1 - me].length }), t("theirBooks", { n: books[1 - me].length }), t("pondLeft", { n: pond.length }), t("yourBooks", { n: books[me].length }), t("yourHand", { n: hands[me].length })];
  return `${t("name")}, ${t("fish")}: ${parts.join(" · ")}`;
}

function paintBooks(ctx, theme, at, row, ranks, active) {
  const width = countWidth(ranks.length, at.count);
  const spots = cardRow({ ...row, w: row.w - width - at.pad }, ranks.length, at.small, { step: 1.12 });
  ranks.forEach((rank, index) => {
    const spot = spots[index];
    roundedRect(ctx, spot.x + 0.5, spot.y + 0.5, spot.w - 1, spot.h - 1, spot.w * 0.1);
    fill(ctx, theme.deck.paper, theme.deck.black, 1);
    drawRank(ctx, rank, spot.x + spot.w / 2, spot.y + spot.h / 2, spot.w * 0.62, theme.deck.black);
  });
  drawCount(ctx, theme, ranks.length, row.x + row.w, row.y + row.h / 2, at.count, { end: true, active });
}

function paintAsk(ctx, theme, { state, me, layout: at, ratio, sprites }) {
  const { last } = state.table;
  if (!last || last.rank === null) return;
  drawBubble(ctx, theme, last.rank, at.bubble.x, at.bubble.y, at.bubble.size, { tail: last.by === me ? -1 : 1 });
  const { x, y, size } = at.result;
  if (last.got) drawMiniCards(ctx, theme, x, y, size * 0.7, last.got);
  else drawFish(ctx, theme, x, y, size);
  if (last.card !== null) faceAt(ctx, theme, sprites, last.card, { x: x + size * 0.6, y: y - at.small.h / 2, ...at.small }, ratio);
}

function paint(ctx, theme, seen) {
  const { state, me, layout: at, hidden, ratio, sprites, canPlay } = seen;
  const { table } = state;
  const theirs = table.hands[1 - me].length;
  const row = rivalRow(at, theirs);
  const turn = state.end ? null : state.next;
  for (const box of row.backs.slice(0, row.backs.length - (hidden.has("r") ? 1 : 0))) backAt(ctx, theme, sprites, box, ratio);
  drawCount(ctx, theme, theirs, row.count.x, row.count.y, at.count, { active: turn === 1 - me });
  paintBooks(ctx, theme, at, at.upper, table.books[1 - me], false);
  paintBooks(ctx, theme, at, at.lower, table.books[me], false);
  if (table.pond.length) drawStack(ctx, theme, sprites, at.pond, table.pond.length, ratio);
  else drawEmptySpot(ctx, theme, at.pond, theme.tables.cloth.line);
  drawCount(ctx, theme, table.pond.length, at.pond.x - at.inner.w * 0.02, at.pond.y + at.pond.h / 2, at.count, { end: true });
  const hand = ordered(table.hands[me]);
  if (canPlay && !hand.length && table.pond.length) drawGlow(ctx, theme, at.pond);
  paintAsk(ctx, theme, seen);
  for (const slot of handPlaces(at, hand)) {
    if (hidden.has(`h${slot.card}`)) continue;
    faceAt(ctx, theme, sprites, slot.card, slot, ratio);
    if (canPlay) drawGlow(ctx, theme, slot);
  }
}

function flights(before, after, move, me, size) {
  const [from, to] = [layout(size, before), layout(size, after)];
  const side = before.next;
  const mine = side === me;
  const { last } = after.table;
  const slot = (at, state, one) => handPlaces(at, ordered(state.table.hands[me])).find((place) => place.card === one);
  const rival = (at, state) => rivalRow(at, state.table.hands[1 - me].length).backs.at(-1) ?? at.rival;
  const gained = after.table.hands[side].filter((one) => !before.table.hands[side].includes(one));
  if (last.got) {
    const given = before.table.hands[1 - side].filter((one) => rankOf(one) === last.rank);
    return given.flatMap((one, step) => {
      const target = mine ? slot(to, after, one) : rival(to, after);
      if (!target) return [];
      return [{ card: one, from: mine ? rival(from, before) : slot(from, before, one), to: target, delay: ASK_MS + step * 80, since: mine ? ASK_MS : 0, ms: MOVE_MS, flip: mine ? "up" : "down", hide: [mine ? `h${one}` : "r"] }];
    });
  }
  if (!last.drew) return [];
  const [drawn] = gained;
  const delay = move === "d" ? 0 : ASK_MS;
  if (!mine) return [{ card: last.card, from: from.pond, to: rival(to, after), delay, since: delay, ms: MOVE_MS, flip: last.card === null ? null : "down", hide: ["r"] }];
  const target = drawn === undefined ? null : slot(to, after, drawn);
  return target ? [{ card: drawn, from: from.pond, to: target, delay, since: delay, ms: MOVE_MS, flip: "up", hide: [`h${drawn}`] }] : [];
}

function cues(before, after, move) {
  const { last } = after.table;
  const result = last.got ? [{ cue: "card", at: ASK_MS + MOVE_MS }] : last.drew ? [{ cue: "draw", at: move === "d" ? 0 : ASK_MS }] : [];
  return move === "d" ? result : [{ cue: "pick", at: 0 }, ...result];
}

export const fishView = { table: "fish", layout, buttons, press, label, paint, flights, cues };
