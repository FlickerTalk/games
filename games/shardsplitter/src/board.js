import { FLICK, standIn } from "../../../kit/src/avatars/index.js";
import { drawPortrait } from "../../../kit/src/canvas/bar.js";
import { centreOf } from "../../../kit/src/canvas/layout.js";
import { pauseLayout } from "../../../kit/src/canvas/menu-layout.js";
import { fadeEdges, withRim } from "../../../kit/src/canvas/pen.js";
import { drawHintHand, drawPause } from "../../../kit/src/canvas/screens.js";
import { drawBar } from "./bar-art.js";
import { drawChip, drawDivisorButton } from "./button-art.js";
import { drawBellRing, drawBounceMarks, drawBurst } from "./effects-art.js";
import { drawGolem, drawShard } from "./golem-art.js";
import { drawHero } from "./hero-art.js";
import { BELL_MS, IMPACT_MS, SWING_MS, malletAt, sceneAt } from "./motion.js";
import { drawPlace } from "./place-art.js";
import { golemOf, turnOf } from "./round.js";
import { jarFill } from "./rounds.js";

const HINT_LOOP = 1.6;
const BURST_MS = 600;
const progressOf = (start, duration, now) => (now - start) / duration;

export const rimmed = (ctx, theme, draw) => withRim(ctx, { ink: theme.art.ink, colour: theme.art.rim }, draw);

export const capTint = (core, cap) => Math.max(0, core.hands.flat().indexOf(cap)) % 3;

export function mateOf(state) {
  if (state.mode === "alone") return null;
  const mallet = state.progress.chosen.mallet === "round" ? "block" : "round";
  return { player: state.mode === "flick" ? { who: FLICK.id } : standIn(state.player), mallet };
}

export function drawStage(ctx, state, theme, ground) {
  drawPlace(ctx, state.progress.chosen.place, { x: 0, y: 0, w: state.width, h: state.height }, ground, theme);
  fadeEdges(ctx, state.width, state.height, theme.ui.page);
}

function people(ctx, state, theme, time) {
  const { round, layout } = state;
  const now = time * 1000;
  const mate = mateOf(state);
  const cheer = round.finished ? { pose: "celebrate" } : {};
  drawHero(ctx, layout.hero, { player: state.player, mallet: state.progress.chosen.mallet, ...malletAt(round.swings[0], now), ...cheer, time }, theme);
  if (mate && layout.mate) drawHero(ctx, layout.mate, { ...mate, ...malletAt(round.swings[1], now), ...cheer, flip: true, time: time + 0.4 }, theme);
}

function golems(ctx, state, scene, theme, time) {
  const { core } = state.round;
  for (const piece of scene.pieces) drawGolem(ctx, piece.x, piece.y, piece.size * 0.94, { number: piece.value, mood: piece.mood, cap: piece.cap, capTint: capTint(core, piece.cap), time }, theme);
  for (const piece of scene.flying) {
    if (piece.shard) drawShard(ctx, piece.x, piece.y, piece.size, { value: piece.value, angle: piece.angle }, theme);
    else drawGolem(ctx, piece.x, piece.y, piece.size * 0.94, { number: piece.value, mood: "giggle", time }, theme);
  }
}

function effects(ctx, state, theme, now) {
  const { round, layout } = state;
  const { field, hero, jar } = layout;
  if (round.bell) drawBellRing(ctx, field.x + field.w / 2, layout.ground - Math.min(field.h, 150) / 2, Math.min(150, field.h, field.w) * 0.8, progressOf(round.bell.start, BELL_MS, now), theme);
  const mine = round.swings[0];
  if (mine?.miss) drawBounceMarks(ctx, hero.x + hero.size * 0.5, hero.y - hero.size * 0.1, hero.size * 0.6, progressOf(mine.start + IMPACT_MS, SWING_MS, now), theme);
  if (round.burst) drawBurst(ctx, jar.x, jar.y, jar.size * 1.5, progressOf(round.burst.start, BURST_MS, now), round.burst.seed, theme);
}

function buttons(ctx, state, theme, now) {
  const { round, layout, press } = state;
  const { core } = round;
  const cap = golemOf(core)?.cap ?? null;
  const turn = turnOf(core);
  const waiting = round.finished || turn !== round.mySide;
  for (const target of layout.buttons) {
    const pressed = Boolean(press && press.kind === "hit" && press.value === target.value);
    drawDivisorButton(ctx, target, target.value, theme, { pressed, blocked: cap === target.value, dim: waiting, capTint: capTint(core, cap) });
  }
  for (const chip of layout.chips) {
    drawChip(ctx, chip, chip.value, theme, { active: turn !== null && turn !== round.mySide, struck: round.struck?.divisor === chip.value && now < round.struck.until, blocked: cap === chip.value });
  }
}

function hint(ctx, state, theme, time) {
  const aim = state.hint && state.layout.buttons.find((one) => one.value === state.hint.divisor);
  if (!aim || state.round.finished) return;
  const [x, y] = centreOf(aim);
  const size = Math.min(72, aim.w * 0.8);
  drawHintHand(ctx, x + aim.w * 0.12, Math.min(y + aim.h * 0.42, state.height - size * 0.78), size, (time % HINT_LOOP) / HINT_LOOP, theme.ui);
}

export function barShown(state) {
  const { round } = state;
  const mate = mateOf(state);
  const theirs = Boolean(round) && !round.finished && turnOf(round.core) === 1 - round.mySide;
  return {
    sound: state.sound, press: state.press, lang: state.lang,
    fill: round ? jarFill(round) : 0,
    golems: { total: round?.core.golems.length ?? 0, done: round ? round.core.at - (round.leave ? 1 : 0) : 0 },
    mate: mate && { player: mate.player, thinking: theirs },
  };
}

export function drawPlay(ctx, state, theme, time) {
  const { round, layout } = state;
  if (!round || !layout) return;
  const now = time * 1000;
  const scene = sceneAt(round, layout.field, layout.jar, now);
  ctx.save();
  drawStage(ctx, state, theme, layout.ground);
  rimmed(ctx, theme, () => {
    people(ctx, state, theme, time);
    golems(ctx, state, { pieces: scene.pieces, flying: [] }, theme, time);
    effects(ctx, state, theme, now);
  });
  buttons(ctx, state, theme, now);
  const shown = barShown(state);
  if (layout.seat && shown.mate) drawPortrait(ctx, layout.seat.x, layout.seat.y, layout.seat.size, shown.mate, theme.ui, { time, lang: state.lang });
  drawBar(ctx, layout, shown, theme, time);
  rimmed(ctx, theme, () => golems(ctx, state, { pieces: [], flying: scene.flying }, theme, time));
  if (!state.paused) hint(ctx, state, theme, time);
  if (state.paused) drawPause(ctx, state, theme.ui, { layout: pauseLayout(state.width, state.height, { fill: state.fill }) });
  ctx.restore();
}
