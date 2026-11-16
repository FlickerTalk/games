import { FLICK, standIn } from "../../../kit/src/avatars/index.js";
import { drawCard, drawHintHand, drawPause, pauseLayout } from "../../../kit/src/canvas/index.js";
import { clamp, ease, fadeEdges, mix, paint, roundedRect, withRim } from "../../../kit/src/canvas/pen.js";
import { drawBar } from "./bar-art.js";
import { drawBurst, drawNotePop, drawPuff } from "./effects-art.js";
import { drawEngine } from "./engine-art.js";
import { TRAINS } from "./levels.js";
import { BURST_MS, popsNow, trainShift, tuneNow } from "./playing.js";
import { BACK_MS, FLY_MS, WOBBLE_MS } from "./rounds.js";
import { drawScenery, drawTrack } from "./scenery-art.js";
import { drawGap, drawWagon } from "./wagon-art.js";

const HINT_LOOP = 1.8;
const FRIEND_ENGINE = "teapot";
const FLICK_ENGINE = "rocket";

export const rimmed = (ctx, theme, draw) => withRim(ctx, { ink: theme.art.ink, colour: theme.art.rim }, draw);

export function drawStage(ctx, state, theme, horizon) {
  drawScenery(ctx, { w: state.width, h: state.height }, state.progress.chosen.scenery, { horizon }, theme);
  fadeEdges(ctx, state.width, state.height, theme.ui.page);
}

export function driverOf(state) {
  const { round, player } = state;
  if (round?.driver === "flick") return { look: FLICK_ENGINE, pilot: { who: FLICK.id } };
  if (round?.driver === "friend") return { look: FRIEND_ENGINE, pilot: standIn(player) };
  return { look: state.progress.chosen.engine, pilot: player };
}

export function rivalOf(state) {
  const { round, mode, player } = state;
  const busy = Boolean(round?.script) && round.phase === "solve";
  if (round?.driver === "flick" || round?.maker === "flick" || mode === "flick") return { player: { who: FLICK.id }, thinking: busy };
  if (round?.driver === "friend" || round?.maker === "friend" || mode === "friend") return { player: standIn(player), thinking: busy };
  return null;
}

export const horizonOf = (train) => train.y - train.size * 0.1;

export function drawRails(ctx, state, train, theme) {
  drawTrack(ctx, 0, train.y + train.size * 0.43, state.width, train.size / 72, theme);
}

export function sidingWagon(cell) {
  return { x: cell.x + cell.w / 2, y: cell.y + cell.h * 0.52, size: Math.min(66, cell.w * 0.62) };
}

function wagonsOf(ctx, round, train, shift, tune, hint, theme, time) {
  round.puzzle.placed.forEach((wagon, at) => {
    const x = train.xs[at] + shift;
    if (wagon === null) drawGap(ctx, x, train.y, train.size, { time, hint: hint?.shape && hint.gap === at ? round.puzzle.train.wagons[at] : null }, theme);
    else drawWagon(ctx, x, train.y, train.size, wagon, { time, hop: tune?.index === at ? tune.within : 0 }, theme);
  });
}

function movingWagons(ctx, state, theme, now) {
  const { round, layout, drag } = state;
  const { train, cells } = layout;
  const time = now / 1000;
  if (round.flying) {
    const { wagon, index, gap, start, from } = round.flying;
    const origin = from ?? sidingWagon(cells[index]);
    const t = ease(clamp((now - start) / FLY_MS));
    drawWagon(ctx, mix(origin.x, train.xs[gap], t), mix(origin.y, train.y, t) - Math.sin(t * Math.PI) * train.size * 0.4, train.size, wagon, { time }, theme);
  }
  if (round.back) {
    const { wagon, index, gap, start } = round.back;
    const home = sidingWagon(cells[index]);
    const t = ease(clamp((now - start - WOBBLE_MS) / BACK_MS));
    drawWagon(ctx, mix(train.xs[gap], home.x, t), mix(train.y, home.y, t), mix(train.size, home.size, t), wagon, { time, wobble: 1 - t }, theme);
  }
  if (drag?.moved) drawWagon(ctx, drag.x, drag.y - train.size * 0.5, train.size, round.candidates[drag.index], { time }, theme);
}

