import { CORNER, GAP, box, grid, row, span, target } from "./layout.js";

const PAD = 12;
const TILE = 88;
const BIG = 120;

function soundTargets(width, height) {
  const size = height < 420 ? 48 : 56;
  return [target("speaker", "speaker", box(width - 8 - 2 * size, 8, size, size)), target("music", "music", box(width - 8 - size, 8, size, size))];
}

function tallHome(width, height, { variants, rival, fill }) {
  const bottom = height - (fill ? CORNER : PAD);
  const people = [["avatar", "avatar"], ...(rival ? [["rival", "rival"]] : []), ["looks", "looks"]];
  const columns = Math.max(1, Math.min(variants.length, Math.floor((width - 2 * PAD + GAP) / (TILE + GAP))));
  const rows = Math.ceil(variants.length / columns);
  const top = 8 + 56 + PAD;
  const content = TILE + span(rows, TILE) + BIG;
  const gap = Math.max(GAP, (bottom - top - content) / 4);
  const first = top + gap;
  const second = first + TILE + gap;
  const third = second + span(rows, TILE) + gap;
  return [
    ...row(people, (width - span(people.length, TILE, 16)) / 2, first, TILE, 16),
    ...grid(variants.map((id) => ["variant", id]), (width - span(columns, TILE)) / 2, second, columns, TILE),
    target("play", "play", box((width - BIG) / 2, third, BIG, BIG)),
  ];
}

function wideHome(width, height, { variants, rival, fill }) {
  const bottom = height - (fill ? CORNER : PAD);
  const top = 8 + TILE + GAP;
  const columns = Math.max(1, Math.ceil(variants.length / Math.max(1, Math.floor((bottom - top + GAP) / (TILE + GAP)))));
  const gridWidth = span(columns, TILE);
  const beside = rival && PAD + gridWidth + 2 * GAP + BIG + GAP + TILE <= width - PAD;
  const block = gridWidth + 2 * GAP + BIG + (beside ? TILE + GAP : 0);
  const left = Math.max(4, (width - block) / 2);
  const playX = Math.min(left + gridWidth + 2 * GAP, width - 4 - BIG - (beside ? TILE + GAP : 0));
  const tall = rival && !beside ? BIG + GAP + TILE : BIG;
  const middle = top + Math.max(0, (bottom - top - tall) / 2);
  const seat = beside ? box(playX + BIG + GAP, middle + (BIG - TILE) / 2, TILE, TILE) : box(playX + (BIG - TILE) / 2, middle + BIG + GAP, TILE, TILE);
  return [
    ...row([["avatar", "avatar"], ["looks", "looks"]], PAD, 8, TILE),
    ...grid(variants.map((id) => ["variant", id]), left, top, columns, TILE),
    target("play", "play", box(playX, middle, BIG, BIG)),
    ...(rival ? [target("rival", "rival", seat)] : []),
  ];
}

export function homeLayout(width, height, options) {
  const tall = height >= 520 && height >= width * 0.9;
  return { width, height, targets: [...soundTargets(width, height), ...(tall ? tallHome(width, height, options) : wideHome(width, height, options))] };
}

export function endLayout(width, height, { gift = false, fill = false } = {}) {
  const sound = soundTargets(width, height);
  const top = sound[0].y + sound[0].h + GAP;
  const bottom = height - (fill ? CORNER : PAD);
  const wide = width > height * 1.2;
  const card = wide ? box(PAD, top, width - 2 * PAD, bottom - top) : box(Math.max(PAD, (width - 360) / 2), top, Math.min(width - 2 * PAD, 360), bottom - top);
  const again = wide ? box(card.x + card.w - BIG - 2 * PAD, card.y + (card.h - BIG) / 2, BIG, BIG) : box(card.x + (card.w - BIG) / 2, card.y + card.h - BIG - PAD, BIG, BIG);
  const home = box(card.x + PAD, card.y + PAD, TILE, TILE);
  const present = wide ? box(again.x - TILE - 2 * PAD, card.y + (card.h - TILE) / 2, TILE, TILE) : box(card.x + card.w - TILE - PAD, card.y + PAD, TILE, TILE);
  const targets = [...sound, target("home", "home", home), target("again", "again", again), ...(gift ? [target("gift", "gift", present)] : [])];
  return { width, height, card, targets };
}

export function looksLayout(width, height, { kind, count, fill = false }) {
  const bottom = height - (fill ? CORNER : PAD);
  const header = row([["done", "done"], ["tab", "court"], ["tab", "effect"]], PAD, 8, TILE);
  const top = 8 + TILE + PAD;
  const room = Math.max(TILE, Math.min((width - 2 * PAD + GAP) / 3, (bottom - top + GAP) / 2) - GAP);
  const size = Math.floor(Math.min(140, Math.max(TILE, room)));
  const columns = Math.max(1, Math.min(count, Math.floor((width - 2 * PAD + GAP) / (size + GAP))));
  const left = (width - span(columns, size)) / 2;
  const looks = Array.from({ length: count }, (_, at) => ["look", at]);
  return { width, height, kind, targets: [...header, ...grid(looks, left, top, columns, size)] };
}

export function pauseLayout(width, height, { fill = false } = {}) {
  const middle = Math.min((height - BIG) / 2, height - (fill ? CORNER : PAD) - BIG);
  const left = (width - (BIG + 16 + TILE)) / 2;
  return { width, height, targets: [target("home", "home", box(left, middle + (BIG - TILE) / 2, TILE, TILE)), target("resume", "resume", box(left + TILE + 16, middle, BIG, BIG))] };
}

export function promptLayout(width, height, { fill = false } = {}) {
  const card = box((width - Math.min(width - 2 * PAD, 300)) / 2, Math.max(8, (height - 200) / 2), Math.min(width - 2 * PAD, 300), Math.min(200, height - (fill ? CORNER : PAD) - 8));
  const y = card.y + card.h - TILE - PAD;
  return {
    width,
    height,
    card,
    targets: [target("dismiss", "dismiss", box(card.x + PAD, y, TILE, TILE)), target("accept", "accept", box(card.x + card.w - TILE - PAD, y, TILE, TILE))],
  };
}
