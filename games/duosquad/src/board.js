import { standIn } from "../../../kit/src/avatars/index.js";
import { DIGITS, drawDigits, drawHintHand, drawPause, drawPortrait, drawRoundButton, formatNumber, pauseLayout } from "../../../kit/src/canvas/index.js";
import { circle, clamp, ease, fadeEdges, mix, paint, roundedRect } from "../../../kit/src/canvas/pen.js";
import { CRAFT_V } from "./crafts.js";
import { drawPlayBar, orbTarget } from "./hud.js";
import { toScreen } from "./layout.js";
import { fallingOf, leftOf, seenOf } from "./rounds.js";
import { lookFor } from "./theme.js";
import { KINDS, STEP_MS, placeOf } from "./waves.js";
import { artOf } from "./worlds.js";
import { drawSeatMark } from "./marks.js";

const FLICK = Object.freeze({ who: "flick" });
const HAND = 64;
const SWEEP_SECONDS = 2.4;
const PILOT = 0.52;

const progressOf = (moment, time) => clamp((time * 1000 - moment.start) / moment.duration);

export const mateOf = (state) => ((state.round?.kind ?? state.outcome?.kind) === "friend" ? standIn(state.player) : FLICK);

const frozen = (state) => state.paused || state.round.heard?.p === 1 || state.round.sent || state.screen !== "play";

function stepNow(state) {
  const { round } = state;
  return round.step + (frozen(state) || round.step >= round.roundSteps ? 0 : Math.min(1, round.steps.carry / STEP_MS));
}

export function drawPilot(ctx, x, y, size, player, face, ui, time) {
  drawPortrait(ctx, x, y, size * PILOT, { player, face }, ui, { time });
}

function boss(ctx, state, at, art, look, time) {
  const { round, layout } = state;
  const group = round.schedule.groups.at(-1);
  const age = at - round.tally.starts[group.at];
  if (group.formation !== "boss" || age < 0) return;
  const cores = group.enemies.map((enemy) => toScreen(layout, ...Object.values(placeOf(group, enemy, age, round.schedule.pace))));
  const open = group.enemies.map((enemy) => round.tally.pops.has(enemy.id));
  art.drawBoss(ctx, (cores[0][0] + cores[1][0]) / 2, (cores[0][1] + cores[1][1]) / 2, Math.abs(cores[1][0] - cores[0][0]) / 2, look, { time, open });
}

function enemies(ctx, state, at, art, look, time) {
  const { round, layout } = state;
  for (const { enemy, u, v } of seenOf(round, layout, at)) {
    const [x, y] = toScreen(layout, u, v);
    const { need, size } = KINDS[enemy.kind];
    const shaken = state.moments.find((one) => one.kind === "hit" && one.id === enemy.id);
    art.drawEnemy(ctx, x, y, size * layout.unit, enemy.kind, look, {
      time, hit: shaken ? Math.max(0.01, progressOf(shaken, time)) : 0, left: 1 - (round.tally.hits.get(enemy.id) ?? 0) / need, owner: enemy.owner ?? 0, variant: enemy.id,
    });
  }
}

function thrown(ctx, state, at, art, look, time) {
  const { round, layout } = state;
  for (const one of fallingOf(round, layout, at)) art.drawHazard(ctx, ...toScreen(layout, one.u, one.v), one.r * 2, look, time + one.key);
}

function bolts(ctx, state, art, look, time) {
  const { round, layout } = state;
  const size = clamp(layout.unit * 0.07, 18, 30);
  for (const craft of round.crafts) for (const bolt of craft.bolts) art.drawBolt(ctx, ...toScreen(layout, bolt.u, bolt.v), size, look, { seat: craft.seat, wide: bolt.wide, time });
}

const faceOf = (craft, state) => (craft.caught > 0 ? "dizzy" : state.screen === "end" ? "cheering" : "confident");

function crafts(ctx, state, art, look, theme, time) {
  const { round, layout } = state;
  const places = round.crafts.map((craft) => toScreen(layout, craft.u, CRAFT_V));
  if (round.joined && state.screen === "play") art.drawLink(ctx, { x: places[0][0], y: places[0][1] }, { x: places[1][0], y: places[1][1] }, look, time);
  for (const craft of [round.crafts[1 - round.seat], round.crafts[round.seat]]) {
    const [x, y] = places[craft.seat];
    const hull = round.hulls[craft.seat];
    art.drawCraft(ctx, x, y, layout.craft, hull, look, { seat: craft.seat, time, bank: craft.bank, caught: craft.caught > 0 });
    const [dx, dy] = art.cockpitOf(hull);
    drawPilot(ctx, x + dx * layout.craft, y + dy * layout.craft, layout.craft, craft.seat === round.seat ? state.player : mateOf(state), faceOf(craft, state), theme.ui, time);
    if (craft.caught > 0) art.drawCaught(ctx, x, y, layout.craft, look, time);
  }
}

