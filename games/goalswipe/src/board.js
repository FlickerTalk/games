import { standIn } from "../../../kit/src/avatars/index.js";
import { drawHintHand, drawPause, pauseLayout } from "../../../kit/src/canvas/index.js";
import { clamp, ease, fadeEdges, mix } from "../../../kit/src/canvas/pen.js";
import { drawBall, drawBallTrail } from "./ball.js";
import { drawBurst, drawHalo, drawRipple, drawSwipeTrail, drawWarningRing } from "./effects.js";
import { drawBonusTarget, drawGoal } from "./goal.js";
import { drawPlayBar } from "./hud.js";
import { BONUS } from "./kicks.js";
import { swipeFor, toScreen } from "./layout.js";
import { ballAt, bulgeAt, keeperAt, reactionOf, ringOf, shooterPoseAt, trailOf } from "./moves.js";
import { drawKeeper, drawShooter } from "./players.js";
import { canDive, canShoot, keeperIsHere } from "./rounds.js";
import { drawCrowd, drawField, rimmed } from "./scene.js";
import { goalsOf, shooterOf, tallyOf } from "./shootout.js";

const FLICK = Object.freeze({ who: "flick" });
const HINT_AIM = { x: 0.3, y: 0.5 };
const HINT_LOOP = 1.75;
const TARGET_SHARE = { tyre: 0.25, bells: 0.2 };

export function peopleOf(game) {
  const { state } = game;
  const kind = state.round?.kind ?? (state.mode === "friend" ? "friend" : state.mode === "alone" && state.variant === "pair" ? "pair" : "flick");
  return [state.player, kind === "flick" ? FLICK : standIn(state.player)];
}

const progressOf = (moment, now) => clamp((now - moment.start) / moment.duration);

export function drawStage(ctx, layout, looks, theme, time, { reaction = 0 } = {}) {
  const { width, height, goal, ball, spot, zone } = layout;
  const horizon = goal.y + goal.h / 2 - 20;
  drawField(ctx, { x: 0, y: 0, w: width, h: height }, looks.field, theme, { time, horizon, top: zone.y, lineAt: Math.min(height - 10, ball.y + spot.h * 0.42) });
  if (looks.field === "stadium") rimmed(ctx, theme, () => drawCrowd(ctx, { x: 20, y: goal.y - 44, w: width - 40, h: 44 }, theme, { time, reaction }));
  fadeEdges(ctx, width, height, theme.ui.page);
}

function targets(ctx, layout, moments, theme, time, now) {
  const { goal } = layout;
  for (const one of BONUS) {
    const [x, y] = toScreen(layout, one);
    const hit = moments.find((moment) => moment.kind === "bonus" && moment.target === one.kind);
    drawBonusTarget(ctx, x, y, goal.h * TARGET_SHARE[one.kind], one.kind, theme, { time, hit: hit ? 1 - progressOf(hit, now) : 0, cord: Math.max(0, y - goal.y - goal.h * TARGET_SHARE[one.kind] * 0.9) });
  }
}

function answers(ctx, layout, moments, theme, now) {
  const size = layout.goal.h * 0.6;
  for (const moment of moments) {
    if (moment.kind !== "burst" && moment.kind !== "ripple") continue;
    const [x, y] = toScreen(layout, moment.at);
    if (moment.kind === "burst") drawBurst(ctx, x, y, size, progressOf(moment, now), theme, { kind: moment.style, seed: moment.start % 97 });
    else drawRipple(ctx, x, y, size * 0.9, progressOf(moment, now), theme);
  }
}

function hints(ctx, game, theme, time) {
  const { state } = game;
  const { round, layout, taught } = state;
  const { ball, goal } = layout;
  const size = clamp(goal.h * 0.5, 56, 84);
  if (canShoot(round) && !taught.shoot && !round.swipe) {
    const along = ease(Math.min(1, ((time % HINT_LOOP) / HINT_LOOP) * 1.4));
    const end = swipeFor(layout, HINT_AIM);
    const at = [mix(ball.x, end.x, along), mix(ball.y, end.y, along)];
    drawSwipeTrail(ctx, [[ball.x, ball.y], at], theme, { width: 10 });
    drawHintHand(ctx, at[0], at[1] + size * 0.45, size, along, theme.ui);
  } else if (canDive(round, game.now()) && !taught.keep) {
    const [x, y] = toScreen(layout, round.kick.aim && round.kick.ringAt !== null ? round.kick.aim : { x: 0.72, y: 0.45 });
    drawHintHand(ctx, x, y + size * 0.45, size, (time * 0.8) % 1, theme.ui);
  }
}

