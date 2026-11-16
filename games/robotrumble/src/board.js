import { standIn } from "../../../kit/src/avatars/index.js";
import { DIGITS, drawDigits, drawHintHand, drawPause, drawRoundButton, formatNumber, pauseLayout } from "../../../kit/src/canvas/index.js";
import { centreOf } from "../../../kit/src/canvas/layout.js";
import { circle, clamp, ease, mix } from "../../../kit/src/canvas/pen.js";
import { energyOf, lampsOf } from "./bout.js";
import { drawBatteryBar, drawControlButton, drawDial, drawPlayBar, drawRoundLamps } from "./hud.js";
import { SHOW_MS } from "./levels.js";
import { drawFlyingPart, drawGhostMarker, drawImpactStar, drawMotionLines } from "./parts.js";
import { drawRobot } from "./robots.js";
import { IMPACT_MS, leftOf, scoreAt, windowOf } from "./rounds.js";
import { drawStage } from "./stages.js";

// ms
const HIT_MS = 350;
const BACK_MS = 250;
const DIZZY_MS = 500;
const LAUGH_MS = 500;
const STRIDE_MS = 220;
const STAR_MS = 450;
const PART_MS = 700;
const HINT_LOOP = 1.4;

const FLICK = Object.freeze({ who: "flick" });
const STRIKE = { g: "glove", b: "kick", s: "shield", n: "idle" };
const HEIGHT = { g: 0.42, b: 0.26 };
const facing = (side) => (side === 0 ? 1 : -1);

function acting(shown, layout, side, since) {
  const struck = shown.landed[1 - side] === 1;
  let pose = since < IMPACT_MS + HIT_MS ? STRIKE[shown.moves[side]] : "idle";
  if (since >= IMPACT_MS && struck) pose = since < IMPACT_MS + HIT_MS ? "hit" : shown.toppled === side ? "dizzy" : "idle";
  else if (since >= IMPACT_MS + HIT_MS && shown.toppled === 1 - side) pose = "cheer";
  const back = ease((since - (SHOW_MS - BACK_MS)) / BACK_MS);
  return { x: mix(layout.meet[side], layout.home[side], back), pose, reach: ease(since / (IMPACT_MS * 0.8)) };
}

function standing(round, layout, side, now) {
  const { walked, open } = windowOf(round);
  const { hits, over } = round.bout;
  if (over) return { x: layout.home[side], pose: hits[side] >= hits[1 - side] ? "cheer" : "idle", reach: 1 };
  const started = now >= round.startAt;
  const pose = started && open ? (Math.floor(now / STRIDE_MS) % 2 ? "walkA" : "walkB") : "idle";
  return { x: mix(layout.home[side], layout.meet[side], started ? ease(walked) : 0), pose, reach: 1 };
}

function robotAt(round, layout, side, now) {
  const { shown } = round;
  const since = shown ? now - shown.at : Infinity;
  if (since < SHOW_MS) return acting(shown, layout, side, since);
  if (shown?.toppled === side && since < SHOW_MS + DIZZY_MS + LAUGH_MS) return { x: layout.home[side], pose: since < SHOW_MS + DIZZY_MS ? "dizzy" : "cheer", reach: 1 };
  return standing(round, layout, side, now);
}

function strikes(shown, robots, layout, since) {
  const { size, ground } = layout;
  const found = [];
  if (shown.kind === "clash") {
    found.push({ kind: "star", x: (robots[0].x + robots[1].x) / 2, y: ground - HEIGHT[shown.moves[0]] * size, size: size * 0.45, progress: since / STAR_MS });
    return found;
  }
  for (const side of [0, 1]) {
    if (!shown.landed[1 - side]) continue;
    const by = shown.moves[1 - side];
    const blocked = shown.kind === "block";
    const x = robots[side].x;
    found.push({ kind: "star", x: x + facing(side) * (blocked ? 0.62 : 0.18) * size, y: ground - (HEIGHT[by] ?? 0.45) * size, size: size * 0.5, progress: since / STAR_MS });
    found.push({ kind: "part", type: by === "g" ? "bolt" : "spring", x: x - facing(side) * (0.2 + (0.45 * since) / PART_MS) * size, y: ground - 0.75 * size, size: size * 0.24, progress: since / PART_MS });
  }
  return found;
}

function effectsOf(round, robots, layout, now) {
  const { shown } = round;
  const since = shown ? now - shown.at : Infinity;
  if (since >= SHOW_MS) return [];
  if (since >= IMPACT_MS) return strikes(shown, robots, layout, since - IMPACT_MS).filter((one) => one.progress < 1);
  return [0, 1]
    .filter((side) => HEIGHT[shown.moves[side]])
    .map((side) => ({ kind: "motion", x: robots[side].x + facing(side) * 0.3 * layout.size, y: layout.ground - HEIGHT[shown.moves[side]] * layout.size, size: layout.size * 0.3, direction: facing(side) }));
}

