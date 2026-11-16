import { standIn } from "../../../kit/src/avatars/index.js";
import { DIGITS, drawDigits, drawHintHand, drawPause, drawPortrait, drawRoundButton, formatNumber, pauseLayout } from "../../../kit/src/canvas/index.js";
import { circle, clamp, fadeEdges, mix, paint, roundedRect } from "../../../kit/src/canvas/pen.js";
import { drawBalloon, drawBurst, drawCloudPuff, drawOwnerMark, drawPop } from "./balloons.js";
import { STEP_MS, presentAt } from "./fair.js";
import { drawPlayBar } from "./hud.js";
import { muzzleOf, sizeOf, toScreen } from "./layout.js";
import { leftOf, seenOf } from "./rounds.js";
import { drawScenery, drawStallBack, drawStallFront } from "./scenery.js";
import { JAM, aimOf, tankOf } from "./shots.js";
import { drawAimLine, drawArrow, drawCork, drawGauge, drawMissPuff, drawSplash, drawToy } from "./toys.js";

const FLICK = Object.freeze({ who: "flick" });
const HAND = 64;
const FINGER = 0.45;
const TAP_LOOP = 1.2;
const PULL_LOOP = 1.8;
const RECOIL_STEPS = 8;

const progressOf = (moment, time) => clamp((time * 1000 - moment.start) / moment.duration);

export function rivalOf(state) {
  const kind = state.round?.kind ?? state.outcome?.kind;
  return kind === "flick" ? FLICK : kind === "friend" ? standIn(state.player) : null;
}

const frozen = (state) => state.paused || state.round.heard?.p === 1 || state.round.sent || state.screen !== "play";

function stepNow(state) {
  const { round } = state;
  return round.step + (frozen(state) ? 0 : Math.min(1, round.steps.carry / STEP_MS));
}

function balloons(ctx, state, theme, time) {
  const { round, layout } = state;
  const { stage } = layout;
  ctx.save();
  ctx.beginPath();
  ctx.rect(stage.x, stage.y, stage.w, stage.h);
  ctx.clip();
  for (const { balloon, u, v } of presentAt(round.schedule, stepNow(state), round.tally.pops)) {
    const [x, y] = toScreen(layout, u, v);
    drawBalloon(ctx, x, y, sizeOf(layout, balloon.kind), balloon.kind, theme, { time, hits: round.tally.hits.get(balloon.id) ?? 0 });
  }
  ctx.restore();
}

function aimNow(state) {
  const { pull } = state.round;
  return pull ? aimOf({ dx: pull.x - pull.x0, dy: pull.y - pull.y0 }, state.layout.unit) : null;
}

function toy(ctx, state, theme) {
  const { round, layout } = state;
  const { tool } = round;
  const { x, y, size } = layout.tool;
  const aim = aimNow(state);
  const angle = aim ? Math.atan2(aim.dy, aim.dx) : -Math.PI / 2;
  const muzzle = muzzleOf(layout);
  if (aim) drawAimLine(ctx, muzzle.x, muzzle.y, Math.min(layout.field.h * 0.75, layout.unit * 1.1), angle, aim.pull, theme);
  const firing = clamp((round.step - tool.firedAt) / RECOIL_STEPS);
  drawToy(ctx, tool.kind, x, y, size, theme, { firing: firing < 1 ? firing : 0, tank: tankOf(tool, round.step), pull: aim?.pull ?? 0, angle, arrow: !tool.shots.length });
  const jam = (tool.jamUntil - round.step) / JAM;
  if (jam > 0) drawGauge(ctx, x, y - size * 0.62, size * 0.7, 1 - jam, theme.ui);
  else if (tankOf(tool, round.step) < 1) drawGauge(ctx, x, y - size * 0.62, size * 0.7, tankOf(tool, round.step), theme.ui);
}

function shots(ctx, state, theme) {
  const { round, layout } = state;
  const at = stepNow(state);
  for (const shot of round.tool.shots) {
    if (shot.tool === "popgun") {
      const p = clamp((at - shot.start) / (shot.arrive - shot.start));
      drawCork(ctx, mix(shot.x0, shot.x, p), mix(shot.y0, shot.y, p), clamp(layout.unit * 0.07, 18, 28), p * 3, theme);
    } else if (shot.tool === "blaster") drawSplash(ctx, shot.x, shot.y, shot.radius, clamp((at - shot.start) / (shot.until - shot.start)), theme);
    else drawArrow(ctx, shot.x, shot.y, layout.tool.size * 0.72, Math.atan2(shot.dy, shot.dx), theme);
  }
}

function penalty(ctx, x, y, t, state, ui) {
  const words = formatNumber(-1, state.lang);
  ctx.save();
  ctx.globalAlpha = 1 - t * t;
  roundedRect(ctx, x - 26, y - 17, 52, 34, 17);
  paint(ctx, ui.surface, ui.border, ui.line);
  drawDigits(ctx, words, x, y + 1, DIGITS.best, ui.text, "center");
  ctx.restore();
}

