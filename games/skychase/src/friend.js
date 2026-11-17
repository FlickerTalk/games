import { seedOf } from "../../../kit/src/canvas/random.js";
import { CanvasDuel } from "../../../kit/src/duel/link.js";
import { BALLOONS, STEP_MS } from "./arena.js";
import { colourFor, familyOf, settingsFor } from "./levels.js";
import { TRAIL, learnLost, placeOther } from "./match.js";
import { END_PAUSE, addMoments, closeRound, lookOf, newRound, rivalLook, showRound, stepRound } from "./rounds.js";
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
  const seat = duel.seat;
  const seed = seedOf(duel.session.id);
  const mine = lookOf(state);
  const now = game.now();
  const looks = seat === 0 ? [mine, rivalLook(mine)] : [rivalLook(mine), mine];
  const round = newRound(game, { kind: "friend", seed, seat, startAt: now + duel.until(now), settings: settingsFor(state.progress, "friend", seed), looks });
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

function theirLook(round, latest) {
  const mine = round.looks[round.seat];
  return { craft: latest.k, colour: latest.c === mine.colour ? colourFor(mine.colour) : latest.c };
}

function apply(game, round, now) {
  const { duel } = game;
  const latest = duel.latest;
  if (!latest) return;
  const their = 1 - round.seat;
  const { match } = round;
  if (duel.latestT !== round.seenT) {
    round.seenT = duel.latestT;
    round.theirs = latest;
    round.looks[their] = theirLook(round, latest);
    addMoments(game, learnLost(match, their, latest.l));
  }
  const shown = duel.other(now) ?? latest;
  const long = Math.sqrt(shown.hx * shown.hx + shown.hy * shown.hy) || 1;
  placeOther(match, their, {
    x: shown.x, y: shown.y, hx: shown.hx / long, hy: shown.hy / long, speed: latest.v, lock: latest.a, safe: latest.s, out: latest.u,
    boost: latest.b, rest: latest.r, bank: latest.n, down: latest.d === 1, family: familyOf(latest.k),
  });
}

function tell(game, round, now) {
  const { duel, state } = game;
  const said = { ...lookOf(state), ended: false };
  if (round.match.over || round.theirs?.e === 1) {
    round.sent = true;
    duel.end(duel.raceTime(now), stateOf(round.match, round.seat, { ...said, ended: true }));
    return;
  }
  duel.send(duel.raceTime(now), stateOf(round.match, round.seat, said), now, { soon: round.urgent });
  round.urgent = false;
}

// The hunter aimed at this phone's aircraft as it saw it, late, and its aim arrives late again: two trips back.
export function rewindOf(duel) {
  const late = (duel.clock.latency ?? 0) + duel.follow.delay;
  return Math.min(TRAIL, Math.round((2 * late) / STEP_MS));
}

function play(game, round, now) {
  apply(game, round, now);
  round.rewind = rewindOf(game.duel);
  if (round.sent) round.steps.reset();
  else if (stepRound(game, round).some((event) => event.kind === "pop")) round.urgent = true;
  if (!round.sent) tell(game, round, now);
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
  if (round.endAt === null || now < round.endAt) return;
  const result = duel.result;
  const [me, them] = [round.match.crafts[round.seat], round.match.crafts[1 - round.seat]];
  const points = (lost) => Math.min(BALLOONS, lost);
  closeRound(game, round, { mine: points(result?.theirs?.l ?? them.lost), theirs: points(result?.mine?.l ?? me.lost) });
}
