import { seedOf } from "../../../kit/src/canvas/random.js";
import { CanvasDuel } from "../../../kit/src/duel/link.js";
import { boutOf, readMoves } from "./bout.js";
import { SHOW_MS, rivalRobot, settingsFor } from "./levels.js";
import { closeRound, newRound, reveal, showRound, stepRound, timeOf, toldOf } from "./rounds.js";
import { DUEL, MOST_MOVES, checkState, stateOf } from "./wire.js";

// ms
const LAST_LOOK = 500;
const LIVE = ["running", "finished"];

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
  const mine = state.progress.chosen.robot;
  const round = newRound(game, { kind: "friend", seed: seedOf(duel.session.id), seat: duel.seat, startAt: now + duel.until(now), settings: settingsFor(state.progress, "friend"), looks: [mine, rivalRobot(mine)] });
  round.id = duel.session.id;
  showRound(game, round);
}

function changed(game) {
  const { duel, state } = game;
  const round = state.round?.kind === "friend" ? state.round : null;
  if (duel.phase === "countdown" && round?.id !== duel.session.id) begin(game);
  else if (duel.phase === "over" && round && round.endAt === null) round.endAt = game.now() + SHOW_MS + LAST_LOOK;
  else if (duel.phase === "left" && round && state.screen === "play") Object.assign(state, { round: null, screen: "home", paused: false, moments: [] });
  game.onChange();
}

function listen(game, round) {
  const heard = game.duel.latest;
  if (!heard || heard === round.heard) return;
  round.heard = heard;
  round.looks = [round.looks[0], heard.k];
  const moves = readMoves(heard.c, MOST_MOVES);
  if (moves && moves.length > round.theirs.length) round.theirs = moves;
}

function tell(game, round, now) {
  const { duel, state } = game;
  const look = state.progress.chosen.robot;
  const finished = round.mine.length >= round.settings.exchanges && timeOf(round) >= round.settings.exchanges * round.settings.period;
  if (finished || round.bout.over || round.heard?.e === 1) {
    round.sent = true;
    duel.end(duel.raceTime(now), stateOf(round.mine, { look, ended: true }));
    return;
  }
  const told = toldOf(round);
  const soon = told.length > round.told;
  round.told = told.length;
  duel.send(duel.raceTime(now), stateOf(told, { look, ended: false }), now, { soon });
}

// Both phones read the score from the two final lists of moves, so they always agree.
function finalScores(game, round) {
  const result = game.duel.result;
  const mine = readMoves(result?.mine?.c, MOST_MOVES);
  const theirs = readMoves(result?.theirs?.c, MOST_MOVES);
  const { hits } = mine && theirs ? boutOf(mine, theirs, round.settings.exchanges) : round.bout;
  return { mine: hits[0], theirs: hits[1] };
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
  listen(game, round);
  if (round.sent) round.steps.reset();
  else stepRound(game, round);
  reveal(game, round);
  if (LIVE.includes(duel.phase) && !round.sent) tell(game, round, now);
  if (round.endAt !== null && now >= round.endAt) closeRound(game, round, finalScores(game, round));
}
