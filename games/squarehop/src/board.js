import { centreOf, drawHintHand, drawPause, pauseLayout } from "../../../kit/src/canvas/index.js";
import { fadeEdges } from "../../../kit/src/canvas/pen.js";
import { drawBar } from "./bar-art.js";
import { drawDie } from "./dice-art.js";
import { drawBurst, drawDust, drawMiss, drawSplash, drawZoom } from "./effects-art.js";
import { rivalOf } from "./flow.js";
import { squareAt } from "./layout.js";
import { drawPiece, drawSnail, drawTurnMarker, faceFor } from "./pieces.js";
import { TIMES, diceShown, spotsOf, trailOf, turnOf } from "./round.js";
import { drawScenery } from "./scenery.js";
import { drawTrack } from "./track-art.js";

const HINT_LOOP = 1.8;
const EFFECT_MS = 500;
const LANDED = { spring: drawBurst, finish: drawBurst, turbo: drawZoom, puddle: drawSplash };

export function drawStage(ctx, state, theme, time) {
  drawScenery(ctx, state.progress.chosen.track, { x: 0, y: 0, w: state.width, h: state.height }, theme, time);
  fadeEdges(ctx, state.width, state.height, theme.ui.page);
}

export function pointAt(track, square) {
  const low = Math.floor(square);
  const [from, to] = [squareAt(track, low), squareAt(track, Math.min(track.count, low + 1))];
  const part = square - low;
  return { x: from.x + (to.x - from.x) * part, y: from.y + (to.y - from.y) * part };
}

const plateOf = (round, side) => (side === round.me ? 0 : 1);
const playerOf = (state, side) => (side === state.round.me ? state.player : rivalOf(state));

function pieces(ctx, state, theme, time, now) {
  const { round } = state;
  const { track } = state.layout;
  const spots = spotsOf(round, now);
  const turn = turnOf(round);
  const together = Math.abs(spots[0].square - spots[1].square) < 0.01;
  const moving = round.move && now >= round.move.start ? round.move.event.side : null;
  const order = moving === 0 ? [1, 0] : [0, 1];
  for (const side of order) {
    const spot = spots[side];
    const point = pointAt(track, spot.square);
    const shift = together ? (plateOf(round, side) === 0 ? -0.22 : 0.22) * track.cell : 0;
    const wobble = spot.state === "bumped" ? Math.sin(time * 14) * 0.12 : 0;
    drawPiece(ctx, point.x + shift, point.y - track.cell * 0.06, track.cell * 0.92, plateOf(round, side), playerOf(state, side), theme, {
      face: faceFor(spot.state, side === turn),
      time,
      lift: spot.lift,
      wobble,
    });
    if (round.race.wait[side] && moving !== side) drawSnail(ctx, point.x + shift + track.cell * 0.34, point.y + track.cell * 0.3, track.cell * 0.5, theme, time);
  }
  if (moving === null && round.race.winner === null && round.dice) {
    const point = pointAt(track, spots[turn].square);
    const shift = together ? (plateOf(round, turn) === 0 ? -0.22 : 0.22) * track.cell : 0;
    drawTurnMarker(ctx, point.x + shift, point.y - track.cell * 0.82, Math.max(18, track.cell * 0.42), plateOf(round, turn), theme, time);
  }
}

function effects(ctx, state, theme, now) {
  const { move } = state.round;
  const { track } = state.layout;
  if (!move || now < move.start) return;
  const { event, stages } = move;
  const t = now - move.start;
  const hopped = Math.floor((t - TIMES.choose) / TIMES.hop);
  if (hopped >= 1 && hopped <= stages.hops) {
    const point = pointAt(track, event.from + hopped);
    drawDust(ctx, point.x, point.y + track.cell * 0.36, track.cell, (t - TIMES.choose - hopped * TIMES.hop) / TIMES.hop, theme);
  }
  const landed = LANDED[event.kind];
  if (landed && t >= stages.hopped && t < stages.hopped + EFFECT_MS) {
    const point = pointAt(track, event.landed);
    landed(ctx, point.x, point.y, track.cell * 1.2, (t - stages.hopped) / EFFECT_MS, theme);
  }
  if (event.bumped && t >= stages.special && t < stages.special + EFFECT_MS) {
    const point = pointAt(track, event.bumped.from);
    drawBurst(ctx, point.x, point.y, track.cell * 1.1, (t - stages.special) / EFFECT_MS, theme);
  }
}

function dieState(shown, at) {
  if (shown.state !== "chosen") return shown.state;
  return shown.chosen === at ? "chosen" : "unchosen";
}

function dice(ctx, state, theme, time, now, open) {
  const { round, layout, press } = state;
  const shown = diceShown(round, now);
  const mine = plateOf(round, shown.side) === 0;
  const look = mine ? (theme.art.dice[state.progress.chosen.dice] ?? theme.art.dice.cream) : theme.art.rivalDice;
  layout.dice.forEach((area, at) => {
    const [x, y] = centreOf(area);
    const size = Math.min(area.w, area.h) * 0.8;
    const pressed = open && press?.kind === "die" && press.value === at;
    drawDie(ctx, x, y, size, shown.faces?.[at] ?? 1, look, theme, { state: dieState(shown, at), time: time + at * 0.37, pressed });
  });
  for (const moment of state.moments) {
    if (moment.kind !== "miss") continue;
    const [x, y] = centreOf(layout.dice[moment.die]);
    drawMiss(ctx, x, y, layout.dice[moment.die].w, (now - moment.start) / moment.duration, theme);
  }
}

function hint(ctx, state, theme, time) {
  const [first, second] = state.layout.dice.map((area) => centreOf(area));
  const loop = (time % HINT_LOOP) / HINT_LOOP;
  const part = loop < 0.5 ? 0 : 1;
  const [x, y] = part ? second : first;
  const size = Math.min(84, state.layout.dice[0].w * 0.7);
  drawHintHand(ctx, x + size * 0.16, y + size * 0.42, size, (loop * 2) % 1, theme.ui);
}

export function barShown(state, now) {
  const { round } = state;
  const spots = spotsOf(round, now);
  const turn = round.race.winner === null && round.dice ? plateOf(round, turnOf(round)) : null;
  const sideOf = (plate) => (plate === 0 ? round.me : 1 - round.me);
  const shown = (plate) => {
    const side = sideOf(plate);
    return { player: playerOf(state, side), square: Math.floor(spots[side].square + 0.001), face: faceFor(spots[side].state, turn === plate) };
  };
  const waiting = round.kind !== "pair" && (turn === 1 || !round.dice) && !round.move && round.race.winner === null;
  return { sound: state.sound, press: state.press, lang: state.lang, me: shown(0), other: { ...shown(1), thinking: waiting }, turn };
}

export function drawPlay(ctx, state, theme, time, { open = false } = {}) {
  const { round, layout } = state;
  if (!round || !layout) return;
  const now = time * 1000;
  ctx.save();
  drawStage(ctx, state, theme, time);
  drawTrack(ctx, layout.track, theme, { trail: trailOf(round, now), time, lang: state.lang });
  pieces(ctx, state, theme, time, now);
  effects(ctx, state, theme, now);
  dice(ctx, state, theme, time, now, open);
  drawBar(ctx, layout, barShown(state, now), theme, time);
  if (state.hint && open && !state.paused) hint(ctx, state, theme, time);
  if (state.paused) drawPause(ctx, state, theme.ui, { layout: pauseLayout(state.width, state.height, { fill: state.fill }) });
  ctx.restore();
}
