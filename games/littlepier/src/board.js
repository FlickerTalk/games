import { drawTopBar } from "../../../kit/src/canvas/bar.js";
import { pauseLayout } from "../../../kit/src/canvas/menu-layout.js";
import { clamp, ellipse, fadeEdges, line, paint, polygon, roundedRect, circle, withRim } from "../../../kit/src/canvas/pen.js";
import { drawHintHand, drawPause } from "../../../kit/src/canvas/screens.js";
import { drawAlbumBadge } from "./album-art.js";
import { drawAngler, rodTip } from "./angler.js";
import { drawCreature } from "./creatures.js";
import { drawFind } from "./finds.js";
import { drawBucket, drawLineAndHook, drawMoments } from "./gear.js";
import { depthOf } from "./layout.js";
import { thresholdsFor, trackOf } from "./levels.js";
import { inPond, isFind, visitorAt } from "./pond.js";
import { catchesOf, visitorsIn } from "./round.js";
import { drawBoat, drawFloor, drawPier, drawSky, drawWater } from "./scene.js";

const BIG = new Set([5, 12, 15, 16, 17]);
const SMALL = new Set([3, 10, 14, 19, 21]);
const FLED_SECONDS = 4;

export const rimmed = (ctx, theme, draw) => withRim(ctx, { ink: theme.art.ink, colour: theme.art.rim }, draw);

export const sizeOf = (kind, fish) => fish * (BIG.has(kind) ? 1.25 : SMALL.has(kind) ? 0.85 : 1);

export const flickCharm = (charm) => (charm === "star" ? "heart" : "star");

export function drawVisitor(ctx, kind, x, y, size, theme, options) {
  if (isFind(kind)) drawFind(ctx, x, y, size, kind, theme, options);
  else drawCreature(ctx, x, y, size, kind, theme, options);
}

export function drawBackdrop(ctx, frame, { day, share = 0, top = frame.sky.y }, theme, time) {
  drawSky(ctx, { x: frame.sky.x, y: top, w: frame.sky.w, h: frame.horizon - top }, day, theme, { time, share, under: frame.sky });
  drawWater(ctx, frame.water, day, theme, time);
  drawFloor(ctx, frame.floor, day, theme, time);
}

export function drawPlace(ctx, frame, place, theme, time) {
  if (place !== "boat") {
    drawPier(ctx, frame.pier, theme);
    return frame.deck;
  }
  const bob = Math.sin(time * 1.4) * 3;
  drawBoat(ctx, frame.bucket.x, frame.horizon + 5, Math.min(frame.water.w * 0.72, 420), theme, time);
  return frame.horizon - 12 + bob;
}

export function drawAnglers(ctx, frame, seatY, anglers, theme, time) {
  anglers.forEach((angler, seat) => drawAngler(ctx, frame.seats[seat].x, seatY, frame.size, { ...angler, time, flip: seat === 1 }, theme));
}

function busyIds(round) {
  return new Set([...round.caught.flat(), ...round.fled.map((one) => one.id), ...round.hooks.map((hook) => hook.fish)]);
}

function drawPond(ctx, state, theme, time) {
  const { round, layout, day } = state;
  const busy = busyIds(round);
  const night = day === "night";
  ctx.save();
  ctx.beginPath();
  ctx.rect(layout.water.x, layout.water.y, layout.water.w, layout.water.h);
  ctx.clip();
  for (const visitor of visitorsIn(round)) {
    if (busy.has(visitor.id) || !inPond(visitor, round.time, round.pace)) continue;
    const at = visitorAt(visitor, round.time, round.pace);
    drawVisitor(ctx, visitor.kind, at.x * layout.width, depthOf(layout, at.y), sizeOf(visitor.kind, layout.fish), theme, { time, direction: visitor.direction, night });
  }
  for (const fled of round.fled) {
    const gone = round.time - fled.at;
    const visitor = visitorsIn(round).find((one) => one.id === fled.id);
    if (gone > FLED_SECONDS || !visitor) continue;
    drawVisitor(ctx, visitor.kind, (fled.x + fled.direction * gone * 0.3) * layout.width, depthOf(layout, fled.y), sizeOf(visitor.kind, layout.fish), theme, { time, direction: fled.direction, smile: true, night });
  }
  ctx.restore();
}

function active(state, kind, seat, now) {
  return state.moments.some((moment) => moment.kind === kind && moment.seat === seat && now >= moment.start && now < moment.start + moment.duration);
}

export function poseOf(state, seat, time) {
  const now = time * 1000;
  if (active(state, "cheer", seat, now)) return "cheering";
  if (active(state, "laugh", seat, now)) return "laughing";
  const holding = seat === 0 ? state.holding || now < state.cast : state.flickHolding;
  if (state.round.hooks[seat].fish !== null && !holding) return "pulling";
  return holding ? "lowering" : "idle";
}