function popped(ctx, moment, x, y, size, t, state, theme, time) {
  const mine = moment.by === state.round.seat;
  drawPop(ctx, x, y, size, moment.look, t, theme);
  ctx.save();
  ctx.globalAlpha = 1 - t;
  drawOwnerMark(ctx, x, y - t * size * 0.3, Math.max(16, size * 0.3), mine ? "mine" : "theirs", theme);
  const rival = rivalOf(state);
  if (!mine && rival) drawPortrait(ctx, x, y - size * 0.62 - t * 10, 28, { player: rival, face: "happy" }, theme.ui, { time });
  ctx.restore();
}

function moments(ctx, state, theme, time) {
  const { layout } = state;
  for (const moment of state.moments) {
    if (moment.u === undefined) continue;
    const t = progressOf(moment, time);
    const [x, y] = toScreen(layout, moment.u, moment.v);
    const size = sizeOf(layout, moment.look ?? "round");
    if (moment.kind === "pop") popped(ctx, moment, x, y, size, t, state, theme, time);
    else if (moment.kind === "burst") drawBurst(ctx, x, y, layout.unit * 0.36, t, theme);
    else if (moment.kind === "puff") drawCloudPuff(ctx, x, y, sizeOf(layout, "cloud"), t, theme);
    else if (moment.kind === "penalty") penalty(ctx, x, y - sizeOf(layout, "cloud") * 0.7 - t * 18, t, state, theme.ui);
    else if (moment.kind === "miss") drawMissPuff(ctx, x, y, layout.unit * 0.14, t, theme);
    else if (moment.kind === "hit") drawMissPuff(ctx, x, y, size * 0.6, t, theme);
  }
}

const running = (state, now) => state.screen === "play" && now >= state.round.startAt && state.round.step < state.round.roundSteps;

export function handAt(state, time) {
  const { round, layout } = state;
  if (!round || round.pull || state.taught.includes(round.tool.kind)) return null;
  if (round.tool.kind === "bow") {
    const progress = (time % PULL_LOOP) / PULL_LOOP;
    const pull = clamp((progress - 0.15) / 0.55);
    const { field, unit } = layout;
    return { x: field.x + field.w / 2, y: field.y + field.h * 0.5 + pull * Math.min(unit * 0.26, field.h * 0.3), pull, press: 0.25 };
  }
  const found = seenOf(round, layout).find((one) => one.balloon.kind !== "cloud" && one.v > 0.15 && one.v < 0.9);
  if (!found) return null;
  return { x: found.x, y: found.y, pull: 0, press: (time % TAP_LOOP) / TAP_LOOP };
}

function hint(ctx, state, theme, time) {
  const hand = handAt(state, time);
  if (!hand) return;
  const { layout } = state;
  if (state.round.tool.kind === "bow" && hand.pull > 0) {
    const muzzle = muzzleOf(layout);
    drawAimLine(ctx, muzzle.x, muzzle.y, Math.min(layout.field.h * 0.6, layout.unit * 0.9), -Math.PI / 2, hand.pull, theme);
  }
  drawHintHand(ctx, hand.x, hand.y + FINGER * HAND, HAND, hand.press, theme.ui);
}

function countdown(ctx, state, theme, now) {
  const { round, layout } = state;
  const left = round.startAt - now;
  if (left <= 0) return;
  const { field } = layout;
  const size = Math.min(88, layout.unit * 0.4);
  const [x, y] = [field.x + field.w / 2, field.y + field.h / 2];
  circle(ctx, x, y, size / 2, theme.ui.surface, theme.ui.border, theme.ui.line);
  drawDigits(ctx, formatNumber(Math.ceil(left / 1000), state.lang), x, y, Math.max(DIGITS.big, size * 0.5), theme.ui.text, "center");
}

function barOf(state) {
  const { round } = state;
  const { scores } = round.tally;
  const rival = rivalOf(state);
  return {
    score: scores[round.seat], rival: rival && { player: rival, score: scores[1 - round.seat] }, left: leftOf(round),
    best: round.kind === "alone" ? state.progress.best : null, sound: state.sound, press: state.press, lang: state.lang,
  };
}

export function drawPlay(ctx, game, theme, time) {
  const { state } = game;
  const { round, layout } = state;
  if (!round || !layout) return;
  const now = game.now();
  drawScenery(ctx, { x: 0, y: 0, w: state.width, h: state.height }, round.scenery, theme, time);
  fadeEdges(ctx, state.width, state.height, theme.ui.page);
  drawStallBack(ctx, layout, round.scenery, theme);
  balloons(ctx, state, theme, time);
  drawStallFront(ctx, layout, round.scenery, theme);
  toy(ctx, state, theme);
  shots(ctx, state, theme);
  moments(ctx, state, theme, time);
  if (running(state, now)) hint(ctx, state, theme, time);
  countdown(ctx, state, theme, now);
  if (round.heard?.p === 1 && !state.paused) drawRoundButton(ctx, "pause", layout.field.x + layout.field.w / 2, layout.field.y + layout.field.h / 2, 88, theme.ui);
  drawPlayBar(ctx, layout, barOf(state), theme, time);
  if (state.paused) drawPause(ctx, state, theme.ui, { layout: pauseLayout(state.width, state.height, { fill: state.fill }) });
}
