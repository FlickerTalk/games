import { REACH, resolveKick, snapDive } from "./kicks.js";
import { PROGRESS, settingsFor, wonRound } from "./levels.js";
import { FLIGHT, RESULT } from "./moves.js";
import { flickAim, flickDive } from "./robot.js";
import { goalsOf, overOf, pointsOf, shooterOf } from "./shootout.js";

// ms
export const THINK = 900;
export const END_PAUSE = 900;
const FLICK_REACTS = 120;
const TOO_LATE = 90;
const MOMENT = 1100;
const TIMES = ["at", "ringAt", "flyAt", "landAt", "doneAt", "diveAt", "actedAt"];

export function newRound(game, { kind, seat = 0, kicks = [], index = null }) {
  return { kind, seat, index, kicks: [...kicks], kick: null, swipe: null, settings: settingsFor(game.state.progress, kind), endAt: null, pausedAt: null, done: false };
}

export function showRound(game, round) {
  const { state } = game;
  Object.assign(state, { round, screen: "play", paused: false, outcome: null, moments: [] });
  game.sound.music("playful");
  game.resize(state.width, state.height, state.fill);
}

export const beginLocal = (game, kind) => showRound(game, newRound(game, { kind }));

export function freshKick(round, phase, now) {
  const index = round.kicks.length;
  return { index, shooter: shooterOf(index), phase, at: now, aim: null, dive: null, diveAt: null, ringAt: null, flyAt: null, landAt: null, doneAt: null, outcome: null, bonus: null, preset: null, kicked: false, acted: null, actedAt: null, guess: null, trail: null };
}

export const shooterIsHere = (round, kick) => round.kind === "pair" || kick.shooter === round.seat;
export const keeperIsHere = (round, kick) => round.kind === "pair" || kick.shooter !== round.seat;

export const canShoot = (round) => round?.kick?.phase === "aim";

export function canDive(round, now) {
  const kick = round?.kick;
  if (!kick) return false;
  if (kick.phase === "guess") return true;
  return kick.phase === "fly" && kick.ringAt !== null && !kick.dive && keeperIsHere(round, kick) && now <= kick.landAt - TOO_LATE;
}

export function launch(game, kick, aim, { warn = 0, delay = 0 } = {}) {
  const now = game.now();
  Object.assign(kick, { aim, phase: "fly", ringAt: warn > 0 ? now : null, flyAt: now + warn + delay, landAt: now + warn + delay + FLIGHT });
  if (warn > 0) game.sound.play("tick");
}

function teach(game, what) {
  const { state } = game;
  if (state.taught[what]) return;
  state.taught = { ...state.taught, [what]: true };
  game.saveOwn();
}

export function shoot(game, aim) {
  const { round } = game.state;
  if (!canShoot(round)) return false;
  const { kick } = round;
  teach(game, "shoot");
  if (round.kind === "friend") {
    Object.assign(kick, { phase: "wait", acted: "commit", actedAt: game.now() });
    game.sound.play("tap");
    game.run(() => game.friend.shoot(aim));
    return true;
  }
  if (round.kind === "flick") Object.assign(kick, { dive: flickDive(aim, game.random, round.settings), diveAt: game.now() + FLICK_REACTS });
  launch(game, kick, aim, { warn: round.kind === "pair" ? round.settings.warn : 0 });
  return true;
}

export function dive(game, point) {
  const { round } = game.state;
  const now = game.now();
  if (!canDive(round, now)) return false;
  const { kick } = round;
  const spot = snapDive(point);
  teach(game, "keep");
  game.sound.play("tap");
  if (kick.phase === "guess") {
    Object.assign(kick, { phase: "wait", guess: spot, acted: "dive", actedAt: now });
    game.run(() => game.friend.dive(spot));
  } else Object.assign(kick, { dive: spot, diveAt: now });
  return true;
}

function reachOf(round, kick) {
  if (round.kind === "flick" && kick.shooter === round.seat) return REACH.blind;
  return round.settings.reach;
}

