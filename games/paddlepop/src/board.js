import { standIn } from "../../../kit/src/avatars/index.js";
import { DIGITS, drawDigits, drawPause, formatNumber, pauseLayout } from "../../../kit/src/canvas/index.js";
import { circle, clamp, roundedRect } from "../../../kit/src/canvas/pen.js";
import { drawDragHand, drawGoalSplash, drawHitBurst, drawWideEffect } from "./bursts.js";
import { drawDragZone, drawPlayBar, drawScoreLights } from "./hud.js";
import { LIGHTS, tableTransform, toScreen } from "./layout.js";
import { scoreOf } from "./match.js";
import { drawPaddle } from "./paddles.js";
import { leftOf } from "./rounds.js";
import { TABLE, centreOf, halfOf } from "./table.js";
import { drawTable } from "./tables.js";
import { drawBall, drawBubble, drawPlanetBumper, drawSlowEffect, drawSnailPickup, drawStarPickup } from "./things.js";

const BODY = 0.92;
const HINT_LOOP = 1.6;
const L = TABLE.length;
const FLICK = Object.freeze({ who: "flick" });

const progressOf = (moment, time) => clamp((time * 1000 - moment.start) / moment.duration);
const seen = (round, x, y) => (round.seat === 0 ? [x, y] : [1 - x, L - y]);

export function ballsShown(round, now) {
  return round.match.balls.map((ball) => {
    const off = round.glides[ball.i]?.at(now) ?? { x: 0, y: 0 };
    const [u, v] = seen(round, ball.x + off.x, ball.y + off.y);
    const [du, dv] = round.seat === 0 ? [ball.vx, ball.vy] : [-ball.vx, -ball.vy];
    return { i: ball.i, u, v, angle: Math.atan2(dv, du), second: ball.i === 1, slow: ball.slow > 0 };
  });
}

function squashOf(state, seat, time) {
  const hit = state.moments.find((one) => one.kind === "hit" && one.seat === seat);
  return hit ? 1 - progressOf(hit, time) : 0;
}

function paddles(ctx, state, theme, time, s) {
  const { round } = state;
  for (const seat of [1 - round.seat, round.seat]) {
    const paddle = round.match.paddles[seat];
    const theirs = seat !== round.seat;
    const x = theirs && round.kind === "friend" && round.theirX !== null && round.theirX !== undefined ? round.theirX : paddle.x;
    const wide = theirs && round.kind === "friend" ? round.theirs?.w === 1 : paddle.wide > 0;
    const [u, v] = seen(round, x, centreOf(seat));
    const width = ((2 * (wide ? TABLE.wide : halfOf(paddle))) / BODY) * s;
    drawPaddle(ctx, round.looks[seat], u * s, v * s, width, theme, { time: time + seat, squash: squashOf(state, seat, time), wide, rotation: theirs ? Math.PI : 0 });
  }
}

function bumpers(ctx, round, theme, time, s) {
  const { rally } = round.match;
  for (const bubble of rally.bubbles) {
    if (bubble.popped) continue;
    const [u, v] = seen(round, bubble.x, bubble.y);
    if (round.table === "space") drawPlanetBumper(ctx, u * s, v * s, bubble.r * s, theme, { time });
    else drawBubble(ctx, u * s, v * s, bubble.r * s, theme, { time });
  }
  const pickup = rally.pickup;
  if (!pickup || pickup.taken) return;
  const [u, v] = seen(round, pickup.x, pickup.y);
  if (pickup.look === "star") drawStarPickup(ctx, u * s, v * s, 0.07 * s, theme, time);
  else drawSnailPickup(ctx, u * s, v * s, 0.08 * s, theme, time);
}

function balls(ctx, round, theme, time, s) {
  for (const ball of ballsShown(round, time * 1000)) {
    if (ball.slow) drawSlowEffect(ctx, ball.u * s, ball.v * s, TABLE.radius * s * 2.2, theme, time);
    drawBall(ctx, ball.u * s, ball.v * s, TABLE.radius * s, theme, { time, second: ball.second, angle: ball.angle });
  }
}

