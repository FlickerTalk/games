import { drawPick, pickLayout, standIn } from "../../../kit/src/avatars/index.js";
import { previewOf } from "./aim.js";
import { familyOfSide, isMyTurn, latestOf, lookOf, shownOf } from "./battle.js";
import { drawPlay } from "./board.js";
import { drawEnd, drawPrompt } from "./end-art.js";
import { drawHome } from "./home-art.js";
import { PROGRESS } from "./levels.js";
import { drawLooks } from "./looks-art.js";
import { battle, practice, windOf, worldOf } from "./rules.js";
import { SCENERIES, heightsFor, vehicleAt } from "./world.js";

export const FLICK = Object.freeze({ who: "flick" });
const STAND_IN_SEED = "AAAAAAAA";

export function sceneryOf(seed) {
  let sum = 0;
  for (const char of String(seed)) sum += char.charCodeAt(0);
  return SCENERIES[sum % SCENERIES.length];
}

function worldFor(round, shown) {
  if (shown) return { ...worldOf(shown), under: [...shown.under] };
  const field = latestOf(round)?.setup.field ?? round.field;
  return { field, seed: STAND_IN_SEED, heights: heightsFor(field, STAND_IN_SEED), craters: [], under: [false, false], practice: round.mode === "practice" };
}

function flightOf(round) {
  if (!round.flight) return null;
  const next = round.states[round.flight.index];
  return { ...round.flight, path: next.last.flight.path, torpedo: next.last.shot.kind === "torpedo", wind: next.last.wind, under: next.under };
}

function lastAngles(round) {
  const angles = [null, null];
  for (const state of round.states) if (state.last) angles[state.last.side] = state.last.shot.angle;
  return angles;
}

function rivalOf(game, shown, mySide, turnSide) {
  const { state } = game;
  if (state.round.mode === "practice") return null;
  const score = shown?.score[1 - mySide] ?? 0;
  if (state.round.mode === "flick") return { player: FLICK, score, thinking: state.flickThinking };
  return { player: standIn(state.player), score, thinking: turnSide === 1 - mySide || !shown };
}

function aimingOf(game, round, latest, world, mySide) {
  const myTurn = isMyTurn(game);
  const sub = latest?.setup && familyOfSide(round, mySide) === "sub";
  const torpedo = Boolean(sub && round.torpedo);
  if (sub && myTurn) world.under[mySide] = torpedo;
  const vehicle = vehicleAt(world, mySide);
  const anchor = { x: vehicle.x, y: vehicle.y - vehicle.size * (vehicle.family === "tank" ? 0.5 : 0.3) };
  const shot = { kind: torpedo ? "torpedo" : "ball", angle: round.aim.angle, power: round.aim.power };
  const preview = myTurn ? previewOf(latest, mySide, shot, windOf(latest)) : null;
  return { myTurn, sub: Boolean(sub), torpedo, anchor, preview };
}

export function playScene(game) {
  const { state } = game;
  const { round } = state;
  const mySide = round.mySide ?? 0;
  const shown = shownOf(round);
  const latest = latestOf(round);
  const rules = round.mode === "practice" ? practice : battle;
  const flight = flightOf(round);
  const world = worldFor(round, shown);
  if (flight) world.under = [...flight.under];
  const aiming = aimingOf(game, round, latest, world, mySide);
  const turnSide = !flight && latest?.setup && !rules.result(latest) ? rules.turn(latest) : null;
  const best = round.mode === "practice" ? (state.progress.bests?.practice ?? null) : state.progress.best;
  return {
    ...aiming,
    width: state.width, height: state.height, fill: state.fill, layout: state.layout, lang: state.lang, sound: state.sound, press: state.press, paused: state.paused,
    view: { ...state.layout.view, mirror: mySide === 1 }, mySide, world, shown, flight, turnSide,
    players: [state.player, round.mode === "practice" ? null : round.mode === "flick" ? FLICK : standIn(state.player)],
    scenery: sceneryOf(world.seed), sides: round.mode === "practice" ? [0] : [0, 1],
    looks: [0, 1].map((side) => lookOf(game, side)), balls: [0, 1].map((side) => (side === mySide ? state.progress.chosen.ball : "normal")),
    lastAngle: lastAngles(round), wind: flight ? flight.wind : latest?.setup ? windOf(latest) : 0,
    targets: shown?.targets ?? [], hitBy: round.hitBy, stains: round.stains, paths: round.paths, moments: state.moments,
    aim: round.aim, pull: round.pull, hint: !state.taught && aiming.myTurn,
    bar: { score: shown?.score[mySide] ?? 0, best, thresholds: PROGRESS.spec.stars, sound: state.sound, rival: rivalOf(game, shown, mySide, turnSide), lang: state.lang, press: state.press },
  };
}

function seatOf(game) {
  const { state, duel } = game;
  if (state.mode === "alone" || state.practice) return null;
  if (state.mode === "flick") return { player: FLICK, here: true, calling: false, away: false };
  if (!duel) return null;
  const { here, calling, away } = duel.status;
  return { player: standIn(state.player), here, calling, away };
}

export function drawFrame(ctx, game, theme, time) {
  const { state } = game;
  const { width, height, screen } = state;
  ctx.clearRect(0, 0, width, height);
  const scene = state.round && state.layout && (screen === "play" || screen === "end") ? playScene(game) : null;
  if (screen === "play") drawPlay(ctx, scene, theme, time);
  else if (screen === "end") drawEnd(ctx, state, scene, theme, time);
  else if (screen === "looks") drawLooks(ctx, state, theme, time);
  else if (screen === "avatar" && state.pick) drawPick(ctx, pickLayout(state.pick, width, height, state.lang), state.pick, { time, lang: state.lang });
  else drawHome(ctx, state, seatOf(game), theme, time);
  if (game.duel?.status.prompt && (screen === "home" || screen === "end")) drawPrompt(ctx, { ...state, player: standIn(state.player) }, theme, time);
}