export function sceneOf(round, layout, now) {
  const robots = [0, 1].map((side) => robotAt(round, layout, side, now));
  const hits = scoreAt(round, now);
  const { shown } = round;
  const down = shown && shown.toppled !== null && now >= shown.at + IMPACT_MS && now < shown.at + SHOW_MS + DIZZY_MS ? shown.toppled : null;
  return {
    robots,
    effects: effectsOf(round, robots, layout, now),
    energy: [0, 1].map((side) => (side === down ? 0 : energyOf(hits, side))),
    lamps: [0, 1].map((side) => lampsOf(hits, side)),
    dial: now >= round.startAt ? windowOf(round).left : 0,
    waiting: round.kind === "friend" && !round.sent && round.mine.length > round.theirs.length,
  };
}

export const rivalOf = (kind, player) => (kind === "flick" ? FLICK : standIn(player));
export const rivalColour = (kind) => (kind === "flick" ? "grape" : "mint");

function robots(ctx, state, scene, theme, time) {
  const { round, layout, player } = state;
  const { size, ground } = layout;
  const [mine, theirs] = scene.robots;
  drawRobot(ctx, theirs.x, ground, size, theme, { variant: round.looks[1], colour: rivalColour(round.kind), facing: -1, pose: theirs.pose, reach: theirs.reach, time, phase: 1.7, player: rivalOf(round.kind, player) });
  drawRobot(ctx, mine.x, ground, size, theme, { variant: round.looks[0], colour: "sun", pose: mine.pose, reach: mine.reach, time, player });
  if (scene.waiting) drawGhostMarker(ctx, theirs.x, ground - size * 1.22, Math.max(24, size * 0.24), theme, time);
}

function effects(ctx, scene, theme) {
  for (const effect of scene.effects) {
    if (effect.kind === "star") drawImpactStar(ctx, effect.x, effect.y, effect.size, theme, effect.progress);
    if (effect.kind === "part") drawFlyingPart(ctx, effect.x, effect.y, effect.size, theme, effect);
    if (effect.kind === "motion") drawMotionLines(ctx, effect.x, effect.y, effect.size, theme, effect.direction);
  }
}

function hud(ctx, layout, scene, theme) {
  const { sides, scale, dial } = layout.hud;
  sides.forEach((side, seat) => {
    drawRoundLamps(ctx, side.x, side.lamps, scene.lamps[seat], theme, { direction: side.direction, scale, shape: seat === 0 ? "circle" : "diamond" });
    drawBatteryBar(ctx, side.x, side.cells, scene.energy[seat], theme, { direction: side.direction, scale });
  });
  drawDial(ctx, dial.x, dial.y, dial.r, scene.dial, theme);
}

function buttons(ctx, state, theme) {
  const { round, layout } = state;
  for (const button of layout.buttons) {
    const held = round.held[round.kind === "pair" ? button.value : 0];
    const bit = button.kind === "glove" ? 1 : 2;
    drawControlButton(ctx, button, button.kind, theme, { lit: (held & bit) !== 0, shield: held === 3 });
  }
}

function hint(ctx, state, theme, time) {
  if (state.taught) return;
  const glove = state.layout.buttons[0];
  const [x, y] = centreOf(glove);
  const size = glove.w * 0.6;
  drawHintHand(ctx, x + size * 0.02, y + size * 0.5, size, (time % HINT_LOOP) / HINT_LOOP, theme.ui);
}

function countdown(ctx, state, theme, now) {
  const { round, layout } = state;
  const left = round.startAt - now;
  if (left <= 0) return;
  const size = Math.min(88, layout.size * 0.8);
  const [x, y] = [layout.width / 2, layout.ground - layout.size * 0.55];
  circle(ctx, x, y, size / 2, theme.ui.surface, theme.ui.border, theme.ui.line);
  drawDigits(ctx, formatNumber(Math.ceil(left / 1000), state.lang), x, y, Math.max(DIGITS.best, Math.min(DIGITS.big, size * 0.5)), theme.ui.text, "center");
}

export function drawPlay(ctx, game, theme, time) {
  const { state } = game;
  const { round, layout } = state;
  if (!round || !layout) return;
  const now = game.now();
  const scene = sceneOf(round, layout, now);
  drawStage(ctx, layout.stage, layout.ground, round.stage, theme);
  robots(ctx, state, scene, theme, time);
  effects(ctx, scene, theme);
  hud(ctx, layout, scene, theme);
  buttons(ctx, state, theme);
  hint(ctx, state, theme, time);
  countdown(ctx, state, theme, now);
  if (round.heard?.p === 1 && !state.paused) drawRoundButton(ctx, "pause", layout.width / 2, layout.ground - layout.size * 0.55, 88, theme.ui);
  const bar = { me: state.player, rival: rivalOf(round.kind, state.player), left: clamp(leftOf(round)), sound: state.sound, press: state.press, lang: state.lang };
  drawPlayBar(ctx, layout, bar, theme, time);
  if (state.paused) drawPause(ctx, state, theme.ui, { layout: pauseLayout(state.width, state.height, { fill: state.fill }) });
}
