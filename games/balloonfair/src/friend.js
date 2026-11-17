import { seedOf } from "../../../kit/src/canvas/random.js";
import { CanvasDuel } from "../../../kit/src/duel/link.js";
import { decodeClaims, tally } from "./fair.js";
import { settingsFor } from "./levels.js";
import { END_PAUSE, closeRound, newRound, retally, scoresOf, showRound, stepRound } from "./rounds.js";
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
  const round = newRound(game, { kind: "friend", seed: seedOf(duel.session.id), seat: duel.seat, startAt: now + duel.until(now), settings: settingsFor(state.progress, "friend") });
  round.id = duel.session.id;
  showRound(game, round);
}

function changed(game) {
  const { duel, state } = game;
  const round = state.round?.kind === "friend" ? state.round : null;
  if (duel.phase === "countdown" && round?.id !== duel.session.id) begin(game);
  else if (duel.phase === "over" && round && round.endAt === null) round.endAt = game.now() + END_PAUSE / 2;
  else if (duel.phase === "left" && round && state.screen === "play") Object.assign(state, { round: null, screen: "home", paused: false, moments: [] });
  game.onChange();
}

function listen(game, round) {
  const heard = game.duel.latest;
  if (!heard || heard === round.heard) return;
  const fresh = heard.c !== round.heard?.c;
  round.heard = heard;
  if (!fresh) return;
  round.theirs = decodeClaims(heard.c, 1 - round.seat) ?? round.theirs;
  retally(game, round);
}

function tell(game, round, now) {
  const { duel } = game;
  if (round.step >= round.roundSteps || round.heard?.e === 1) {
    round.sent = true;
    duel.end(duel.raceTime(now), stateOf(round, { ended: true }));
    return;
  }
  duel.send(duel.raceTime(now), stateOf(round, { ended: false }), now, { soon: round.urgent });
  round.urgent = false;
}

function play(game, round, now) {
  listen(game, round);
  if (round.sent) round.steps.reset();
  else round.urgent ||= stepRound(game, round);
  if (!round.sent) tell(game, round, now);
}

// Both phones read the score from the two final lists of claims, so they always agree.
function finalScores(game, round) {
  const result = game.duel.result;
  const mine = decodeClaims(result?.mine?.c, round.seat);
  const theirs = decodeClaims(result?.theirs?.c, 1 - round.seat);
  if (!mine || !theirs) return scoresOf(round);
  const { scores } = tally(round.schedule, [...mine, ...theirs]);
  return { mine: scores[round.seat], theirs: scores[1 - round.seat] };
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
  if (round.endAt !== null && now >= round.endAt) closeRound(game, round, finalScores(game, round));
}
