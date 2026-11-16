import { CARD_RATIO } from "../../../kit/src/cards/faces.js";
import { fractionOf } from "../../../kit/src/tabletop/grid.js";
import { card } from "./card.js";
import { drawAction, drawBracket, drawBubble, drawCount, drawFish, drawGlow, drawShade, drawTile } from "./marks.js";
import { SIZES } from "./pairs.js";
import { chooseText } from "./rules.js";
import { backAt, faceAt, frameOf } from "./table.js";

const GAMES = ["pairs", "war", "rummy", "fish"];
const COLUMNS = { 16: 4, 24: 6 };

function layout(size) {
  const frame = frameOf(size);
  const { inner } = frame;
  const W = inner.w;
  const [pad, gap] = [W * 0.045, W * 0.04];
  const side = (W - 2 * pad - gap) / 2;
  const tiles = GAMES.map((game, at) => ({ game, box: { x: inner.x + pad + (at % 2) * (side + gap), y: inner.y + pad + Math.floor(at / 2) * (side + gap), w: side, h: side } }));
  const r = Math.max(24, W * 0.08);
  return { size, frame, inner, tiles, back: { x: tiles[1].box.x + side / 2, y: tiles[1].box.y + side / 2, r }, sizes: SIZES.map((count, at) => ({ count, box: tiles[2 + at].box })) };
}

function buttons({ state, local, layout: at, size, t, canPlay }) {
  const open = canPlay && state.phase === "choose";
  if (open && local.sizing) {
    const { x, y, r } = at.back;
    return [
      { key: "games", box: fractionOf({ x: x - r, y: y - r, w: r * 2, h: r * 2 }, size), label: t("otherGames"), disabled: false, data: {} },
      ...at.sizes.map(({ count, box }) => ({ key: `p${count}`, box: fractionOf(box, size), label: t("pairsOf", { n: count }), disabled: false, data: { cards: count } })),
    ];
  }
  return at.tiles.map(({ game, box }) => ({ key: game, box: fractionOf(box, size), label: t(game), disabled: !open, data: { game, mark: state.game === game ? "chosen" : null } }));
}

function press(key, { state, local, canPlay, ctx, wake }) {
  if (!canPlay || state.phase !== "choose") return;
  if (key === "pairs" || key === "games") {
    local.sizing = key === "pairs";
    wake();
  } else if (GAMES.includes(key)) ctx.play(chooseText(key));
  else if (local.sizing && SIZES.includes(Number(key.slice(1)))) ctx.play(chooseText("pairs", Number(key.slice(1))));
}

function label({ state, canPlay, t }) {
  if (state.phase === "shuffle") return `${t("name")}, ${t(state.game)}: ${t("shuffling")}`;
  return `${t("name")}: ${t(canPlay ? "pickGame" : "theyPick")}`;
}

function tilted(ctx, box, angle, paintAt) {
  ctx.save();
  ctx.translate(box.x + box.w / 2, box.y + box.h / 2);
  ctx.rotate(angle);
  paintAt({ x: -box.w / 2, y: -box.h / 2, w: box.w, h: box.h });
  ctx.restore();
}

const PICTURES = {
  pairs(ctx, theme, { x, y, w }, face) {
    face(card(1, 6), x - w * 0.6, y, -0.08);
    face(card(2, 6), x + w * 0.6, y, 0.08);
    drawBracket(ctx, theme.ui.accent, x - w * 1.1, y + w * 0.95, w * 2.2, -w * 0.12);
  },
  war(ctx, theme, { x, y, w }, face, back) {
    back(x - w * 1.05, y + w * 0.1, -0.08);
    back(x + w * 1.05, y + w * 0.1, 0.08);
    face(card(0, 11), x - w * 0.36, y - w * 0.12, -0.16);
    const king = face(card(1, 12), x + w * 0.36, y - w * 0.12, 0.16);
    tilted(ctx, king, 0.16, (local) => drawGlow(ctx, theme, local, { chosen: true }));
  },
  rummy(ctx, theme, { x, y, w }, face) {
    [1, 2, 3].forEach((rank, at) => face(card(1, rank), x + (at - 1) * w * 0.62, y + Math.abs(at - 1) * w * 0.05, (at - 1) * 0.08));
    drawBracket(ctx, theme.ui.accent, x - w * 1.12, y + w * 0.98, w * 2.24, -w * 0.12);
  },
  fish(ctx, theme, { x, y, w }, face) {
    face(card(1, 11), x - w * 0.7, y + w * 0.12, -0.1);
    drawBubble(ctx, theme, 11, x + w * 0.55, y - w * 0.5, w * 0.95, { tail: 1 });
    drawFish(ctx, theme, x + w * 0.75, y + w * 0.75, w * 1.1);
  },
};

function picture(ctx, theme, game, box, { ratio, sprites }) {
  const w = box.w * 0.27;
  const h = w * CARD_RATIO;
  const at = (x, y) => ({ x: x - w / 2, y: y - h / 2, w, h });
  const face = (one, x, y, angle) => {
    tilted(ctx, at(x, y), angle, (local) => faceAt(ctx, theme, sprites, one, local, ratio));
    return at(x, y);
  };
  const back = (x, y, angle) => tilted(ctx, at(x, y), angle, (local) => backAt(ctx, theme, sprites, local, ratio));
  PICTURES[game](ctx, theme, { x: box.x + box.w / 2, y: box.y + box.h * 0.47, w }, face, back);
}

function grid(ctx, theme, count, box, { ratio, sprites }) {
  const columns = COLUMNS[count];
  const rows = count / columns;
  const gap = box.w * 0.02;
  const w = Math.min((box.w * 0.84 - (columns - 1) * gap) / columns, (box.h * 0.62 - (rows - 1) * gap) / (rows * CARD_RATIO));
  const h = w * CARD_RATIO;
  const left = box.x + (box.w - columns * w - (columns - 1) * gap) / 2;
  const top = box.y + box.h * 0.08;
  for (let at = 0; at < count; at += 1) backAt(ctx, theme, sprites, { x: left + (at % columns) * (w + gap), y: top + Math.floor(at / columns) * (h + gap), w, h }, ratio);
  const badge = Math.max(22, box.h * 0.16);
  drawCount(ctx, theme, count, box.x + box.w / 2 - badge * 0.75, box.y + box.h - badge * 0.85, badge);
}

function paint(ctx, theme, seen) {
  const { state, local, layout: at, canPlay } = seen;
  const open = canPlay && state.phase === "choose";
  if (open && local.sizing) {
    drawTile(ctx, theme, at.tiles[0].box, { chosen: true });
    picture(ctx, theme, "pairs", at.tiles[0].box, seen);
    drawAction(ctx, theme, "back", at.back.x, at.back.y, at.back.r);
    for (const { count, box } of at.sizes) {
      drawTile(ctx, theme, box);
      grid(ctx, theme, count, box, seen);
    }
    return;
  }
  for (const { game, box } of at.tiles) {
    drawTile(ctx, theme, box, { chosen: state.game === game });
    picture(ctx, theme, game, box, seen);
    if (!open && state.game !== game) drawShade(ctx, theme, box);
  }
}

export const chooser = { table: "choose", layout, buttons, press, label, paint, flights: () => [], cues: () => [] };
