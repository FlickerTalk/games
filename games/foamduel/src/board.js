import { standIn } from "../../../kit/src/avatars/index.js";
import { DIGITS, drawDigits, drawHintHand, drawPause, drawRoundButton, formatNumber, pauseLayout } from "../../../kit/src/canvas/index.js";
import { circle, clamp, fadeEdges } from "../../../kit/src/canvas/pen.js";
import { STEP_MS } from "./duel.js";
import { drawDust, drawPop, drawSwoosh } from "./effects.js";
import { drawPad, drawPlayBar } from "./hud.js";
import { drawKnight, rimmed } from "./knights.js";
import { BALLOON_LIFT } from "./layout.js";
import { POP_DELAY, currentOf, leftOf } from "./rounds.js";
import { drawGroundShade, drawScenery } from "./scenery.js";
import { drawSignal } from "./signals.js";

const FLICK = Object.freeze({ who: "flick" });
const SIDES = ["mine", "theirs"];
const HAND = 64;
const TAP_LOOP = 0.7;
const BELL_STAYS = 350;
// steps
const LURE = 35;
const OPENS = 10;
const CLOSES = 6;
const BLOWS_UP = 15;

export function rivalOf(state) {
  const kind = state.round?.kind ?? state.outcome?.kind;
  return kind === "flick" ? FLICK : standIn(state.player);
}

const frozen = (state) => state.paused || state.round.heard?.p === 1 || state.round.sent || state.screen !== "play";

function stepNow(state) {
  const { round } = state;
  return round.step + (frozen(state) ? 0 : Math.min(1, round.steps.carry / STEP_MS));
}

const progressOf = (moment, now) => clamp((now - moment.start) / moment.duration);
const active = (state, kind, side, now) => state.moments.findLast((one) => one.kind === kind && one.side === side && now >= one.start && now < one.start + one.duration) ?? null;

function poseOf(state, side, now, exchange) {
  const { round } = state;
  for (const pose of ["stumble", "strike", "laugh"]) {
    const moment = active(state, pose, side, now);
    if (moment) return { pose, progress: progressOf(moment, now) };
  }
  if (!exchange || round.step >= exchange.close) return { pose: "wait", progress: 0 };
  const verdict = round.verdicts.get(exchange.x);
  if (verdict) return { pose: now < verdict.at + POP_DELAY ? "ready" : "wait", progress: 0 };
  const seat = side === 0 ? round.seat : 1 - round.seat;
  return { pose: round.claims[seat].some((one) => one.x === exchange.x) ? "windup" : "ready", progress: 0 };
}

function balloonOf(state, side, now, exchange) {
  const { round } = state;
  const lost = (x) => {
    const verdict = round.verdicts.get(x);
    return Boolean(verdict?.win[1 - side]) && now >= verdict.at + POP_DELAY;
  };
  if (!exchange) return round.step > 0 && lost(round.schedule.length - 1) ? 0 : 1;
  if (lost(exchange.x)) return 0;
  return exchange.x > 0 && lost(exchange.x - 1) ? clamp((stepNow(state) - exchange.ready) / BLOWS_UP) : 1;
}

// The two knights as they are drawn: this player on the left, the other on the right.
export function knightsOf(state, now) {
  const { round } = state;
  const exchange = currentOf(round);
  return [state.player, rivalOf(state)].map((player, side) => ({
    player,
    ...poseOf(state, side, now, exchange),
    flip: side === 1,
    sword: round.swords[side],
    side: SIDES[side],
    balloon: balloonOf(state, side, now, exchange),
  }));
}

export function signalOf(state, now) {
  const { round } = state;
  const exchange = currentOf(round);
  if (!exchange) return null;
  const at = stepNow(state);
  const verdict = round.verdicts.get(exchange.x);
  if (round.shown.has(exchange.x) && round.step < exchange.close && (!verdict || now < verdict.at + BELL_STAYS)) return { kind: "bell", progress: (at - exchange.signal) / OPENS };
  const lure = verdict ? null : exchange.fakes.find((fake) => round.step >= fake.at && round.step < fake.at + LURE);
  return lure ? { kind: lure.kind, progress: Math.min((at - lure.at) / OPENS, (lure.at + LURE - at) / CLOSES) / 2 + 0.01 } : null;
}

