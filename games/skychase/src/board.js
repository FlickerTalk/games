import { drawAvatar, standIn } from "../../../kit/src/avatars/index.js";
import { DIGITS, drawDigits, drawPause, formatNumber, pauseLayout } from "../../../kit/src/canvas/index.js";
import { circle, clamp, roundedRect } from "../../../kit/src/canvas/pen.js";
import { drawAircraft } from "./aircraft.js";
import { apart, hidden, shipAt } from "./arena.js";
import { drawBalloonPop, drawTally } from "./balloons.js";
import { poseOf } from "./craft.js";
import { drawAimRing, drawCork, drawSteerHint, drawWrapMarker } from "./effects.js";
import { drawPlayBar } from "./hud.js";
import { CRAFT, headingOn, pointOf } from "./layout.js";
import { LOCK, balloonsOf } from "./match.js";
import { leftOf } from "./rounds.js";
import { drawSky } from "./sky.js";
import { drawAirship, drawCloud, drawRainbowRing, drawWindStream } from "./weather.js";

const HINT_LOOP = 1.8;
const FLICK = Object.freeze({ who: "flick" });
const FACES = { losing: "laughing", hit: "surprised" };
// the share of a pop's moment its cork takes to arrive
const CORK = 0.22;

const progressOf = (moment, time) => clamp((time * 1000 - moment.start) / moment.duration);

function whoOf(state, seat) {
  const { round, player } = state;
  if (seat === round.seat) return player;
  return round.kind === "flick" ? FLICK : standIn(player);
}

export function actorsOf(state) {
  const { round, layout } = state;
  const { match } = round;
  const actors = match.crafts.map((craft, seat) => {
    const [x, y] = pointOf(layout, craft.x, craft.y);
    const pose = poseOf(craft);
    return {
      seat, x, y, pose, mine: seat === round.seat, size: CRAFT * layout.arena.unit, heading: headingOn(layout, craft.hx, craft.hy),
      who: whoOf(state, seat), ...round.looks[seat], balloons: balloonsOf(match, seat), squared: seat !== round.seat,
      hidden: hidden(match.sky, craft), aim: clamp(craft.lock / LOCK), face: FACES[pose] ?? "happy",
    };
  });
  return actors.sort((one, two) => Number(one.mine) - Number(two.mine));
}

export function copiesOf({ arena }, x, y, reach) {
  const across = x - arena.x < reach ? [0, arena.w] : arena.x + arena.w - x < reach ? [0, -arena.w] : [0];
  const down = y - arena.y < reach ? [0, arena.h] : arena.y + arena.h - y < reach ? [0, -arena.h] : [0];
  return down.flatMap((dy) => across.map((dx) => [x + dx, y + dy]));
}

function actor(ctx, layout, one, theme, time) {
  const pilot = (pen, x, y, size) => drawAvatar(pen, x, y, size, { ...one.who, face: one.face, time });
  for (const [x, y] of copiesOf(layout, one.x, one.y, one.size * 0.9)) {
    drawAircraft(ctx, one.craft, x, y, one.size, theme, { heading: one.heading, pose: one.pose, colour: one.colour, time: time + one.seat, balloons: one.balloons, squared: one.squared, hidden: one.hidden, pilot });
  }
}

function windBand(ctx, layout, wind, theme, time) {
  const { arena } = layout;
  const [from, tall] = [wind.y * arena.unit, wind.tall * arena.unit];
  const area = arena.side ? { x: arena.x + from, y: arena.y, w: tall, h: arena.h } : { x: arena.x, y: arena.y + from, w: arena.w, h: tall };
  drawWindStream(ctx, area, wind.push, theme, { time, upright: arena.side });
}

function below(ctx, state, theme, time) {
  const { round, layout } = state;
  const { sky, step } = round.match;
  const { unit } = layout.arena;
  if (sky.wind) windBand(ctx, layout, sky.wind, theme, time);
  if (sky.ring) {
    const lit = state.moments.find((one) => one.kind === "ring");
    drawRainbowRing(ctx, ...pointOf(layout, sky.ring.x, sky.ring.y), sky.ring.r * unit, theme, { time, lit: lit ? progressOf(lit, time) : 0 });
  }
  if (!sky.airship) return;
  const ship = shipAt(sky.airship, step);
  const [x, y] = pointOf(layout, ship.x, ship.y);
  for (const [cx, cy] of copiesOf(layout, x, y, ship.r * unit)) drawAirship(ctx, cx, cy, ship.r * unit * 2, theme, { time, way: ship.drift });
}

function clouds(ctx, state, theme, time) {
  const { round, layout } = state;
  round.match.sky.clouds.forEach((cloud, at) => {
    const [x, y] = pointOf(layout, cloud.x, cloud.y);
    const size = cloud.r * layout.arena.unit * 2.3;
    for (const [cx, cy] of copiesOf(layout, x, y, size / 2)) drawCloud(ctx, cx, cy, size, theme, { time: time + at });
  });
}

