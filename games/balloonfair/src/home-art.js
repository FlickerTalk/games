import { standIn } from "../../../kit/src/avatars/index.js";
import { centreOf, drawHome as drawHomeScreen, drawLooks as drawLooksScreen, drawPresent } from "../../../kit/src/canvas/index.js";
import { clamp, fadeEdges, hash } from "../../../kit/src/canvas/pen.js";
import { drawLobby, lobbyOf } from "../../../kit/src/duel/lobby.js";
import { drawBalloon, rimmed } from "./balloons.js";
import { homeOf, looksOf } from "./game.js";
import { PROGRESS, SCENERIES } from "./levels.js";
import { drawScenery } from "./scenery.js";
import { drawToy } from "./toys.js";

const FLICK = Object.freeze({ who: "flick" });
const FLOATING = ["round", "oval", "star", "small", "big", "oval"];
const CROSSING_SECONDS = 22;

export function drawFair(ctx, state, theme, time) {
  const { width, height } = state;
  drawScenery(ctx, { x: 0, y: 0, w: width, h: height }, state.progress.chosen, theme, time);
  const unit = Math.min(width, height, 420);
  FLOATING.forEach((kind, at) => {
    const phase = time / CROSSING_SECONDS + at / FLOATING.length + hash(at) * 0.1;
    const x = width * (0.1 + 0.8 * hash(at + 7 + Math.floor(phase)));
    drawBalloon(ctx, x, height * (1.15 - (phase % 1) * 1.3), unit * (kind === "small" ? 0.11 : kind === "big" ? 0.22 : 0.16), kind, theme, { time: time + at });
  });
  fadeEdges(ctx, width, height, theme.ui.page);
}

function drawVariant(ctx, target, theme) {
  const [x, y] = centreOf(target);
  drawToy(ctx, target.value, x, y + target.h * 0.02, Math.min(target.w, target.h) * 0.66, theme, { pull: 0.3, tank: 0.85 });
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
  drawHomeScreen(ctx, { ...state, variant: state.tool }, theme.ui, time, {
    layout,
    seat: seatOf(game),
    volume: state.layout?.volume,
    drawStage: (pen) => drawFair(pen, state, theme, time),
    drawVariant: (pen, target) => drawVariant(pen, target, theme),
  });
  const at = (kind) => layout.targets.find((one) => one.kind === kind);
  drawLobby(ctx, { play: at("play"), rival: at("rival") }, lobbyOf(game.duel?.status), theme.ui, time);
}

export function drawLookArt(ctx, area, look, theme, time) {
  const inset = Math.max(8, area.w * 0.1);
  drawScenery(ctx, { x: area.x + inset, y: area.y + inset, w: area.w - 2 * inset, h: area.h - 2 * inset }, look, theme, time);
}

export const drawWrapped = (ctx, area, shake, theme) => rimmed(ctx, theme, () => drawPresent(ctx, area, shake, theme.art.gift));

function shakeOf(state, index, time) {
  const moment = state.moments.find((one) => one.kind === "shake" && one.index === index);
  return moment ? clamp((time * 1000 - moment.start) / moment.duration) : 0;
}

export function drawLooks(ctx, state, theme, time) {
  drawLooksScreen(ctx, state, theme.ui, time, {
    layout: looksOf(state),
    kind: "scenery",
    looks: SCENERIES,
    owned: PROGRESS.owned(state.progress),
    chosen: state.progress.chosen,
    shake: (index) => shakeOf(state, index, time),
    drawLook: (pen, area, look, now) => drawLookArt(pen, area, look, theme, now),
    drawTab: () => {},
    drawWrapped: (pen, area, shake) => drawWrapped(pen, area, shake, theme),
  });
}