const running = (state, now) => state.screen === "play" && now >= state.round.startAt && state.round.step < state.round.roundSteps;

export function handAt(state, now, time) {
  const { round, layout } = state;
  if (!round || state.taught || !running(state, now)) return null;
  const [pad] = layout.pads;
  const bell = signalOf(state, now)?.kind === "bell";
  return { x: pad.x + pad.w * 0.62, y: pad.y + pad.h * 0.62, press: bell ? Math.max(0.01, (time % TAP_LOOP) / TAP_LOOP) : 0 };
}

function effects(ctx, state, theme, now) {
  const { layout, round } = state;
  const { knights, size, ground } = layout;
  for (const moment of state.moments) {
    if (moment.side === undefined || now < moment.start) continue;
    const { x } = knights[moment.side];
    const facing = moment.side === 0 ? 1 : -1;
    const t = progressOf(moment, now);
    if (moment.kind === "strike") drawSwoosh(ctx, x + facing * size * 0.32, ground - size * 0.6, size * 0.95, t, theme, { facing, shape: round.swords[moment.side] });
    else if (moment.kind === "pop") drawPop(ctx, x, ground - size * BALLOON_LIFT, size * 0.6, t, theme, SIDES[moment.side]);
    else if (moment.kind === "stumble") drawDust(ctx, x, ground, size * 0.6, t, theme);
  }
}

function duel(ctx, state, theme, time, now) {
  const { layout, round } = state;
  const { knights, size, ground, signal } = layout;
  for (const { x } of knights) drawGroundShade(ctx, x, ground, size, round.scenery, theme);
  knightsOf(state, now).forEach((knight, side) => drawKnight(ctx, knights[side].x, ground, size, knight, theme, time));
  effects(ctx, state, theme, now);
  const seen = signalOf(state, now);
  if (seen) drawSignal(ctx, signal.x, signal.y, signal.size, seen.kind, theme, { progress: seen.progress, time });
}

function pads(ctx, state, theme) {
  const { layout, round, press } = state;
  layout.pads.forEach((pad, index) => drawPad(ctx, pad, index, theme, { sword: round.swords[index], pressed: press?.kind === "strike" && press.value === index }));
}

function countdown(ctx, state, theme, now) {
  const { round, layout } = state;
  const left = round.startAt - now;
  if (left <= 0) return;
  const { x, y } = layout.signal;
  const size = Math.max(56, layout.signal.size);
  circle(ctx, x, y, size / 2, theme.ui.surface, theme.ui.border, theme.ui.line);
  drawDigits(ctx, formatNumber(Math.ceil(left / 1000), state.lang), x, y, Math.max(DIGITS.best, Math.min(DIGITS.big, size * 0.5)), theme.ui.text, "center");
}

function barOf(state) {
  const { round } = state;
  return { score: round.scores[0], rival: { player: rivalOf(state), score: round.scores[1] }, left: leftOf(round), sound: state.sound, press: state.press, lang: state.lang };
}

export function drawPlay(ctx, game, theme, time) {
  const { state } = game;
  const { round, layout } = state;
  if (!round || !layout) return;
  const now = game.now();
  drawScenery(ctx, { x: 0, y: 0, w: state.width, h: state.height }, round.scenery, theme, time, { horizon: layout.ground - layout.size * 0.16 });
  fadeEdges(ctx, state.width, state.height, theme.ui.page);
  rimmed(ctx, theme, () => duel(ctx, state, theme, time, now));
  pads(ctx, state, theme);
  const hand = handAt(state, now, time);
  if (hand) drawHintHand(ctx, hand.x, hand.y, HAND, hand.press, theme.ui);
  countdown(ctx, state, theme, now);
  if (round.heard?.p === 1 && !state.paused) drawRoundButton(ctx, "pause", layout.signal.x, layout.signal.y, 88, theme.ui);
  drawPlayBar(ctx, layout, barOf(state), theme, time);
  if (state.paused) drawPause(ctx, state, theme.ui, { layout: pauseLayout(state.width, state.height, { fill: state.fill }) });
}
