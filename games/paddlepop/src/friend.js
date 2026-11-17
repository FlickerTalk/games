import { seedOf } from "../../../kit/src/canvas/random.js";
import { CanvasDuel } from "../../../kit/src/duel/link.js";
import { FLICK_PADDLE, PADDLES, settingsFor } from "./levels.js";
import { adoptBall, learnLost, mergeRally } from "./match.js";
import { END_PAUSE, addMoments, closeRound, newRound, showRound, stepRound, warmUp } from "./rounds.js";
import { STEP_MS } from "./table.js";
import { DUEL, checkState, stateOf } from "./wire.js";

export function joinFriend(game) {
  game.duel = new CanvasDuel({ ft: game.ft, g: DUEL.g, gv: DUEL.gv, app: game.app, check: checkState, clock: game.now, page: game.page, onChange: () => changed(game) });
}

export function startFriend(game) {
  game.state.screen = "home";
  game.duel.start();
  game.sound.play("tap");
}

function standInLook(mine) {
  return mine === FLICK_PADDLE ? PADDLES.find((one) => one !== mine) : FLICK_PADDLE;
}

function begin(game) {
  const { duel, state } = game;
  const seat = duel.seat;
  const mine = state.progress.chosen.paddle;
  const looks = seat === 0 ? [mine, standInLook(mine)] : [standInLook(mine), mine];
  const now = game.now();
  const round = newRound(game, { kind: "friend", seed: seedOf(duel.session.id), seat, startAt: now + duel.until(now), settings: settingsFor(state.progress, "friend"), looks });
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

function apply(game, round, now) {
  const { duel } = game;
  const latest = duel.latest;
  if (!latest || duel.latestT === round.seenT) return;
  round.seenT = duel.latestT;
  round.theirs = latest;
  const their = 1 - round.seat;
  round.looks[their] = latest.k;
  const events = [];
  let { match } = round;
  for (const change of [(m) => learnLost(m, their, latest.l), (m) => mergeRally(m, latest.r)]) {
    const out = change(match);
    match = out.match;
    events.push(...out.events);
  }
  const age = Math.round(duel.age(duel.latestT, now) / STEP_MS);
  for (const ball of latest.b) {
    const out = adoptBall(match, ball, age, round.own);
    match = out.match;
    events.push(...out.events);
    if (out.moved) round.glides[ball.i].jump(out.moved, now);
  }
  round.match = match;
  addMoments(game, events);
}

function tell(game, round, now) {
  const { duel, state } = game;
  const said = { look: state.progress.chosen.paddle, ended: false };
  if (round.match.over || round.theirs?.e === 1) {
    round.sent = true;
    duel.end(duel.raceTime(now), stateOf(round.match, round.seat, { ...said, ended: true }));
    return;
  }
  duel.send(duel.raceTime(now), stateOf(round.match, round.seat, said), now, { soon: round.urgent });
  round.urgent = false;
}

function play(game, round, now) {
  apply(game, round, now);
  round.theirX = game.duel.other(now)?.x ?? null;
  if (round.sent) round.steps.reset();
  else {
    const mine = (event) => (event.kind === "hit" || event.kind === "goal") && event.seat === round.seat;
    round.urgent ||= stepRound(game, round).some(mine);
  }
  if (!round.sent) tell(game, round, now);
}

export function advanceFriend(game, now) {
  const { duel, state } = game;
  duel.frame(now);
  const round = state.round;
  if (state.screen !== "play" || round?.kind !== "friend") return;
  if (duel.phase === "countdown" || now < round.startAt) {
    warmUp(round, now);
    return;
  }
  if (["running", "finished"].includes(duel.phase)) play(game, round, now);
  if (round.endAt === null || now < round.endAt) return;
  const result = duel.result;
  closeRound(game, round, { mine: result?.theirs?.l ?? round.match.lost[1 - round.seat], theirs: result?.mine?.l ?? round.match.lost[round.seat] });
}