function drawLines(ctx, state, seatY, poses, theme, time) {
  const { round, layout, progress } = state;
  const hookSize = clamp(layout.size * 0.3, 20, 34);
  const visitors = visitorsIn(round);
  round.hooks.forEach((hook, seat) => {
    const tip = rodTip(layout.seats[seat].x, seatY, layout.size, { flip: seat === 1, pose: poses[seat] });
    const at = { x: layout.hooks[seat], y: Math.max(seatY + hookSize, depthOf(layout, hook.y)) };
    const charm = seat ? flickCharm(progress.chosen.charm) : progress.chosen.charm;
    drawLineAndHook(ctx, tip, at, hookSize, charm, theme, { time, flick: seat === 1 });
    if (hook.fish === null) return;
    const visitor = visitors.find((one) => one.id === hook.fish);
    ctx.save();
    ctx.translate(at.x, at.y + sizeOf(visitor.kind, layout.fish) * 0.42);
    ctx.rotate(Math.sin(time * 7) * 0.2);
    drawVisitor(ctx, visitor.kind, 0, 0, sizeOf(visitor.kind, layout.fish), theme, { time, smile: true, direction: seat ? 1 : -1 });
    ctx.restore();
  });
}

function peeking(state, time) {
  const now = time * 1000;
  return state.moments.filter((moment) => moment.kind === "bucket" && now >= moment.start && now < moment.start + moment.duration).map((moment) => moment.what);
}

function bar(ctx, state, theme, time) {
  const { layout, round, progress, mode } = state;
  const track = trackOf(mode);
  const best = track ? (progress.bests?.[track] ?? null) : progress.best;
  const shown = { score: catchesOf(round), best, thresholds: thresholdsFor(mode), sound: state.sound, rival: state.friend ?? null, lang: state.lang, press: state.press };
  drawTopBar(ctx, layout, shown, theme.ui, time);
  if (layout.album) drawAlbumBadge(ctx, layout.album, state.album.length, theme, time, state.lang);
}

function windowArt(ctx, x, y, w, theme, time) {
  const { window: art, ink } = theme.art;
  const h = w * 0.62;
  roundedRect(ctx, x, y, w, h, 14);
  paint(ctx, art.sky, ink, 3);
  ctx.save();
  roundedRect(ctx, x, y, w, h, 14);
  ctx.clip();
  circle(ctx, x + w * 0.76, y + h * 0.3, w * 0.1, art.sun);
  ellipse(ctx, x + w / 2, y + h * 1.02, w * 0.62, h * 0.45, art.hill);
  polygon(ctx, [[x + w * 0.22, y + h * 0.95], [x + w * 0.32, y + h * 0.36], [x + w * 0.42, y + h * 0.95]], art.tree);
  ctx.restore();
  line(ctx, [[x + w / 2, y], [x + w / 2, y + h]], art.frame, 6);
  line(ctx, [[x, y + h / 2], [x + w, y + h / 2]], art.frame, 6);
  const eyeY = y + h + w * 0.2;
  const look = Math.sin(time * 0.8) * w * 0.06;
  ellipse(ctx, x + w / 2, eyeY, w * 0.28, w * 0.15, art.eye, ink, 3);
  circle(ctx, x + w / 2 + look, eyeY, w * 0.09, art.iris, ink, 2);
  circle(ctx, x + w / 2 + look, eyeY, w * 0.04, ink);
  circle(ctx, x + w / 2 + look - w * 0.03, eyeY - w * 0.03, w * 0.015, art.eye);
}

function drawPauseCard(ctx, state, theme, time) {
  const layout = pauseLayout(state.width, state.height, { fill: state.fill });
  drawPause(ctx, state, theme.ui, { layout });
  const top = state.layout.sky.y + 8;
  const room = Math.min(...layout.targets.map((one) => one.y)) - 16 - top;
  const w = Math.min(220, state.width - 64, room / 0.98);
  if (w >= 80) rimmed(ctx, theme, () => windowArt(ctx, (state.width - w) / 2, top + (room - w * 0.98) / 2, w, theme, time));
}

export function drawPlay(ctx, state, theme, time) {
  const { layout, round } = state;
  if (!round || !layout) return;
  const anglers = round.hooks.map((_, seat) => ({ player: seat ? { who: "flick" } : state.player, pose: poseOf(state, seat, time) }));
  rimmed(ctx, theme, () => {
    drawBackdrop(ctx, layout, { day: state.day, share: round.time / round.seconds, top: 0 }, theme, time);
    drawPond(ctx, state, theme, time);
    const seatY = drawPlace(ctx, layout, state.progress.chosen.place, theme, time);
    drawBucket(ctx, layout.bucket.x, seatY - layout.bucket.size * 0.42, layout.bucket.size, theme, { peeking: peeking(state, time), time });
    drawAnglers(ctx, layout, seatY, anglers, theme, time);
    drawLines(ctx, state, seatY, anglers.map((one) => one.pose), theme, time);
    drawMoments(ctx, state.moments, theme, time);
  });
  fadeEdges(ctx, state.width, state.height, theme.ui.page);
  bar(ctx, state, theme, time);
  if (state.hint) drawHintHand(ctx, layout.hooks[0] + 44, depthOf(layout, 0.32), 76, (time % 2.4) / 2.4, theme.ui);
  if (state.paused) drawPauseCard(ctx, state, theme, time);
}