function moments(ctx, state, art, look, time) {
  const { round, layout } = state;
  for (const moment of state.moments) {
    const t = progressOf(moment, time);
    if (moment.kind === "freed") art.drawFreed(ctx, ...toScreen(layout, round.crafts[moment.seat].u, CRAFT_V), layout.craft, t, look);
    if (moment.u === undefined) continue;
    const [x, y] = toScreen(layout, moment.u, moment.v);
    if (moment.kind === "pop") {
      const size = KINDS[moment.look].size * layout.unit;
      art.drawPop(ctx, x, y, size, moment.look, t, look, time);
      ctx.save();
      ctx.globalAlpha = 1 - t;
      drawSeatMark(ctx, x, y - t * size * 0.4, Math.max(16, size * 0.34), moment.by, look.bodies[moment.by][0], look.ink, 2);
      ctx.restore();
    } else if (moment.kind === "block") art.drawFreed(ctx, x, y, layout.unit * 0.08, t, look);
  }
}

function orbs(ctx, state, art, look, time) {
  const { layout } = state;
  const goal = orbTarget(layout);
  for (const moment of state.moments) {
    if (moment.kind !== "orb") continue;
    const t = ease(progressOf(moment, time));
    const [x, y] = toScreen(layout, moment.u, moment.v);
    ctx.save();
    ctx.globalAlpha = 1 - clamp((t - 0.75) * 4);
    art.drawOrb(ctx, mix(x, goal.x, t), mix(y, goal.y, t) - Math.sin(t * Math.PI) * 30, 22 * (1 - t * 0.4), look, time);
    ctx.restore();
  }
}

function pips(ctx, state, ui) {
  const { round, layout } = state;
  const { groups } = round.schedule;
  const { field } = layout;
  const wide = Math.min(field.w - 40, groups.length * 16);
  const each = wide / groups.length;
  groups.forEach((group, at) => {
    const cleared = group.enemies.every((enemy) => round.tally.pops.has(enemy.id));
    roundedRect(ctx, field.x + (field.w - wide) / 2 + at * each + 1.5, field.y + 8, each - 3, 4, 2);
    paint(ctx, cleared ? ui.accent : ui.track);
  });
}

const running = (state, now) => state.screen === "play" && now >= state.round.startAt && state.round.step < state.round.roundSteps && !state.paused;

export function handAt(state, time) {
  const { round, layout, taught } = state;
  if (!round) return null;
  const [me, mate] = [round.crafts[round.seat], round.crafts[1 - round.seat]];
  const y = toScreen(layout, 0, CRAFT_V)[1] + layout.craft * 0.2;
  if (!taught.includes("steer")) {
    const sweep = Math.sin(((time % SWEEP_SECONDS) / SWEEP_SECONDS) * Math.PI * 2);
    return { x: toScreen(layout, clamp(me.u + sweep * 0.22, 0.1, 0.9), 0)[0], y, press: 0.25, lesson: "steer" };
  }
  if (!taught.includes("free") && mate.caught > 0 && me.caught <= 0) {
    const along = ease((time % SWEEP_SECONDS) / SWEEP_SECONDS);
    return { x: toScreen(layout, mix(me.u, mate.u, along), 0)[0], y, press: 0.25, lesson: "free" };
  }
  return null;
}

function hint(ctx, state, theme, time) {
  const hand = handAt(state, time);
  if (hand) drawHintHand(ctx, hand.x, Math.min(hand.y, state.layout.field.y + state.layout.field.h - HAND * 0.7), HAND, hand.press, theme.ui);
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

function barOf(state, art, look) {
  const { round } = state;
  const { scores, total } = round.tally;
  return {
    score: total, best: state.progress.best, left: leftOf(round), sound: state.sound, press: state.press, lang: state.lang,
    me: { player: state.player, score: scores[round.seat], face: "happy" },
    mate: { player: mateOf(state), score: scores[1 - round.seat], face: "happy" },
    drawOrb: (pen, x, y, size, time) => art.drawOrb(pen, x, y, size, look, time),
  };
}

export function drawPlay(ctx, game, theme, time) {
  const { state } = game;
  const { round, layout } = state;
  if (!round || !layout) return;
  const now = game.now();
  const art = artOf(round.world);
  const look = lookFor(theme, round.world);
  const at = stepNow(state);
  const { field } = layout;
  art.drawScenery(ctx, { x: 0, y: 0, w: state.width, h: state.height }, round.zone, look, time);
  fadeEdges(ctx, state.width, state.height, theme.ui.page);
  ctx.save();
  ctx.beginPath();
  ctx.rect(field.x, field.y, field.w, field.h);
  ctx.clip();
  boss(ctx, state, at, art, look, time);
  enemies(ctx, state, at, art, look, time);
  thrown(ctx, state, at, art, look, time);
  bolts(ctx, state, art, look, time);
  crafts(ctx, state, art, look, theme, time);
  moments(ctx, state, art, look, time);
  ctx.restore();
  pips(ctx, state, theme.ui);
  if (running(state, now)) hint(ctx, state, theme, time);
  countdown(ctx, state, theme, now);
  if (round.heard?.p === 1 && !state.paused) drawRoundButton(ctx, "pause", field.x + field.w / 2, field.y + field.h / 2, 88, theme.ui);
  drawPlayBar(ctx, layout, barOf(state, art, look), theme, time);
  orbs(ctx, state, art, look, time);
  if (state.paused) drawPause(ctx, state, theme.ui, { layout: pauseLayout(state.width, state.height, { fill: state.fill }) });
}
