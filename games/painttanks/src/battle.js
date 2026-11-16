import { randomOf, seedOf } from "../../../kit/src/canvas/random.js";
import { FIRST_AIM, anchorOf } from "./aim.js";
import { LOOKS, PROGRESS, roundSetup, wonRound } from "./levels.js";
import { toScreen } from "./layout.js";
import { robotShot } from "./robot.js";
import { battle, encodeShot, practice, setupMove } from "./rules.js";
import { familyOf } from "./world.js";
import { landed } from "./impact.js";

export const TIMES = Object.freeze({ settle: 450, end: 1400, think: 1100, dive: 500, recoil: 320 });
const RIVAL_LOOKS = Object.freeze({ tank: "long", ship: "paddle", sub: "whale" });

export const roundKey = (state) => `round/${state.chat ?? "-"}`;
const rulesOf = (round) => (round.mode === "practice" ? practice : battle);

export const latestOf = (round) => round?.states.at(-1) ?? null;
export const shownOf = (round) => (round && round.shown >= 0 ? round.states[round.shown] : null);

export function familyOfSide(round, side) {
  const state = latestOf(round);
  const field = state?.setup.field ?? round.field;
  return familyOf(field, side, { practice: round.mode === "practice" });
}

export function lookOf(game, side) {
  const { round, progress } = game.state;
  const family = familyOfSide(round, side);
  if (side === round.mySide) return progress.chosen[family];
  if (round.mode === "flick") return RIVAL_LOOKS[family];
  return LOOKS[family].find((look) => look !== progress.chosen[family]);
}

export function isMyTurn(game) {
  const { round, screen, paused } = game.state;
  if (screen !== "play" || paused || !round || round.flight || round.endAt !== null || round.mySide === null) return false;
  const state = latestOf(round);
  if (!state?.setup || round.shown !== round.states.length - 1 || game.now() < round.settledAt) return false;
  const rules = rulesOf(round);
  return !rules.result(state) && rules.turn(state) === round.mySide;
}

export function anchorOnScreen(game) {
  const { round, layout } = game.state;
  const state = latestOf(round);
  if (!state?.setup || !layout) return [layout?.width / 2 || 0, layout?.height / 2 || 0];
  const { x, y } = anchorOf(state, round.mySide);
  return toScreen({ ...layout.view, mirror: round.mySide === 1 }, x, y);
}

function makeRound(game, { mode, field, mySide, moves = [] }) {
  return { mode, field, mySide, moves, states: [], shown: -1, flight: null, settledAt: 0, endAt: null, flickAt: null, aim: { ...FIRST_AIM }, torpedo: false, pull: null, stains: [], paths: [null, null], sentSetup: null, tries: 0, skill: roundSetup(game.state.progress).skill };
}

function replay(round) {
  const rules = rulesOf(round);
  let state = rules.initial();
  round.states = [];
  for (const move of round.moves) {
    const played = rules.play(state, move, rules.turn(state));
    if (played.error) break;
    state = played.state;
    round.states.push(state);
  }
  round.moves = round.moves.slice(0, round.states.length);
}

function keep(game) {
  const { round } = game.state;
  if (round.mode === "friend") return;
  const kept = { v: 1, mode: round.mode, field: round.field, mySide: round.mySide, moves: round.moves };
  game.run(() => game.store?.set(roundKey(game.state), JSON.stringify(kept)));
}

function freshMoves(game, mode) {
  const { state } = game;
  const setup = roundSetup(state.progress);
  const seed = seedOf(`${game.random()}/${game.random()}/${game.now()}`);
  return [setupMove({ field: state.variant, wind: setup.wind, seed, practice: mode === "practice" })];
}

function localRound(game, mode) {
  const { state } = game;
  const kept = state.resume;
  if (kept?.mode === mode && kept.field === state.variant && Array.isArray(kept.moves)) {
    const round = makeRound(game, { mode, field: kept.field, mySide: kept.mySide, moves: kept.moves.filter((move) => typeof move === "string") });
    replay(round);
    if (round.states.length && !rulesOf(round).result(latestOf(round))) return round;
  }
  const mySide = mode === "flick" ? state.flickRounds % 2 : 0;
  if (mode === "flick") {
    state.flickRounds += 1;
    game.saveOwn();
  }
  const round = makeRound(game, { mode, field: state.variant, mySide, moves: freshMoves(game, mode) });
  replay(round);
  return round;
}

export function modeOf(state) {
  if (state.mode === "alone" || state.practice) return "practice";
  return state.mode;
}

export async function beginRound(game) {
  const { state } = game;
  const mode = modeOf(state);
  let round;
  if (mode === "friend") {
    await game.duel.start();
    round = makeRound(game, { mode, field: state.variant, mySide: null });
  } else round = localRound(game, mode);
  Object.assign(state, { round, screen: "play", paused: false, outcome: null, moments: [], resume: null, flickThinking: false });
  syncFriend(game);
  game.resize(state.width, state.height, state.fill);
  game.sound.music("playful");
  keep(game);
}

