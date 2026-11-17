import { drawAvatar, standIn } from "../../../kit/src/avatars/index.js";
import { centreOf, drawHome as drawHomeScreen, drawLooks as drawLooksScreen, drawPresent, homeLayout, looksLayout } from "../../../kit/src/canvas/index.js";
import { circle, fadeEdges, roundedRect } from "../../../kit/src/canvas/pen.js";
import { drawLobby } from "../../../kit/src/duel/lobby.js";
import { rimmed } from "./board.js";
import { drawEngine } from "./engine-art.js";
import { LOOKS, PROGRESS } from "./levels.js";
import { drawScenery, drawTrack } from "./scenery-art.js";
import { wagonOf } from "./train.js";
import { drawGap, drawWagon } from "./wagon-art.js";

const VARIANTS = ["levels", "make"];
const TABS = ["engine", "scenery"];
const YOURS = ["build", "solve", "watch"];

function miniTrain(ctx, area, theme, time) {
  const size = Math.min(area.w / 3.4, area.h * 0.5);
  const [x, y] = centreOf(area);
  drawWagon(ctx, x - size, y - size * 0.05, size, wagonOf(0), { time }, theme);
  drawGap(ctx, x, y - size * 0.05, size, { time }, theme);
  drawWagon(ctx, x + size, y - size * 0.05, size, wagonOf(0), { time }, theme);
}

function miniPalette(ctx, area, theme, time) {
  const size = Math.min(area.w, area.h) * 0.36;
  const [x, y] = centreOf(area);
  [1, 2, 5, 6].forEach((kind, at) => drawWagon(ctx, x + (at % 2 ? 0.55 : -0.55) * size, y + (at < 2 ? -0.62 : 0.5) * size, size, wagonOf(kind), { time }, theme));
}

function friendMark(ctx, area, player, theme, time) {
  const size = Math.min(area.w, area.h) * 0.3;
  const x = area.x + area.w - size * 0.55;
  const y = area.y + size * 0.55;
  circle(ctx, x, y, size / 2, theme.ui.accent, theme.ui.page, theme.ui.line);
  drawAvatar(ctx, x, y + size * 0.03, size * 0.62, { ...standIn(player), face: "happy", time });
}

function bandTrain(ctx, band, state, theme, time) {
  if (band.h < 70) return;
  const size = Math.min(band.h * 0.34, 64, state.width / 6.5);
  const [x, y] = centreOf(band);
  const base = y + size * 0.3;
  drawTrack(ctx, 0, base + size * 0.43, state.width, size / 72, theme);
  rimmed(ctx, theme, () => {
    drawEngine(ctx, x - size * 1.5, base - size * 0.06, size * 1.4, state.progress.chosen.engine, { pose: "puffing", time, pilot: state.player }, theme);
    [0, 1, 0].forEach((kind, at) => drawWagon(ctx, x - size * 0.25 + at * size, base, size, wagonOf(kind), { time }, theme));
  });
}

function homeStage(ctx, band, state, theme, time) {
  const horizon = band.h < 70 ? state.height * 0.43 : band.y + band.h / 2 + Math.min(band.h * 0.34, 64) * 0.2;
  drawScenery(ctx, { w: state.width, h: state.height }, state.progress.chosen.scenery, { horizon }, theme);
  fadeEdges(ctx, state.width, state.height, theme.ui.page);
  bandTrain(ctx, band, state, theme, time);
}

export function drawHome(ctx, state, seat, theme, time, duty = null) {
  const layout = homeLayout(state.width, state.height, { variants: VARIANTS, rival: Boolean(seat), fill: state.fill });
  const yours = YOURS.includes(duty);
  drawHomeScreen(ctx, state, theme.ui, time, {
    layout,
    seat,
    volume: state.layout?.volume,
    drawStage: (pen, band) => homeStage(pen, band, state, theme, time),
    drawVariant: (pen, target) =>
      rimmed(pen, theme, () => {
        if (target.value === "levels") miniTrain(pen, target, theme, time);
        else miniPalette(pen, target, theme, time);
        if (target.value === "make" && yours) friendMark(pen, target, state.player, theme, time);
      }),
  });
  const play = layout.targets.find((one) => one.kind === "play");
  if (state.wanting && seat && !seat.away && !yours) drawLobby(ctx, { play }, { waiting: true, invited: false }, theme.ui, time);
}

export function drawLookArt(ctx, area, kind, look, state, theme, time) {
  const [x, y] = centreOf(area);
  if (kind === "engine") {
    rimmed(ctx, theme, () => drawEngine(ctx, x + area.w * 0.02, y + area.h * 0.08, Math.min(area.w, area.h) * 0.66, look, { time, pilot: state.player }, theme));
    return;
  }
  ctx.save();
  roundedRect(ctx, area.x + 6, area.y + 6, area.w - 12, area.h - 12, theme.ui.radius - 4);
  ctx.clip();
  ctx.translate(area.x, area.y);
  ctx.scale(0.5, 0.5);
  drawScenery(ctx, { w: area.w * 2, h: area.h * 2 }, look, { horizon: area.h * 1.3 }, theme);
  ctx.restore();
}

function shakeOf(state, index, time) {
  const moment = state.moments.find((one) => one.kind === "shake" && one.index === index);
  return moment ? Math.min(1, Math.max(0, (time * 1000 - moment.start) / moment.duration)) : 0;
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
    drawLook: (pen, area, look, now) => drawLookArt(pen, area, kind, look, state, theme, now),
    drawTab: (pen, area, value) => drawLookArt(pen, { x: area.x + 8, y: area.y + 8, w: area.w - 16, h: area.h - 16 }, value, value === "engine" ? "steam" : "valley", { ...state, player: null }, theme, 0),
    drawWrapped: (pen, area, shake) => rimmed(pen, theme, () => drawPresent(pen, area, shake, theme.art.present)),
  });
}
