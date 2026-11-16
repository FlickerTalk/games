import { FLICK_PACE, flickHit } from "./flick.js";
import { CHEER_MS, ENTER_MS, IMPACT_MS, LEAVE_MS, SPLIT_MS, TONGUE_MS } from "./motion.js";
import { golemOf, strike, turnOf } from "./round.js";
import { END_MS, fastForward, hintOf, roundKey, savedRound } from "./rounds.js";

const KEPT = ["alone", "flick"];
const SETTLE_MS = 320;
const seconds = (ms) => ms / 1000;

export function keepRound(game) {
  const { state } = game;
  const { round } = state;
  if (!round || !KEPT.includes(round.kind) || round.core.over) return;
  game.run(() => game.store?.set(roundKey(state), savedRound(round)));
}

function clinked(game, round, mine, now) {
  Object.assign(round, { tongueUntil: now + IMPACT_MS + TONGUE_MS, bell: { start: now + IMPACT_MS }, busyUntil: now + IMPACT_MS + SETTLE_MS });
  if (mine) round.struggle += 1;
  game.sound.play("clink", { delay: seconds(IMPACT_MS), gain: mine ? 1 : 0.7 });
}

function finished(game, round, event, now) {
  const ones = event.to.value === 1;
  const start = now + IMPACT_MS + (ones ? 0 : SPLIT_MS + CHEER_MS);
  const { core } = round;
  round.leave = { start, value: event.to.value, count: event.to.count, parents: ones ? event.from.count : event.to.count, ones };
  round.burst = { start: start + LEAVE_MS * 0.75, seed: event.golem + 1 };
  round.next = core.over ? null : { value: core.value, count: 1, cap: golemOf(core).cap };
  round.busyUntil = start + LEAVE_MS + (core.over ? 0 : ENTER_MS);
  game.sound.play("collect", { delay: seconds(start - now + LEAVE_MS * 0.7) });
}

function split(game, round, event, mine, now) {
  round.split = { start: now + IMPACT_MS, from: event.from, to: event.to };
  round.stand = { ...event.to, cap: round.core.golems[event.golem].cap };
  round.busyUntil = now + IMPACT_MS + SPLIT_MS;
  if (mine) round.struggle = 0;
  game.sound.play("pop", { delay: seconds(IMPACT_MS), gain: mine ? 1 : 0.7 });
  game.sound.play("giggle", { delay: seconds(IMPACT_MS + 120), pitch: 1 + Math.min(0.5, event.to.count * 0.04) });
  if (event.done) finished(game, round, event, now);
}

export function applyHit(game, side, divisor, now) {
  const { state } = game;
  const { round } = state;
  const done = strike(round.core, side, divisor);
  if (!done.event) return null;
  const mine = side === round.mySide;
  round.core = done.round;
  round.hits.push(divisor);
  round.swings[mine ? 0 : 1] = { start: now, miss: done.event.kind === "clink" };
  round.flickAt = null;
  if (!mine) round.struck = { divisor, until: now + IMPACT_MS + SPLIT_MS };
  if (done.event.kind === "clink") clinked(game, round, mine, now);
  else split(game, round, done.event, mine, now);
  state.hint = hintOf(round, state);
  keepRound(game);
  return done.event;
}

export function pressHit(game, divisor) {
  const { state } = game;
  const { round } = state;
  const now = game.now();
  if (!round || round.finished || state.paused || now < round.busyUntil || turnOf(round.core) !== round.mySide) return;
  if (!applyHit(game, round.mySide, divisor, now)) return;
  if (!state.taught) {
    state.taught = true;
    game.saveOwn();
    state.hint = hintOf(round, state);
  }
  if (round.kind === "friend") game.run(() => game.relay.hit(divisor));
}

function moveOn(game, round, now) {
  Object.assign(round, { stand: round.next, next: null, leave: null, split: null, enter: round.next ? { start: now } : null });
  if (round.stand) return;
  round.finished = true;
  game.state.endAt = now + END_MS;
}

function flickTurn(game, round, now) {
  const side = 1 - round.mySide;
  if (round.core.over || turnOf(round.core) !== side || now < round.busyUntil) return;
  round.flickAt ??= now + FLICK_PACE;
  if (now >= round.flickAt) applyHit(game, side, flickHit(round.core, side, game.random), now);
}

function friendTurn(game, round, now) {
  const { relay } = game;
  if (!relay || relay.roundId() !== round.id) return;
  const moves = relay.moves();
  const shared = Math.min(moves.length, round.hits.length);
  if (round.hits.slice(0, shared).some((divisor, at) => divisor !== moves[at])) {
    const again = fastForward(round, moves, now);
    if (again) game.state.round = again;
    return;
  }
  if (moves.length > round.hits.length && now >= round.busyUntil) applyHit(game, turnOf(round.core), moves[round.hits.length], now);
}

export function frameRound(game, now) {
  const { round } = game.state;
  if (!round || round.finished) return;
  if (round.leave && now >= round.leave.start + LEAVE_MS) moveOn(game, round, now);
  if (round.finished) return;
  if (round.kind === "flick") flickTurn(game, round, now);
  if (round.kind === "friend") friendTurn(game, round, now);
}