function answer(game, round, kick) {
  const { state } = game;
  const here = round.kind === "pair";
  const mine = kick.shooter === round.seat;
  const add = (kind, more = {}) => state.moments.push({ kind, at: kick.aim, start: game.now(), duration: MOMENT, ...more });
  if (kick.outcome === "goal") {
    add("burst", { style: kick.bonus ? "stars" : "confetti" });
    if (kick.bonus) add("bonus", { target: kick.bonus });
    game.sound.play(kick.bonus ? "star" : here || mine ? "success" : "splash");
  } else if (kick.outcome === "saved") {
    add("ripple");
    game.sound.play(here || !mine ? "collect" : "bounce");
  } else game.sound.play("error-soft");
}

function settle(game, round, kick) {
  Object.assign(kick, kick.preset ?? resolveKick(kick.aim, kick.dive, reachOf(round, kick)), { phase: "result", doneAt: kick.landAt + RESULT });
  answer(game, round, kick);
}

export function stepKick(game, round, now) {
  const { kick } = round;
  if (kick.phase === "think" && now >= kick.at + THINK) launch(game, kick, flickAim(game.random, round.settings), { warn: round.settings.warn });
  if (kick.phase === "fly") {
    if (!kick.kicked && now >= kick.flyAt) {
      kick.kicked = true;
      game.sound.play("whoosh");
    }
    if (now >= kick.landAt) settle(game, round, kick);
  }
  if (kick.phase === "result" && now >= kick.doneAt) {
    round.kicks.push({ aim: kick.aim, dive: kick.dive, outcome: kick.outcome, bonus: kick.bonus });
    round.kick = null;
    if (overOf(round.kicks)) round.endAt = now + END_PAUSE;
  }
}

export function heldBack(game, round, now) {
  if (game.state.paused) {
    round.pausedAt ??= now;
    return true;
  }
  if (round.pausedAt === null) return false;
  const by = now - round.pausedAt;
  round.pausedAt = null;
  if (round.endAt !== null) round.endAt += by;
  if (round.kick) for (const key of TIMES) if (round.kick[key] !== null) round.kick[key] += by;
  for (const moment of game.state.moments) moment.start += by;
  return false;
}

export function closeDue(game, round, now) {
  if (round.done || round.endAt === null) return round.done;
  if (now >= round.endAt) {
    round.done = true;
    game.run(() => endRound(game));
  }
  return true;
}

export function advanceLocal(game) {
  const { round } = game.state;
  const now = game.now();
  if (heldBack(game, round, now) || closeDue(game, round, now)) return;
  if (!round.kick) round.kick = freshKick(round, round.kind === "pair" || shooterOf(round.kicks.length) === round.seat ? "aim" : "think", now);
  else stepKick(game, round, now);
}

export async function endRound(game) {
  const { state } = game;
  const { round } = state;
  if (!round || state.screen !== "play") return;
  const mine = goalsOf(round.kicks, round.seat);
  const theirs = goalsOf(round.kicks, 1 - round.seat);
  const won = wonRound(mine, theirs);
  const award = PROGRESS.awardRound(state.progress, { won, score: pointsOf(round.kicks, round.seat) });
  state.progress = award.record;
  state.outcome = { mine, theirs, won, stars: award.stars, best: award.record.best, newBest: award.newBest, gift: award.gift, opened: false, kind: round.kind };
  Object.assign(state, { screen: "end", paused: false, moments: won ? [{ kind: "confetti", start: game.now(), duration: 2200 }] : [] });
  game.sound.pause(false);
  game.sound.play(mine > theirs ? "win" : mine === theirs ? "star" : "lose-soft");
  game.saveProgress();
  if (round.kind === "friend") game.roundAwarded(round);
}

export function leaveRound(game) {
  const { state } = game;
  if (state.round?.kind === "friend") game.friend?.leave();
  Object.assign(state, { round: null, paused: false, screen: "home", moments: [] });
  game.sound.pause(false);
}
