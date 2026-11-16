import { CARD_RATIO } from "../../../kit/src/cards/faces.js";
import { fractionOf } from "../../../kit/src/tabletop/grid.js";
import { countWidth, drawCount, drawGlow, drawMiniCards } from "./marks.js";
import { cardName } from "./names.js";
import { backAt, faceAt, frameOf } from "./table.js";

export const FLIP_MS = 240;
const HOLD_MS = 520;
const TAKE_MS = 360;
const COLUMNS = { 16: 4, 24: 6 };
const STRIP = 0.075;
const GAP = 0.012;

function layout(size, state) {
  const frame = frameOf(size);
  const { inner } = frame;
  const W = inner.w;
  const count = state.table.cards.length;
  const columns = COLUMNS[count];
  const rows = count / columns;
  const [strip, gap] = [W * STRIP, W * GAP];
  const area = { x: inner.x + gap, y: inner.y + strip, w: W - 2 * gap, h: W - 2 * strip };
  const w = Math.min((area.w - (columns - 1) * gap) / columns, (area.h - (rows - 1) * gap) / (rows * CARD_RATIO));
  const h = w * CARD_RATIO;
  const left = area.x + (area.w - columns * w - (columns - 1) * gap) / 2;
  const top = area.y + (area.h - rows * h - (rows - 1) * gap) / 2;
  const cells = Array.from({ length: count }, (_, at) => ({ x: left + (at % columns) * (w + gap), y: top + Math.floor(at / columns) * (h + gap), w, h }));
  const badge = Math.max(20, strip * 0.78);
  const mid = inner.x + W / 2;
  return { size, frame, inner, cells, gap, badge, piles: [{ x: mid, y: inner.y + W - strip / 2 }, { x: mid, y: inner.y + strip / 2 }] };
}

const pileOf = (at, side, me) => at.piles[side === me ? 0 : 1];
const reach = (cell, gap) => ({ x: cell.x - gap / 2, y: cell.y - gap / 2, w: cell.w + gap, h: cell.h + gap });

function buttons({ state, layout: at, size, t, canPlay }) {
  const { cards, owner, up, miss } = state.table;
  return cards.flatMap((one, index) => {
    if (owner[index] !== null) return [];
    const shown = up.includes(index);
    const label = shown ? t("faceUp", { n: index + 1, card: cardName(one, t) }) : t("faceDown", { n: index + 1 });
    return [{ key: index, box: fractionOf(reach(at.cells[index], at.gap), size), label, disabled: !canPlay || (shown && !miss), data: { cell: true, mark: shown ? "up" : null } }];
  });
}

function press(key, { state, canPlay, ctx }) {
  const { owner, up, miss } = state.table;
  if (!canPlay || !Number.isInteger(key) || owner[key] !== null || (up.includes(key) && !miss)) return;
  ctx.play(`f${key}`);
}

function label({ state, me, t }) {
  const { won } = state.table;
  return `${t("name")}, ${t("pairs")}: ${t("yourPairs", { n: won[me] ?? 0 })} · ${t("theirPairs", { n: won[1 - me] ?? 0 })}`;
}

function badge(ctx, theme, at, place, count, active) {
  const width = countWidth(count, at.badge);
  const icon = at.badge * 1.1;
  const left = place.x - (icon + width) / 2;
  drawMiniCards(ctx, theme, left + icon / 2, place.y, at.badge * 0.78, 2);
  drawCount(ctx, theme, count, left + icon, place.y, at.badge, { active });
}

function paint(ctx, theme, { state, me, layout: at, hidden, ratio, sprites, canPlay }) {
  const { cards, owner, up, miss, won } = state.table;
  cards.forEach((_, index) => {
    if (owner[index] !== null || hidden.has(`c${index}`)) return;
    if (!up.includes(index)) backAt(ctx, theme, sprites, at.cells[index], ratio);
    else {
      faceAt(ctx, theme, sprites, cards[index], at.cells[index], ratio);
      if (!miss) drawGlow(ctx, theme, at.cells[index], { chosen: true });
    }
  });
  const mine = state.end ? null : state.next === me;
  badge(ctx, theme, at, at.piles[0], won[me] ?? 0, mine === true && canPlay);
  badge(ctx, theme, at, at.piles[1], won[1 - me] ?? 0, mine === false);
}

function flights(before, after, move, me, size) {
  const at = layout(size, after);
  const index = Number(move.slice(1));
  const { cards } = after.table;
  const found = [];
  if (before.table.miss) for (const old of before.table.up) if (old !== index) found.push({ card: cards[old], from: at.cells[old], to: at.cells[old], ms: FLIP_MS, flip: "down", hide: [`c${old}`] });
  found.push({ card: cards[index], from: at.cells[index], to: at.cells[index], ms: FLIP_MS, flip: "up", hide: [`c${index}`] });
  const { took } = after.table;
  if (!took) return found;
  const pile = pileOf(at, after.table.owner[index], me);
  const small = { x: pile.x - at.badge * 0.35, y: pile.y - at.badge * 0.5, w: at.badge * 0.7, h: at.badge };
  for (const one of took) found.push({ card: cards[one], from: at.cells[one], to: small, since: one === index ? FLIP_MS : 0, delay: FLIP_MS + HOLD_MS, ms: TAKE_MS });
  return found;
}

function cues(before, after) {
  return after.table.took ? [{ cue: "card", at: 0 }, { cue: "pick", at: FLIP_MS + HOLD_MS }] : [{ cue: "card", at: 0 }];
}

export const pairsView = { table: "pairs", layout, buttons, press, label, paint, flights, cues };