function pops(ctx, state, theme, time) {
  const { layout } = state;
  const { unit } = layout.arena;
  for (const moment of state.moments) {
    if (moment.kind !== "pop") continue;
    const t = progressOf(moment, time);
    const to = pointOf(layout, moment.x, moment.y);
    const { dx, dy } = apart(moment.from, moment);
    const [sx, sy] = headingOn(layout, dx * unit, dy * unit);
    if (t < CORK) drawCork(ctx, [to[0] - sx, to[1] - sy], to, CRAFT * unit * 0.24, t / CORK, theme);
    else drawBalloonPop(ctx, to[0], to[1], CRAFT * unit * 0.9, (t - CORK) / (1 - CORK), theme);
  }
}

function edges(ctx, layout, mine, theme, time) {
  const { arena } = layout;
  const near = mine.size * 0.9;
  const size = Math.min(34, mine.size * 0.5);
  const [hx, hy] = mine.heading;
  if (hx < -0.3 && mine.x - arena.x < near) drawWrapMarker(ctx, arena.x + size * 0.6, mine.y, size, "left", theme, time);
  if (hx > 0.3 && arena.x + arena.w - mine.x < near) drawWrapMarker(ctx, arena.x + arena.w - size * 0.6, mine.y, size, "right", theme, time);
  if (hy < -0.3 && mine.y - arena.y < near) drawWrapMarker(ctx, mine.x, arena.y + size * 0.6, size, "up", theme, time);
  if (hy > 0.3 && arena.y + arena.h - mine.y < near) drawWrapMarker(ctx, mine.x, arena.y + arena.h - size * 0.6, size, "down", theme, time);
}

function scene(ctx, state, theme, time) {
  const { layout } = state;
  const { arena } = layout;
  const actors = actorsOf(state);
  ctx.save();
  roundedRect(ctx, arena.x, arena.y, arena.w, arena.h, Math.min(14, arena.w / 8));
  ctx.clip();
  below(ctx, state, theme, time);
  for (const one of actors) actor(ctx, layout, one, theme, time);
  clouds(ctx, state, theme, time);
  for (const one of actors) {
    if (one.aim > 0) drawAimRing(ctx, one.x - one.heading[0] * one.size * 0.45, one.y - one.heading[1] * one.size * 0.45, one.size * 0.55, one.aim, theme, time);
  }
  pops(ctx, state, theme, time);
  const mine = actors.find((one) => one.mine);
  if (mine.pose !== "losing") edges(ctx, layout, mine, theme, time);
  ctx.restore();
  return { actors, mine };
}

function hint(ctx, state, mine, theme, time) {
  if (state.taught) return;
  const { arena } = state.layout;
  const size = Math.min(72, arena.unit * 0.24);
  const [hx, hy] = mine.heading;
  const reach = arena.unit * 0.3;
  const to = [mine.x + (hx * 0.5 - hy * 0.85) * reach, mine.y + (hy * 0.5 + hx * 0.85) * reach];
  const inside = [Math.min(arena.x + arena.w - size / 2, Math.max(arena.x + size / 2, to[0])), Math.min(arena.y + arena.h - size * 0.7, Math.max(arena.y + size / 2, to[1]))];
  drawSteerHint(ctx, [mine.x, mine.y], inside, size, (time % HINT_LOOP) / HINT_LOOP, theme);
}

function countdown(ctx, state, theme, now) {
  const { round, layout } = state;
  const left = round.startAt - now;
  if (left <= 0) return;
  const { arena } = layout;
  const [x, y] = [arena.x + arena.w / 2, arena.y + arena.h / 2];
  const size = Math.min(88, arena.unit * 0.3);
  circle(ctx, x, y, size / 2, theme.ui.surface, theme.ui.border, theme.ui.line);
  drawDigits(ctx, formatNumber(Math.ceil(left / 1000), state.lang), x, y, Math.max(DIGITS.best, Math.min(DIGITS.big, size * 0.5)), theme.ui.text, "center");
}

export function drawPlay(ctx, game, theme, time) {
  const { state } = game;
  const { round, layout } = state;
  if (!round || !layout) return;
  const { arena } = layout;
  drawSky(ctx, arena, round.place, theme, { side: arena.side });
  const { actors, mine } = scene(ctx, state, theme, time);
  for (const one of actors) drawTally(ctx, layout.tallies[one.mine ? 0 : 1], one.balloons, theme, { squared: one.squared });
  hint(ctx, state, mine, theme, time);
  countdown(ctx, state, theme, game.now());
  drawPlayBar(ctx, layout, { me: state.player, rival: whoOf(state, 1 - round.seat), left: leftOf(round), sound: state.sound, press: state.press, lang: state.lang }, theme, time);
  if (state.paused) drawPause(ctx, state, theme.ui, { layout: pauseLayout(state.width, state.height, { fill: state.fill }) });
}
