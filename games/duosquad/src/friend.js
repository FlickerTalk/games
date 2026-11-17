import { seedOf } from "../../../kit/src/canvas/random.js";
import { CanvasDuel } from "../../../kit/src/duel/link.js";
import { HULLS, hullOf, settingsFor } from "./levels.js";
import { END_PAUSE, closeRound, newRound, noteCaught, noteFreed, overOf, resultOf, retally, showRound, stepRound } from "./rounds.js";
import { decodeClaims, tally } from "./waves.js";
import { DUEL, checkState, stateOf } from "./wire.js";

export function joinFriend(game) {
  game.duel = new CanvasDuel({ ft: game.ft, g: DUEL.g, gv: DUEL.gv, app: game.app, check: checkState, clock: game.now, page: game.page, onChange: () => changed(game) });
}

export function startFriend(game) {
  game.state.screen = "home";
  game.duel.start();
  game.sound.play("tap");
}

function begin(game) {
  const { duel, state } = game;
  const now = game.now();
  const seed = seedOf(duel.session.id);
  const round = newRound(game, { kind: "friend", seed, seat: duel.seat, startAt: now + duel.until(now), settings: settingsFor(state.progress, "friend", seed) });
  round.id = duel.session.id;
  showRound(game, round);
}

function changed(game) {
  const { duel, state } = game;
  const round = state.round?.kind === "friend" ? state.round : null;
  if (duel.phase === "countdown" && round?.id !== duel.session.id) begin(game);
  else if (duel.phase === "over" && round && round.endAt === null) round.endAt = game.now() + END_PAUSE / 2;
  else if (duel.phase === "left" && round && state.screen === "play") Object.assign(state, { round: null, screen: "home", paused: false, moments: [], steer: null });
  game.onChange();
}

function listen(game, round, now) {
  const { duel } = game;
  const heard = duel.latest;
  if (!heard) return;
  const mate = round.crafts[1 - round.seat];
  mate.u = (duel.other(now) ?? heard).u;
  if (heard === round.heard) return;
  const fresh = heard.k !== round.heard?.k;
  round.heard = heard;
  round.hulls[mate.seat] = heard.h;
  if (heard.c === 1 && mate.caught <= 0) noteCaught(game, round, mate.seat);
  if (heard.c === 0 && mate.caught > 0) noteFreed(game, round, mate.seat, true);
  mate.caught = heard.c;
  if (heard.c === 1) mate.bolts = [];
  if (!fresh) return;
  round.theirs = decodeClaims(heard.k, mate.seat) ?? round.theirs;
  retally(game, round);
}

const hullNow = (state) => HULLS[state.world].indexOf(hullOf(state.progress, state.world));

function tell(game, round, now) {
  const { duel, state } = game;
  if (overOf(round) || round.heard?.e === 1) {
    round.sent = true;
    duel.end(duel.raceTime(now), stateOf(round, { hull: hullNow(state), ended: true }));
    return;
  }
  duel.send(duel.raceTime(now), stateOf(round, { hull: hullNow(state), ended: false }), now, { soon: round.urgent });
  round.urgent = false;
}

function play(game, round, now) {
  listen(game, round, now);
  if (round.sent) round.steps.reset();
  else round.urgent = stepRound(game, round) || round.urgent;
  if (!round.sent) tell(game, round, now);
}

// Both phones read the result from the two final lists of claims, so they always agree.
function finalResult(game, round) {
  const result = game.duel.result;
  const mine = decodeClaims(result?.mine?.k, round.seat);
  const theirs = decodeClaims(result?.theirs?.k, 1 - round.seat);
  return mine && theirs ? resultOf(round, tally(round.schedule, [...mine, ...theirs])) : resultOf(round);
}

export function advanceFriend(game, now) {
  const { duel, state } = game;
  duel.frame(now);
  const round = state.round;
  if (state.screen !== "play" || round?.kind !== "friend") return;
  if (duel.phase === "countdown" || now < round.startAt) {
    round.steps.reset();
    return;
  }
  if (["running", "finished"].includes(duel.phase)) play(game, round, now);
  if (round.endAt !== null && now >= round.endAt) closeRound(game, round, finalResult(game, round));
}
