import { drawAvatar, standIn } from "../../../kit/src/avatars/index.js";
import { centreOf, drawHome as drawHomeScreen, drawLooks as drawLooksScreen, drawPresent, homeLayout, looksLayout } from "../../../kit/src/canvas/index.js";
import { clamp, roundedRect } from "../../../kit/src/canvas/pen.js";
import { drawLobby } from "../../../kit/src/duel/lobby.js";
import { drawBall } from "./ball.js";
import { peopleOf } from "./board.js";
import { VARIANTS } from "./game.js";
import { drawGoal } from "./goal.js";
import { GOAL_RATIO } from "./kicks.js";
import { LOOKS, PROGRESS } from "./levels.js";
import { drawKeeper, drawShooter } from "./players.js";
import { drawField, rimmed } from "./scene.js";

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

function miniPitch(ctx, area, field, theme, time) {
  const tall = Math.min(area.h * 0.52, (area.w * 0.6) / GOAL_RATIO);
  const goal = { x: area.x + (area.w - tall * GOAL_RATIO) / 2, y: area.y + area.h * 0.14, w: tall * GOAL_RATIO, h: tall };
  ctx.save();
  roundedRect(ctx, area.x, area.y, area.w, area.h, theme.ui.radius);
  ctx.clip();
  drawField(ctx, area, field, theme, { time, horizon: goal.y + goal.h / 2 - 20 * clamp(tall / 120), top: area.y });
  ctx.restore();
  rimmed(ctx, theme, () => drawGoal(ctx, goal, theme));
  return goal;
}

export function drawStage(ctx, game, band, theme, time) {
  if (band.h < 70 || band.w < 120) return;
  const { state } = game;
  const [me, rival] = peopleOf(game);
  const goal = miniPitch(ctx, band, state.progress.chosen.field, theme, time);
  const size = goal.h * 0.72;
  const ball = { x: band.x + band.w / 2, y: Math.min(band.y + band.h - 14, goal.y + goal.h + (band.y + band.h - goal.y - goal.h) * 0.6) };
  rimmed(ctx, theme, () => {
    drawKeeper(ctx, { x: goal.x + goal.w / 2, y: goal.y + goal.h * 0.68, size }, rival, theme, { pose: "ready", time });
    if (band.w >= 260) drawShooter(ctx, { x: ball.x - goal.w * 0.42, y: band.y + band.h - size * 0.6, size }, me, "ready", theme, time);
    drawBall(ctx, ball.x, ball.y - Math.abs(Math.sin(time * 2.2)) * 6, clamp(goal.h * 0.26, 16, 34), state.progress.chosen.ball, theme);
  });
}

function drawVariant(ctx, target, state, theme, time) {
  const [x, y] = centreOf(target);
  const size = Math.min(target.w, target.h);
  const faces = target.value === "flick" ? [FLICK] : [state.player, standIn(state.player)];
  faces.forEach((player, at) => drawAvatar(ctx, x + (at - (faces.length - 1) / 2) * size * 0.4, y - size * 0.1, size * (faces.length > 1 ? 0.36 : 0.44), { ...player, face: "happy", time }));
  rimmed(ctx, theme, () => drawBall(ctx, x, y + size * 0.28, size * 0.22, state.progress.chosen.ball, theme));
}

function seatOf(game) {
  const { state, friend } = game;
  if (state.mode === "flick") return { player: FLICK, here: true, calling: false, away: false };
  if (state.mode !== "friend" || !friend) return null;
  const { here, calling, away } = friend.status;
  return { player: standIn(state.player), here, calling, away };
}

export function drawHome(ctx, game, theme, time) {
  const { state, friend } = game;
  const seat = seatOf(game);
  const layout = homeLayout(state.width, state.height, { variants: state.mode === "alone" ? VARIANTS : [], rival: Boolean(seat), fill: state.fill });
  drawHomeScreen(ctx, { ...state, variant: state.mode === "alone" ? state.variant : null }, theme.ui, time, {
    layout,
    seat,
    volume: state.layout?.volume,
    drawStage: (pen) => drawStage(pen, game, stageArea(state, layout.targets), theme, time),
    drawVariant: (pen, target) => drawVariant(pen, target, state, theme, time),
  });
  const at = (kind) => layout.targets.find((one) => one.kind === kind);
  const status = friend?.status;
  drawLobby(ctx, { play: at("play"), rival: at("rival") }, { waiting: Boolean(status?.waiting && !status.away), invited: Boolean(status?.invited) }, theme.ui, time);
}

export function drawLookArt(ctx, area, kind, look, theme, time) {
  const [x, y] = centreOf(area);
  if (kind === "ball") return rimmed(ctx, theme, () => drawBall(ctx, x, y, area.w * 0.52, look, theme, { rotation: Math.sin(time) * 0.3 }));
  return void miniPitch(ctx, { x: area.x + 10, y: area.y + 10, w: area.w - 20, h: area.h - 20 }, look, theme, time);
}

function shakeOf(state, index, time) {
  const moment = state.moments.find((one) => one.kind === "shake" && one.index === index);
  return moment ? clamp((time * 1000 - moment.start) / moment.duration) : 0;
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
    drawWrapped: (pen, area, shake) => rimmed(pen, theme, () => drawPresent(pen, area, shake, theme.art.gift)),
  });
}
