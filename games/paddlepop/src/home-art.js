import { drawAvatar, standIn } from "../../../kit/src/avatars/index.js";
import { centreOf, drawHome as drawHomeScreen, drawLooks as drawLooksScreen, homeLayout, looksLayout } from "../../../kit/src/canvas/index.js";
import { clamp } from "../../../kit/src/canvas/pen.js";
import { VARIANTS } from "./game.js";
import { FLICK_PADDLE, LOOKS, PROGRESS } from "./levels.js";
import { drawPaddle, drawWrappedPaddle } from "./paddles.js";
import { TABLE } from "./table.js";
import { drawTable, drawTableIcon } from "./tables.js";
import { drawBall } from "./things.js";

const L = TABLE.length;
const FLICK = Object.freeze({ who: "flick" });
const TABS = Object.keys(LOOKS);
const SOUND = ["speaker", "music", "volume"];

function rowsOf(targets) {
  const rows = [];
  for (const { y, h } of [...targets].sort((one, two) => one.y - two.y)) {
    const last = rows.at(-1);
    if (last && y <= last.bottom) last.bottom = Math.max(last.bottom, y + h);
    else rows.push({ top: y, bottom: y + h });
  }
  return rows;
}

export function stageArea(state, targets) {
  const sound = targets.filter((one) => SOUND.includes(one.kind));
  const start = Math.max(8, ...sound.map((one) => one.y + one.h)) + 8;
  const rows = rowsOf(targets.filter((one) => !SOUND.includes(one.kind)));
  let best = { top: start, bottom: rows[0]?.top ?? state.height };
  rows.forEach((row, at) => {
    const bottom = rows[at + 1]?.top ?? row.bottom;
    if (bottom - row.bottom > best.bottom - best.top) best = { top: row.bottom, bottom };
  });
  return { x: 16, y: best.top + 8, w: state.width - 32, h: Math.max(0, best.bottom - best.top - 16) };
}

export function drawStage(ctx, state, band, theme, time) {
  const s = Math.min(band.h - 24, (band.w - 48) / L, 220);
  if (s < 60) return;
  const mine = state.progress.chosen.paddle;
  const rival = state.mode === "flick" ? FLICK_PADDLE : mine;
  ctx.save();
  ctx.translate(band.x + (band.w + L * s) / 2, band.y + (band.h - s) / 2);
  ctx.rotate(Math.PI / 2);
  drawTable(ctx, { x: 0, y: 0, w: s, h: L * s }, state.progress.chosen.table, theme, time);
  const swing = Math.sin(time * 1.1);
  const ball = { u: 0.5 + Math.sin(time * 1.7) * 0.25, v: L / 2 + swing * L * 0.3 };
  drawPaddle(ctx, rival, (0.5 + Math.sin(time * 1.7 - 0.6) * 0.18) * s, TABLE.inset * s, 0.43 * s, theme, { time, rotation: Math.PI });
  drawPaddle(ctx, mine, (0.5 + Math.sin(time * 1.7 + 0.6) * 0.18) * s, (L - TABLE.inset) * s, 0.43 * s, theme, { time });
  drawBall(ctx, ball.u * s, ball.v * s, TABLE.radius * s, theme, { time, angle: Math.cos(time * 1.1) > 0 ? Math.PI / 2 : -Math.PI / 2 });
  ctx.restore();
}

function drawVariant(ctx, target, state, theme, time) {
  const [x, y] = centreOf(target);
  const size = Math.min(target.w, target.h);
  const mine = state.progress.chosen.paddle;
  if (target.value === "flick") {
    drawAvatar(ctx, x, y - size * 0.1, size * 0.42, { who: "flick", face: "happy", time });
    drawPaddle(ctx, FLICK_PADDLE, x, y + size * 0.26, size * 0.5, theme, { time });
    return;
  }
  drawPaddle(ctx, mine, x, y - size * 0.22, size * 0.5, theme, { time, rotation: Math.PI });
  drawBall(ctx, x, y, size * 0.07, theme, { time, trail: false });
  drawPaddle(ctx, mine, x, y + size * 0.22, size * 0.5, theme, { time: time + 1 });
}

function seatOf(game) {
  const { state, duel } = game;
  if (state.mode === "flick") return { player: FLICK, here: true, calling: false, away: false };
  if (state.mode !== "friend" || !duel) return null;
  const { here, calling, away } = duel.status;
  return { player: standIn(state.player), here, calling, away };
}

export function drawHome(ctx, game, theme, time) {
  const { state } = game;
  const seat = seatOf(game);
  const layout = homeLayout(state.width, state.height, { variants: state.mode === "alone" ? VARIANTS : [], rival: Boolean(seat), fill: state.fill });
  const shown = { ...state, variant: state.mode === "alone" ? state.variant : null };
  drawHomeScreen(ctx, shown, theme.ui, time, {
    layout,
    seat,
    volume: state.layout?.volume,
    drawStage: (pen) => drawStage(pen, state, stageArea(state, layout.targets), theme, time),
    drawVariant: (pen, target) => drawVariant(pen, target, state, theme, time),
  });
}

export function drawLookArt(ctx, area, kind, look, theme, time) {
  const [x, y] = centreOf(area);
  if (kind === "table") drawTableIcon(ctx, look, area, theme, time);
  else drawPaddle(ctx, look, x, y, area.w * 0.74, theme, { time });
}

function shakeOf(state, index, time) {
  const moment = state.moments.find((one) => one.kind === "shake" && one.index === index);
  return moment ? clamp((time * 1000 - moment.start) / moment.duration) : 0;
}

function drawWrapped(ctx, area, shake, theme, time) {
  const [x, y] = centreOf(area);
  ctx.save();
  ctx.translate(x, y + area.h * 0.4);
  ctx.rotate(Math.sin(shake * Math.PI * 4) * 0.12 * (1 - shake));
  drawWrappedPaddle(ctx, "caterpillar", 0, -area.h * 0.4, Math.min(area.w, area.h) * 0.95, theme, time);
  ctx.restore();
}

export function drawLooks(ctx, state, theme, time) {
  const kind = state.looks;
  const looks = LOOKS[kind];
  drawLooksScreen(ctx, state, theme.ui, time, {
    layout: looksLayout(state.width, state.height, { kind, count: looks.length, fill: state.fill, tabs: TABS }),
    kind,
    looks,
    owned: PROGRESS.owned(state.progress),
    chosen: state.progress.chosen[kind],
    shake: (index) => shakeOf(state, index, time),
    drawLook: (pen, area, look, now) => drawLookArt(pen, area, kind, look, theme, now),
    drawTab: (pen, area, value) => drawLookArt(pen, { x: area.x + 8, y: area.y + 8, w: area.w - 16, h: area.h - 16 }, value, LOOKS[value][0], theme, time),
    drawWrapped: (pen, area, shake) => drawWrapped(pen, area, shake, theme, time),
  });
}