function moments(ctx, state, theme, time, s) {
  const { round } = state;
  for (const moment of state.moments) {
    const t = progressOf(moment, time);
    const [u, v] = seen(round, moment.x ?? 0.5, moment.y ?? L / 2);
    if (moment.kind === "hit") drawHitBurst(ctx, u * s, v * s, TABLE.radius * s * 2.4, t, theme);
    if (moment.kind === "pop" && round.table === "space") drawPlanetBumper(ctx, u * s, v * s, 0.065 * s, theme, { pop: t });
    else if (moment.kind === "pop") drawBubble(ctx, u * s, v * s, 0.065 * s, theme, { pop: t });
    if (moment.kind === "pick") drawHitBurst(ctx, u * s, v * s, 0.12 * s, t, theme);
    if (moment.kind === "pick" && moment.look === "star") {
      const [pu, pv] = seen(round, round.match.paddles[moment.seat].x, centreOf(moment.seat));
      drawWideEffect(ctx, pu * s, pv * s, 2 * TABLE.wide * s, theme, time);
    }
    if (moment.kind === "goal") drawGoalSplash(ctx, u * s, v * s, s * 0.55, t, theme, { down: v < L / 2 });
  }
}

function zones(ctx, state, theme, time, s) {
  const { round } = state;
  const height = Math.min(116, s * 0.3);
  const near = { x: s / 2, y: (L - TABLE.inset * 0.55) * s };
  drawDragZone(ctx, near.x, near.y, s - 20, height, theme, { active: !state.taught });
  if (round.kind === "pair") {
    ctx.save();
    ctx.translate(s / 2, TABLE.inset * 0.55 * s);
    ctx.rotate(Math.PI);
    drawDragZone(ctx, 0, 0, s - 20, height, theme);
    ctx.restore();
  }
}

const FINGER = 0.72;
const CUFF = 0.86;

function handAt(s, time) {
  const size = Math.min(62, s * 0.17);
  const progress = (time % HINT_LOOP) / HINT_LOOP;
  const y = Math.min(centreOf(0) * s + FINGER * size, L * s + LIGHTS - 2 - CUFF * size);
  return { x: s / 2 - size * 0.625, y, size, progress };
}

export function handTip({ layout }, time) {
  const s = layout.table.s;
  const { x, y, size, progress } = handAt(s, time);
  const drag = (progress < 0.2 ? progress / 0.2 : progress > 0.8 ? (1 - progress) / 0.2 : 1) * size * 1.25;
  return toScreen(layout, (x + drag) / s, (y - FINGER * size) / s);
}

function hint(ctx, state, theme, time, s) {
  if (state.taught) return;
  const { x, y, size, progress } = handAt(s, time);
  drawDragHand(ctx, x, y, size, progress, theme);
}

function lights(ctx, state, theme, s) {
  const { round } = state;
  const size = Math.min(18, s / 9);
  drawScoreLights(ctx, s / 2, L * s + LIGHTS * 0.6, scoreOf(round.match, round.seat), theme.ui, { shape: "circle", size });
  drawScoreLights(ctx, s / 2, -LIGHTS * 0.6, scoreOf(round.match, 1 - round.seat), theme.ui, { shape: "diamond", size });
}

function field(ctx, state, theme, time) {
  const { round, layout } = state;
  const s = layout.table.s;
  ctx.save();
  tableTransform(ctx, layout);
  drawTable(ctx, { x: 0, y: 0, w: s, h: L * s }, round.table, theme, time);
  lights(ctx, state, theme, s);
  ctx.save();
  roundedRect(ctx, -6, -6, s + 12, L * s + 12, s * 0.06);
  ctx.clip();
  zones(ctx, state, theme, time, s);
  bumpers(ctx, round, theme, time, s);
  paddles(ctx, state, theme, time, s);
  balls(ctx, round, theme, time, s);
  moments(ctx, state, theme, time, s);
  ctx.restore();
  hint(ctx, state, theme, time, s);
  ctx.restore();
}

function countdown(ctx, state, theme, now) {
  const { round, layout } = state;
  const left = round.startAt - now;
  if (left <= 0) return;
  const { table } = layout;
  const size = Math.min(88, table.s * 0.4);
  const [x, y] = [table.x + table.w / 2, table.y + table.h / 2];
  circle(ctx, x, y, size / 2, theme.ui.surface, theme.ui.border, theme.ui.line);
  drawDigits(ctx, formatNumber(Math.ceil(left / 1000), state.lang), x, y, Math.max(DIGITS.big, size * 0.5), theme.ui.text, "center");
}

function rivalOf(state) {
  const { round, player } = state;
  return round.kind === "flick" ? FLICK : standIn(player);
}

export function drawPlay(ctx, game, theme, time) {
  const { state } = game;
  const { round, layout } = state;
  if (!round || !layout) return;
  const now = game.now();
  field(ctx, state, theme, time);
  countdown(ctx, state, theme, now);
  const bar = { me: state.player, rival: rivalOf(state), left: leftOf(round), sound: state.sound, press: state.press, lang: state.lang };
  drawPlayBar(ctx, layout, bar, theme, time);
  if (state.paused) drawPause(ctx, state, theme.ui, { layout: pauseLayout(state.width, state.height, { fill: state.fill }) });
}