function siding(ctx, state, theme, time) {
  const { round, layout, press, drag } = state;
  const { ui } = theme;
  const { siding: area, cells } = layout;
  const away = [round.flying?.index, round.back?.index, drag?.moved ? drag.index : undefined];
  roundedRect(ctx, area.x + 1, area.y + 1, area.w - 2, area.h - 2, ui.radius);
  paint(ctx, ui.surface, ui.border, ui.line);
  ctx.save();
  if (round.driver !== "me" || round.phase !== "solve") ctx.globalAlpha = 0.5;
  cells.forEach((cell, at) => {
    drawCard(ctx, cell, ui, { pressed: Boolean(press && press.kind === "candidate" && press.value === at) });
    if (away.includes(at)) return;
    const { x, y, size } = sidingWagon(cell);
    rimmed(ctx, theme, () => drawWagon(ctx, x, y, size, round.candidates[at], { time }, theme));
  });
  ctx.restore();
}

function effects(ctx, state, theme, now, shift) {
  const { round, layout } = state;
  const { train } = layout;
  const tune = tuneNow(round, now);
  for (const moment of state.moments) {
    if (moment.kind === "burst") drawBurst(ctx, train.xs[moment.gap], train.y - train.size * 0.2, train.size * 1.3, clamp((now - moment.start) / BURST_MS), theme);
  }
  for (const pop of popsNow(round, now)) drawNotePop(ctx, train.xs[pop.index] + shift, train.y - train.size * 0.55, train.size, round.puzzle.train.wagons[pop.index], pop.progress, theme);
  if (tune && tune.progress < 1) drawPuff(ctx, mix(train.engineX, train.xs.at(-1) + train.size * 0.5, tune.progress), train.y - train.size * 1.05, train.size, now / 1000, theme);
}

export function drawHint(ctx, state, theme, time) {
  const { hint, layout, round } = state;
  const cell = hint && layout.cells[hint.candidate];
  if (!cell) return;
  const { train } = layout;
  const from = sidingWagon(cell);
  const t = ease(clamp(((time % HINT_LOOP) / HINT_LOOP) * 1.35));
  const [x, y] = [mix(from.x, train.xs[hint.gap], t), mix(from.y, train.y, t)];
  rimmed(ctx, theme, () => drawWagon(ctx, x, y - train.size * 0.2, mix(from.size, train.size, t), round.candidates[hint.candidate], { ghost: true }, theme));
  drawHintHand(ctx, x + train.size * 0.2, y + train.size * 0.5, Math.max(48, Math.min(72, train.size * 1.2)), (time % HINT_LOOP) / HINT_LOOP, theme.ui);
}

export function barShown(state) {
  const { round } = state;
  const trains = state.screen === "play" && round?.kind === "level" ? { total: TRAINS, at: round.at, done: round.phase === "tune" || round.phase === "leave" } : null;
  return { sound: state.sound, press: state.press, lang: state.lang, trains, rival: rivalOf(state) };
}

const poseOf = (round, tune) => (tune ? "dancing" : round.phase === "arrive" || round.phase === "leave" ? "puffing" : "idle");

export function drawPlay(ctx, state, theme, time) {
  const { round, layout } = state;
  if (!round || !layout) return;
  const now = time * 1000;
  const { train } = layout;
  const shift = trainShift(round, now, state.width);
  const tune = tuneNow(round, now);
  const driver = driverOf(state);
  ctx.save();
  drawStage(ctx, state, theme, horizonOf(train));
  drawRails(ctx, state, train, theme);
  rimmed(ctx, theme, () => {
    drawEngine(ctx, train.engineX + shift, train.y - train.size * 0.06, train.engine, driver.look, { pose: poseOf(round, tune), time, pilot: driver.pilot }, theme);
    wagonsOf(ctx, round, train, shift, tune, state.hint, theme, time);
    effects(ctx, state, theme, now, shift);
  });
  siding(ctx, state, theme, time);
  rimmed(ctx, theme, () => movingWagons(ctx, state, theme, now));
  drawBar(ctx, layout, barShown(state), theme, time);
  if (!state.paused && !state.drag?.moved) drawHint(ctx, state, theme, time);
  if (state.paused) drawPause(ctx, state, theme.ui, { layout: pauseLayout(state.width, state.height, { fill: state.fill }) });
  ctx.restore();
}
