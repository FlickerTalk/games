import { seedOf } from "../../../kit/src/canvas/random.js";
import { CanvasDuel } from "../../../kit/src/duel/link.js";
import { FIRST_TO } from "./arena.js";
import { ringFor, settingsFor } from "./levels.js";
import { learnLost, placeOther, takePushes } from "./match.js";
import { END_PAUSE, addMoments, closeRound, newRound, showRound, stepRound } from "./rounds.js";
import { DUEL, checkState, stateOf } from "./wire.js";

// ms over which a shove is shown on the other player before their own phone answers
const NUDGE_MS = 320;
const URGENT = ["dash", "bump", "fall", "back"];

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
  const mine = state.progress.chosen.ring;
  const now = game.now();
  const looks = seat === 0 ? [mine, ringFor(mine)] : [ringFor(mine), mine];
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

function nudgeAt(round, now) {
  const { nudge } = round;
  const passed = nudge ? now - nudge.at : NUDGE_MS;
  if (passed >= NUDGE_MS) return [0, 0];
  const far = (passed / 1000) * (1 - passed / NUDGE_MS);
  return [nudge.x * far, nudge.y * far];
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
    round.looks[their] = latest.k === round.looks[round.seat] ? ringFor(latest.k) : latest.k;
    addMoments(game, [...learnLost(match, their, latest.l), ...takePushes(match, round.seat, latest.h)]);
  }
  const shown = duel.other(now) ?? latest;
  const [dx, dy] = nudgeAt(round, now);
  const long = Math.sqrt(shown.ax * shown.ax + shown.ay * shown.ay) || 1;
  placeOther(match, their, { x: shown.x + dx, y: shown.y + dy, vx: latest.vx, vy: latest.vy, ax: shown.ax / long, ay: shown.ay / long, hold: latest.c, stun: latest.q, out: latest.u, safe: latest.s });
}

function tell(game, round, now) {
  const { duel, state } = game;
  const said = { look: state.progress.chosen.ring, ended: false };
  if (round.match.over || round.theirs?.e === 1) {
    round.sent = true;
    duel.end(duel.raceTime(now), stateOf(round.match, round.seat, { ...said, ended: true }));
    return;
  }
  duel.send(duel.raceTime(now), stateOf(round.match, round.seat, said), now, { soon: round.urgent });
  round.urgent = false;
}

function step(game, round, now) {
  const events = stepRound(game, round).filter((event) => (event.by ?? event.seat) === round.seat);
  if (events.some((event) => URGENT.includes(event.kind))) round.urgent = true;
  if (!events.some((event) => event.kind === "bump")) return;
  const [, x, y] = round.match.told[round.seat].at(-1);
  round.nudge = { x, y, at: now };
}

function play(game, round, now) {
  apply(game, round, now);
  if (round.sent) round.steps.reset();
  else step(game, round, now);
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
  const [me, them] = [round.match.bodies[round.seat], round.match.bodies[1 - round.seat]];
  const points = (lost) => Math.min(FIRST_TO, lost);
  closeRound(game, round, { mine: points(result?.theirs?.l ?? them.lost), theirs: points(result?.mine?.l ?? me.lost) });
}
