import { drawStar, drawTopBar } from "../../../kit/src/canvas/bar.js";
import { box } from "../../../kit/src/canvas/layout.js";
import { pauseLayout } from "../../../kit/src/canvas/menu-layout.js";
import { clamp, ellipse, fadeEdges, paint, roundedRect, withRim } from "../../../kit/src/canvas/pen.js";
import { drawHintHand, drawPause } from "../../../kit/src/canvas/screens.js";
import { bowAt, drawArcher, drawArrow, drawPlanted } from "./archer.js";
import { drawBalloon, drawPop } from "./balloons.js";
import { drawNumberCard } from "./card-art.js";
import { flickGuesses } from "./flick.js";
import { balloonAt, rulerX, shareAt } from "./layout.js";
import { THRESHOLDS } from "./levels.js";
import { stageOf } from "./numbers.js";
import { FLIGHT, aimedBalloon, balloonsIn, numberOf, scoreIn, timeLeft } from "./round.js";
import { drawAim, drawGhost, drawGuessMarker, drawRipple, drawRuler, drawThread, drawTruePlace } from "./ruler-art.js";
import { drawScenery } from "./scenery.js";
import { scoreOf, starsOf } from "./scoring.js";

const FLICK = Object.freeze({ who: "flick" });
const POP = 0.6;

export const rimmed = (ctx, theme, draw) => withRim(ctx, { ink: theme.art.ink, colour: theme.art.rim }, draw);

const sinceLanding = (round) => (round.shot?.landed ? round.time - round.shot.at - FLIGHT : null);

const flickLanded = (state) => state.last?.flick !== null && state.last?.flick !== undefined && sinceLanding(state.round) >= FLIGHT;

export function poseOf(state) {
  const { round, last, aim } = state;
  if (round?.shot && !round.shot.landed) return "release";
  if (round?.shot?.landed && last) return last.stars >= 2 ? "cheer" : "oops";
  return aim ? "aiming" : "idle";
}

function flickPose(state) {
  const since = sinceLanding(state.round);
  if (since === null || !state.last) return "idle";
  if (since < FLIGHT) return "release";
  return starsOf(Math.abs(state.last.flick - numberOf(state.round).share)) >= 2 ? "cheer" : "idle";
}

function aimAngle(archer, point) {
  const bow = bowAt(archer);
  return Math.atan2(point.y - bow.y, (archer.flip ? -1 : 1) * (point.x - bow.x));
}

function perch(ctx, { x, y, size }, colours) {
  for (const [dx, rx] of [[-0.3, 0.3], [0.05, 0.36], [0.36, 0.26]]) ellipse(ctx, x + dx * size, y + size * 0.04, rx * size, size * 0.12, colours.cloud);
}

function balloons(ctx, state, theme, time) {
  const { layout, round } = state;
  for (const one of balloonsIn(round)) {
    const at = balloonAt(layout, one);
    drawBalloon(ctx, at.x, at.y, at.size, { colour: one.colour, time, string: layout.ruler.y - at.y - at.size * 0.69 }, theme);
  }
}

function landing(state) {
  const { layout, round } = state;
  const hit = aimedBalloon(round);
  const x = rulerX(layout, round.shot.guess);
  return hit ? { ...balloonAt(layout, hit), colour: hit.colour } : { x, y: layout.ruler.y, size: 0 };
}

function threadAndMarker(ctx, state, guess, who, y, since, theme) {
  const { layout, round } = state;
  const truth = numberOf(round).share;
  const [from, to] = [rulerX(layout, guess), rulerX(layout, truth)];
  drawThread(ctx, from, to, y, { stars: starsOf(Math.abs(guess - truth)), progress: since / 0.4 }, theme);
  drawGuessMarker(ctx, from, y, 18, who, theme);
}

function revealed(ctx, state, theme) {
  const { layout, round, last, progress } = state;
  const since = sinceLanding(round);
  if (since === null || !last) return;
  const { ruler } = layout;
  const scale = clamp(layout.unit / 60, 0.6, 1);
  const mine = rulerX(layout, round.shot.guess);
  drawPlanted(ctx, mine, ruler.y + 2, { tip: progress.chosen.tip, scale }, theme);
  drawTruePlace(ctx, rulerX(layout, numberOf(round).share), ruler.y + ruler.h * 0.2, clamp(ruler.h * 0.42, 22, 30), since / 0.6, theme);
  threadAndMarker(ctx, state, round.shot.guess, "mine", layout.thread, since, theme);
  if (last.ghost !== null && last.ghost !== undefined) drawGhost(ctx, rulerX(layout, last.ghost), ruler.y - 14, 22, theme);
  if (!flickLanded(state)) return;
  drawPlanted(ctx, rulerX(layout, last.flick), ruler.y + 2, { tip: "cork", scale: scale * 0.85, rival: true }, theme);
  threadAndMarker(ctx, state, last.flick, "rival", layout.thread + 13, since - FLIGHT, theme);
}

