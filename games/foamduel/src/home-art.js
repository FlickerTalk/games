import { drawAvatar, standIn } from "../../../kit/src/avatars/index.js";
import { centreOf, drawHome as drawHomeScreen, drawLooks as drawLooksScreen, drawPresent } from "../../../kit/src/canvas/index.js";
import { clamp, fadeEdges } from "../../../kit/src/canvas/pen.js";
import { drawFriendLeft } from "../../../kit/src/duel/left.js";
import { drawLobby, lobbyOf } from "../../../kit/src/duel/lobby.js";
import { homeOf, looksOf } from "./game.js";
import { drawHelmetBalloon, drawKnight, drawSword, rimmed } from "./knights.js";
import { FLICK_SWORD, LOOKS, PROGRESS, otherSword } from "./levels.js";
import { drawGroundShade, drawScenery } from "./scenery.js";

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

// the tallest band of the home screen that no button uses
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

function drawStage(ctx, state, band, theme, time) {
  const { width, height, progress, player, mode } = state;
  const { sword, scenery } = progress.chosen;
  const size = Math.min(band.h / 1.75, band.w * 0.3, 120);
  const standing = size >= 56;
  const ground = standing ? band.y + band.h - 6 : height * 0.7;
  drawScenery(ctx, { x: 0, y: 0, w: width, h: height }, scenery, theme, time, { horizon: ground - size * 0.16 });
  fadeEdges(ctx, width, height, theme.ui.page);
  if (!standing) return;
  const middle = band.x + band.w / 2;
  const pair = [
    { x: middle - size * 0.75, player, sword, flip: false, side: "mine" },
    { x: middle + size * 0.75, player: mode === "flick" ? FLICK : standIn(player), sword: mode === "flick" ? FLICK_SWORD : otherSword(sword), flip: true, side: "theirs" },
  ];
  rimmed(ctx, theme, () => {
    for (const { x, ...knight } of pair) {
      drawGroundShade(ctx, x, ground, size, scenery, theme);
      drawKnight(ctx, x, ground, size, { ...knight, pose: "ready", progress: 0, balloon: 1 }, theme, time);
    }
  });
}

function drawVariant(ctx, target, state, theme, time) {
  const [x, y] = centreOf(target);
  const size = Math.min(target.w, target.h);
  if (target.value === "flick") {
    drawAvatar(ctx, x - size * 0.1, y + size * 0.06, size * 0.46, { who: "flick", face: "happy", time });
    rimmed(ctx, theme, () => drawSword(ctx, x + size * 0.26, y + size * 0.26, size * 0.5, FLICK_SWORD, 0.3, theme));
    return;
  }
  rimmed(ctx, theme, () => {
    drawHelmetBalloon(ctx, x - size * 0.19, y, size * 0.36, "mine", theme, { time });
    drawHelmetBalloon(ctx, x + size * 0.19, y, size * 0.36, "theirs", theme, { time: time + 1 });
  });
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
  const layout = homeOf(state);
  drawHomeScreen(ctx, { ...state, variant: state.mode === "alone" ? state.variant : null }, theme.ui, time, {
    layout,
    seat: seatOf(game),
    volume: state.layout?.volume,
    drawStage: (pen) => drawStage(pen, state, stageArea(state, layout.targets), theme, time),
    drawVariant: (pen, target) => drawVariant(pen, target, state, theme, time),
  });
  const at = (kind) => layout.targets.find((one) => one.kind === kind);
  drawLobby(ctx, { play: at("play"), rival: at("rival") }, lobbyOf(game.duel?.status), theme.ui, time);
  drawFriendLeft(ctx, at("rival"), game.duel?.status, theme.ui);
}

export function drawLookArt(ctx, area, kind, look, theme, time) {
  const inset = Math.max(8, area.w * 0.1);
  if (kind === "scenery") {
    drawScenery(ctx, { x: area.x + inset, y: area.y + inset, w: area.w - 2 * inset, h: area.h - 2 * inset }, look, theme, time);
    return;
  }
  const [x, y] = centreOf(area);
  const length = Math.min(area.w, area.h) * 0.62;
  rimmed(ctx, theme, () => drawSword(ctx, x - length * 0.2, y + length * 0.36, length, look, 0.5, theme));
}

export const drawWrapped = (ctx, area, shake, theme) => rimmed(ctx, theme, () => drawPresent(ctx, area, shake, theme.art.gift));

function shakeOf(state, index, time) {
  const moment = state.moments.find((one) => one.kind === "shake" && one.index === index);
  return moment ? clamp((time * 1000 - moment.start) / moment.duration) : 0;
}

export function drawLooks(ctx, state, theme, time) {
  const kind = state.looks;
  drawLooksScreen(ctx, state, theme.ui, time, {
    layout: looksOf(state),
    kind,
    looks: LOOKS[kind],
    owned: PROGRESS.owned(state.progress),
    chosen: state.progress.chosen[kind],
    shake: (index) => shakeOf(state, index, time),
    drawLook: (pen, area, look, now) => drawLookArt(pen, area, kind, look, theme, now),
    drawTab: (pen, area, value) => drawLookArt(pen, { x: area.x + 6, y: area.y + 6, w: area.w - 12, h: area.h - 12 }, value, LOOKS[value][0], theme, time),
    drawWrapped: (pen, area, shake) => drawWrapped(pen, area, shake, theme),
  });
}
