import { seedOf } from "../../../kit/src/canvas/random.js";
import { FixedSteps } from "../../../kit/src/duel/steps.js";
import { boutOf, exchange, moveOf } from "./bout.js";
import { PROGRESS, SHOW_MS, rivalRobot, settingsFor, wonRound } from "./levels.js";
import { flickMove } from "./robot.js";

// ms
export const STEP_MS = 1000 / 60;
export const COUNTDOWN = 3000;
export const END_PAUSE = 1400;
export const IMPACT_MS = 300;
// A move leaves this phone only this long after its window closed, so the other phone cannot have it while its own window is open.
export const HOLD_MS = 120;

const NO_BOUT = Object.freeze({ hits: Object.freeze([0, 0]), count: 0, toppled: null, over: false });
const STRIKES = { g: "boing", b: "sproing" };

export function newRound(game, { kind, seed, seat = 0, startAt, settings, looks }) {
  return {
    kind, seed, seat, settings, startAt, looks, stage: game.state.progress.chosen.stage,
    steps: new FixedSteps({ step: STEP_MS }), step: 0, opened: -1,
    held: [0, 0], mine: [], theirs: [], bout: NO_BOUT, shown: null,
    endAt: null, done: false, sent: false, heard: null, told: 0,
  };
}

export function beginLocal(game, kind) {
  const { state } = game;
  const mine = state.progress.chosen.robot;
  const seed = seedOf(`${game.random()}/${game.random()}/${game.now()}`);
  showRound(game, newRound(game, { kind, seed, startAt: game.now() + COUNTDOWN, settings: settingsFor(state.progress, kind), looks: [mine, rivalRobot(mine)] }));
}

export function showRound(game, round) {
  const { state } = game;
  Object.assign(state, { round, screen: "play", paused: false, outcome: null, moments: [] });
  game.sound.music("playful");
  game.resize(state.width, state.height, state.fill);
}

export const timeOf = (round) => round.step * STEP_MS;

export const closeOf = (round, index) => index * round.settings.period + round.settings.window;

export function windowOf(round) {
  const { window, period, exchanges } = round.settings;
  const time = timeOf(round);
  const index = Math.min(exchanges, Math.floor(time / period));
  const within = time - index * period;
  const open = index < exchanges && within < window;
  return { index, open, left: open ? 1 - within / window : 0, walked: index < exchanges ? Math.min(1, within / window) : 1 };
}

export const leftOf = (round) => Math.max(0, 1 - timeOf(round) / (round.settings.exchanges * round.settings.period));

export function toldOf(round) {
  const time = timeOf(round);
  let count = 0;
  while (count < round.mine.length && time >= closeOf(round, count) + HOLD_MS) count += 1;
  return round.mine.slice(0, count);
}

function rivalMove(round, index) {
  if (round.kind === "pair") return moveOf(round.held[1]);
  return flickMove({ seed: round.seed, index, theirs: round.mine.slice(0, index), skill: round.settings.skill, gap: round.bout.hits[1] - round.bout.hits[0] });
}

function lock(game, round) {
  const time = timeOf(round);
  while (round.mine.length < round.settings.exchanges && time >= closeOf(round, round.mine.length)) {
    if (round.kind !== "friend") round.theirs.push(rivalMove(round, round.mine.length));
    round.mine.push(moveOf(round.held[0]));
    round.held = [0, 0];
    reveal(game, round);
  }
}

function sound(game, shown) {
  const [mine, theirs] = shown.moves;
  const at = { delay: IMPACT_MS / 1000 };
  if (shown.kind === "block") game.sound.play("bounce", at);
  else if (shown.kind === "clash") game.sound.play("pop", at);
  else if (shown.landed[0]) game.sound.play(STRIKES[mine], at);
  else if (shown.landed[1]) game.sound.play(STRIKES[theirs], { ...at, pitch: 0.8 });
  if (shown.toppled !== null) game.sound.play(shown.toppled === 1 ? "success" : "bounce", { delay: (IMPACT_MS + 350) / 1000, pitch: shown.toppled === 1 ? 1 : 0.6 });
}

export function reveal(game, round) {
  const bout = boutOf(round.mine, round.theirs, round.settings.exchanges);
  if (bout.count <= round.bout.count) return;
  const index = bout.count - 1;
  const moves = [round.mine[index], round.theirs[index]];
  round.shown = { index, at: game.now(), moves, ...exchange(...moves), before: boutOf(round.mine.slice(0, index), round.theirs.slice(0, index)).hits, toppled: bout.toppled };
  round.bout = bout;
  sound(game, round.shown);
}

export function scoreAt(round, now) {
  const { shown } = round;
  return shown && now < shown.at + IMPACT_MS ? shown.before : round.bout.hits;
}

export function stepRound(game, round) {
  round.step += round.steps.due(game.now());
  const { index, open } = windowOf(round);
  if (open && index !== round.opened) {
    round.opened = index;
    game.sound.play("tick", { gain: 0.4 });
  }
  lock(game, round);
}

export function closeRound(game, round, score) {
  if (round.done) return;
  round.done = true;
  game.run(() => endRound(game, score));
}

export function advanceLocal(game) {
  const { round } = game.state;
  const now = game.now();
  if (game.state.paused || now < round.startAt) {
    round.steps.reset();
    return;
  }
  if (round.endAt === null) {
    stepRound(game, round);
    if (round.bout.over) round.endAt = now + SHOW_MS + END_PAUSE;
  } else if (now >= round.endAt) closeRound(game, round, { mine: round.bout.hits[0], theirs: round.bout.hits[1] });
}

export async function endRound(game, { mine, theirs }) {
  const { state } = game;
  const round = state.round;
  if (!round || state.screen !== "play") return;
  const won = wonRound(mine, theirs);
  const award = PROGRESS.awardRound(state.progress, { won, score: mine });
  state.progress = award.record;
  state.outcome = { mine, theirs, won, stars: award.stars, best: award.record.best, newBest: award.newBest, gift: award.gift, opened: false, kind: round.kind, looks: round.looks };
  state.screen = "end";
  state.paused = false;
  game.sound.pause(false);
  state.moments = won ? [{ kind: "confetti", start: game.now(), duration: 2200 }] : [];
  game.sound.play(mine > theirs ? "win" : mine === theirs ? "star" : "lose-soft");
  game.saveProgress();
}

export function leaveRound(game) {
  const { state } = game;
  if (state.round?.kind === "friend") game.duel?.leave();
  Object.assign(state, { round: null, paused: false, screen: "home", moments: [] });
  game.sound.pause(false);
}