export function syncFriend(game) {
  const { round } = game.state;
  if (round?.mode !== "friend" || !game.duel) return;
  const seen = game.duel.round;
  if (!seen) return;
  if (round.index !== undefined && round.index !== seen.index) Object.assign(round, makeRound(game, { mode: "friend", field: round.field, mySide: seen.mySide }));
  round.index = seen.index;
  round.mySide = seen.mySide;
  round.states = seen.states;
  if (round.shown > round.states.length - 1) round.shown = round.states.length - 1;
  if (seen.needsSetup && seen.myTurn && round.sentSetup !== seen.index && game.state.screen === "play") {
    round.sentSetup = seen.index;
    const [move] = freshMoves(game, "friend");
    game.run(() => game.duel.play(move));
  }
}

export function applyMove(game, move) {
  const { round } = game.state;
  if (round.mode === "friend") return game.run(() => game.duel.play(move));
  const rules = rulesOf(round);
  const state = latestOf(round);
  const played = rules.play(state, move, rules.turn(state));
  if (played.error) return false;
  round.moves = [...round.moves, move];
  round.states = [...round.states, played.state];
  keep(game);
  return true;
}

export function fire(game) {
  if (!isMyTurn(game)) return false;
  const { round } = game.state;
  const torpedo = round.torpedo && familyOfSide(round, round.mySide) === "sub";
  const { angle, power } = round.aim;
  const shot = torpedo ? { kind: "torpedo", angle: Math.max(-45, Math.min(45, angle)), power } : { kind: "ball", angle: Math.max(5, angle), power };
  if (!game.state.taught) {
    game.state.taught = true;
    game.saveOwn();
  }
  applyMove(game, encodeShot(shot));
  stepRound(game, game.now());
  return true;
}

function flickTurn(game, now) {
  const { round, state } = { round: game.state.round, state: latestOf(game.state.round) };
  const flickSide = 1 - round.mySide;
  const waiting = round.mode === "flick" && !round.flight && round.endAt === null && round.shown === round.states.length - 1 && now >= round.settledAt;
  game.state.flickThinking = waiting && state?.setup && !battle.result(state) && battle.turn(state) === flickSide;
  if (!game.state.flickThinking) {
    round.flickAt = null;
    return;
  }
  if (round.flickAt === null) round.flickAt = now + TIMES.think;
  if (now < round.flickAt) return;
  round.flickAt = null;
  const random = randomOf(`${state.setup.seed}/flick/${state.shots}`);
  applyMove(game, robotShot(state, flickSide, { skill: round.skill, random, tries: round.tries }));
  round.tries += 1;
}

function startFlight(game, now) {
  const { round } = game.state;
  const next = round.states[round.shown + 1];
  if (!next.last) {
    round.shown += 1;
    return;
  }
  const { side, flight } = next.last;
  const before = shownOf(round);
  const dived = before && before.under[side] !== next.under[side];
  round.flight = { index: round.shown + 1, side, start: now, delay: dived ? TIMES.dive : 0, duration: Math.max(200, flight.time * 1000) };
  game.state.moments.push({ kind: "recoil", side, start: now + round.flight.delay, duration: TIMES.recoil });
  if (dived) game.state.moments.push({ kind: "dive", side, under: next.under[side], start: now, duration: TIMES.dive });
  game.sound.play("whoosh");
}

export function stepRound(game, now) {
  const { round } = game.state;
  if (!round || game.state.screen !== "play") return;
  syncFriend(game);
  const { flight } = round;
  if (flight && now >= flight.start + flight.delay + flight.duration) {
    round.flight = null;
    round.shown = flight.index;
    round.settledAt = now + TIMES.settle;
    landed(game, round.states[flight.index], now);
  } else if (!flight && round.shown < round.states.length - 1 && now >= round.settledAt) startFlight(game, now);
  const shown = shownOf(round);
  if (!round.flight && round.endAt === null && shown && round.shown === round.states.length - 1 && rulesOf(round).result(shown)) round.endAt = now + TIMES.end;
  if (round.endAt !== null && now >= round.endAt) {
    round.endAt = Infinity;
    game.run(() => endRound(game));
  }
  flickTurn(game, now);
}

export async function endRound(game) {
  const { state } = game;
  const { round } = state;
  const final = shownOf(round);
  const result = rulesOf(round).result(final);
  const isPractice = round.mode === "practice";
  const score = final.score[round.mySide];
  const won = wonRound({ practice: isPractice, winner: result.winner, mySide: round.mySide, score });
  const award = PROGRESS.awardRound(state.progress, { won, score, track: isPractice ? "practice" : undefined });
  state.progress = award.record;
  game.saveProgress();
  const best = isPractice ? award.record.bests.practice : award.record.best;
  const rival = isPractice ? null : { score: final.score[1 - round.mySide] };
  state.outcome = { score, stars: award.stars, best, newBest: award.newBest, gift: award.gift, opened: false, won, rival, winner: result.winner };
  state.screen = "end";
  if (won) state.moments.push({ kind: "confetti", start: game.now(), duration: 2200 });
  game.sound.play(rival && !won ? "lose-soft" : award.stars >= 2 ? "win" : "star");
  if (round.mode !== "friend") await game.store?.set(roundKey(state), "null");
}

export async function againRound(game) {
  const { state } = game;
  if (state.round?.mode === "friend" && modeOf(state) === "friend") {
    await game.duel.again();
    Object.assign(state, { screen: "play", outcome: null, moments: [] });
    syncFriend(game);
    game.resize(state.width, state.height, state.fill);
    return;
  }
  await beginRound(game);
}