function flights(ctx, state, theme) {
  const { layout, round, last, progress } = state;
  if (!round.shot) return;
  const scale = clamp(layout.unit / 60, 0.6, 1);
  const flown = round.time - round.shot.at;
  const target = landing(state);
  if (!round.shot.landed) drawArrow(ctx, bowAt(layout.archer), target, flown / FLIGHT, { tip: progress.chosen.tip, scale }, theme);
  drawRipple(ctx, rulerX(layout, round.shot.guess), layout.ruler.y + layout.ruler.h * 0.5, 45, flown / 0.5, theme);
  const since = sinceLanding(round);
  if (since === null || !last) return;
  if (last.popped) drawPop(ctx, target.x, target.y, target.size, since / POP, target.colour, theme);
  if (last.flick === null || since >= FLIGHT) return;
  const from = layout.flick ? bowAt(layout.flick) : { x: layout.rival?.x ?? layout.width, y: layout.bar.y + layout.bar.h };
  drawArrow(ctx, from, { x: rulerX(layout, last.flick), y: layout.ruler.y }, since / FLIGHT, { tip: "cork", scale: scale * 0.85, rival: true }, theme);
}

function archers(ctx, state, theme, time) {
  const { layout, aim } = state;
  const pose = poseOf(state);
  const point = aim ? { x: rulerX(layout, shareAt(layout, aim.x)), y: layout.ruler.y } : state.round.shot ? landing(state) : null;
  drawArcher(ctx, layout.archer.x, layout.archer.y, layout.archer.size, { player: state.player, pose, time, flip: layout.archer.flip, aim: point ? aimAngle(layout.archer, point) : -0.7 }, theme);
  if (!layout.flick || state.mode !== "flick") return;
  const target = state.last?.flick === null || !state.last ? null : { x: rulerX(layout, state.last.flick), y: layout.ruler.y };
  drawArcher(ctx, layout.flick.x, layout.flick.y, layout.flick.size, { player: FLICK, pose: flickPose(state), time: time + 0.4, flip: true, aim: target ? aimAngle(layout.flick, target) : -0.7 }, theme);
}

function rivalOf(state) {
  if (state.mode === "friend") return state.friend ?? null;
  if (state.mode !== "flick" || !state.flick) return null;
  const { round } = state;
  const answered = round.guesses.length - (round.shot?.landed && !flickLanded(state) ? 1 : 0);
  return { player: FLICK, score: scoreOf(round.numbers, flickGuesses(state.flick, Math.max(0, answered))), thinking: Boolean(round.shot?.landed) && !flickLanded(state) };
}

function timer(ctx, { timer: area }, round, ui) {
  roundedRect(ctx, area.x, area.y, area.w, area.h, area.h / 2);
  paint(ctx, ui.track, null, 0);
  const left = area.w * clamp(timeLeft(round) / round.seconds);
  if (left < area.h) return;
  roundedRect(ctx, area.x, area.y, left, area.h, area.h / 2);
  paint(ctx, ui.muted, null, 0);
}

function interfaceLayer(ctx, state, theme, time) {
  const { layout, round, progress, last } = state;
  const { ui } = theme;
  drawTopBar(ctx, layout, { score: scoreIn(round), best: progress.best, thresholds: THRESHOLDS, sound: state.sound, rival: rivalOf(state), lang: state.lang, press: state.press }, ui, time);
  timer(ctx, layout, round, ui);
  drawNumberCard(ctx, layout.card, numberOf(round).card, theme, { lang: state.lang });
  if (!round.shot?.landed || !last) return;
  const { x, y, size } = layout.stars;
  for (let star = 0; star < 3; star += 1) drawStar(ctx, x + (star - 1) * size * 1.05, y, size, star < last.stars, ui);
}

export function drawPlay(ctx, state, theme, time) {
  const { layout, round, width, height } = state;
  if (!round || !layout) return;
  const { ruler } = layout;
  const place = state.progress.chosen.place;
  ctx.save();
  rimmed(ctx, theme, () => {
    drawScenery(ctx, box(0, 0, width, height), place, theme, time, { ground: ruler.y + ruler.h * 0.6 });
    if (layout.mode === "compact") perch(ctx, layout.archer, theme.art.places[place] ?? theme.art.places.meadow);
    balloons(ctx, state, theme, time);
    drawRuler(ctx, ruler, { range: stageOf(round.setup.stage).range, ticks: round.ticks, lang: state.lang }, theme);
    if (state.aim) drawAim(ctx, rulerX(layout, shareAt(layout, state.aim.x)), layout.zone.top, ruler.y, theme);
    revealed(ctx, state, theme);
    archers(ctx, state, theme, time);
    flights(ctx, state, theme);
  });
  fadeEdges(ctx, width, height, theme.ui.page);
  interfaceLayer(ctx, state, theme, time);
  if (state.hint && !round.shot) drawHintHand(ctx, rulerX(layout, numberOf(round).share), ruler.y + ruler.h * 0.5 + 34, 76, (time % 2.4) / 2.4, theme.ui);
  if (state.paused) drawPause(ctx, state, theme.ui, { layout: pauseLayout(width, height, { fill: state.fill }) });
  ctx.restore();
}