function barView(game, kick) {
  const { state, friend } = game;
  const { round } = state;
  const [me, rival] = peopleOf(game);
  const shooter = kick ? kick.shooter : shooterOf(round.kicks.length);
  const waiting = kick?.phase === "wait" || kick?.phase === "think";
  const away = Boolean(friend && round.kind === "friend" && (friend.status.away || !friend.status.here));
  return {
    lang: state.lang, sound: state.sound, press: state.press,
    people: [
      { player: me, goals: goalsOf(round.kicks, round.seat), face: "happy" },
      { player: rival, goals: goalsOf(round.kicks, 1 - round.seat), thinking: waiting && !away, away, face: "happy" },
    ],
    tallies: [tallyOf(round.kicks, round.seat), tallyOf(round.kicks, 1 - round.seat)],
    shooting: round.endAt !== null || round.done ? null : shooter === round.seat ? 0 : 1,
  };
}

function field(ctx, game, theme, time, now) {
  const { state } = game;
  const { layout, round, moments } = state;
  const { kick } = round;
  const { goal, ball, spot } = layout;
  const people = peopleOf(game);
  const playerOn = (side) => people[side === round.seat ? 0 : 1];
  const shooter = kick ? kick.shooter : shooterOf(round.kicks.length);
  const flying = ballAt(layout, kick, now);
  const keeper = keeperAt(layout, kick, now);
  const ring = kick && keeperIsHere(round, kick) ? ringOf(kick, now) : null;
  const mark = clamp(goal.h * 0.55, 60, 96);
  rimmed(ctx, theme, () => {
    drawGoal(ctx, goal, theme, { bulge: bulgeAt(kick, now), at: kick?.aim ?? undefined });
    targets(ctx, layout, moments, theme, time, now);
    drawKeeper(ctx, keeper, playerOn(1 - shooter), theme, { ...keeper, time });
  });
  if (ring) drawWarningRing(ctx, ...toScreen(layout, kick.aim), mark, ring.progress, theme, { caught: Boolean(kick.dive) });
  if (kick?.guess && kick.phase === "wait") drawWarningRing(ctx, ...toScreen(layout, kick.guess), mark, 1, theme, { caught: true });
  if (canShoot(round)) drawHalo(ctx, ball.x, ball.y, spot.w, theme, { active: Boolean(round.swipe) });
  const trail = round.swipe?.points ?? (kick?.trail && !flying.flying && kick.phase !== "result" ? kick.trail : null);
  drawSwipeTrail(ctx, trail, theme);
  drawBallTrail(ctx, trailOf(layout, kick, now), ball.size * flying.scale, theme);
  rimmed(ctx, theme, () => {
    drawShooter(ctx, layout.shooter, playerOn(shooter), shooterPoseAt(kick, now), theme, time);
    ctx.save();
    ctx.globalAlpha = flying.alpha;
    drawBall(ctx, flying.x, flying.y, ball.size * flying.scale, state.progress.chosen.ball, theme, { rotation: flying.turn });
    ctx.restore();
  });
  answers(ctx, layout, moments, theme, now);
}

export function drawPlay(ctx, game, theme, time) {
  const { state } = game;
  const { layout, round } = state;
  const now = round.pausedAt ?? game.now();
  ctx.save();
  drawStage(ctx, layout, state.progress.chosen, theme, time, { reaction: reactionOf(round.kick, now) });
  field(ctx, game, theme, time, now);
  if (!state.paused) hints(ctx, game, theme, time);
  drawPlayBar(ctx, layout, barView(game, round.kick), theme, time);
  if (state.paused) drawPause(ctx, state, theme.ui, { layout: pauseLayout(state.width, state.height, { fill: state.fill }) });
  ctx.restore();
}
