import { seedOf } from "../../../kit/src/canvas/random.js";
import { starsFor } from "../../../kit/src/progress/index.js";
import { flickFor, flickGuess, flickGuesses } from "./flick.js";
import { shareAt } from "./layout.js";
import { PROGRESS, THRESHOLDS, roundSetup, wonRound } from "./levels.js";
import { encodeReport } from "./report.js";
import { resumeRound, roundSnapshot, scoreIn, shoot, startRound, stepRound } from "./round.js";
import { scoreOf } from "./scoring.js";

const END_PAUSE = 500;
const STEP_MOST = 0.1;

export const roundKey = (state) => `round/${state.chat ?? "-"}`;

function keep(game) {
  const { state } = game;
  if (!state.round || !state.setup) return game.pending;
  state.snapshot = { v: 1, mode: state.mode, ruler: state.ruler, setup: state.setup, round: roundSnapshot(state.round) };
  const kept = JSON.stringify(state.snapshot);
  return game.run(() => game.store?.set(roundKey(state), kept));
}

export const keepRound = keep;

function show(game, snapshot) {
  const { state } = game;
  const round = resumeRound(snapshot.round);
  if (!round) return false;
  Object.assign(state, {
    screen: "play", round, setup: snapshot.setup, flick: state.mode === "flick" ? flickFor({ seed: round.seed, numbers: round.numbers, error: snapshot.setup.error }) : null,
    paused: false, outcome: null, moments: [], aim: null, last: null, endAt: null, resume: null, frameAt: game.now(), hint: !state.taught,
  });
  game.resize(state.width, state.height, state.fill);
  game.sound.music("playful");
  keep(game);
  return true;
}

async function sameNumbers(game, kept) {
  const { state } = game;
  if (kept?.mode !== state.mode || kept.ruler !== state.ruler || !kept.round || !kept.setup) return false;
  if (state.mode !== "friend") return true;
  return (await game.duel.start()).seed === kept.round.seed;
}

async function seedFor(game) {
  if (game.state.mode === "friend") return game.duel.start();
  return { seed: seedOf(`${game.random()}/${game.random()}/${game.now()}`), index: null };
}

export async function beginRound(game) {
  const { state } = game;
  if ((await sameNumbers(game, state.resume)) && show(game, state.resume)) return;
  const { level, seconds, error, ...setup } = roundSetup(state.progress, state.ruler);
  const { seed, index } = await seedFor(game);
  const round = startRound({ seed, seconds, setup, rival: state.mode === "flick" });
  show(game, { setup: { ...setup, level, error, duelIndex: index }, round: roundSnapshot(round) });
}

export function fire(game, share) {
  const { state } = game;
  const round = shoot(state.round, share);
  if (round === state.round) return;
  state.round = round;
  state.hint = false;
  if (!state.taught) {
    state.taught = true;
    game.saveOwn();
  }
  game.sound.play("whoosh", { gain: 0.6 });
}

export const fireAt = (game, x) => fire(game, shareAt(game.state.layout, x));

function ghostOf(game, index) {
  const { state, duel } = game;
  if (state.mode !== "friend" || !duel) return null;
  const theirs = duel.results(state.setup.duelIndex).theirs;
  return theirs?.stage === state.setup.stage ? (theirs.guesses[index] ?? null) : null;
}

function landed(game, event) {
  const { state } = game;
  state.last = { ...event, flick: state.flick ? flickGuess(state.flick, event.index) : null, ghost: ghostOf(game, event.index) };
  game.sound.play(event.popped ? "pop" : "place");
  if (event.stars === 3) game.sound.play("collect", { delay: 0.12 });
  else if (event.far) game.sound.play("bounce", { gain: 0.5, delay: 0.1 });
  keep(game);
}

export function stepPlay(game, now) {
  const { state } = game;
  const step = Math.min(STEP_MOST, Math.max(0, (now - (state.frameAt ?? now)) / 1000));
  state.frameAt = now;
  if (state.screen !== "play" || state.paused || !state.round || state.round.over) return;
  const { round, events } = stepRound(state.round, step);
  state.round = round;
  for (const event of events) {
    if (event.kind === "land") landed(game, event);
    if (event.kind === "next") state.last = null;
    if (event.kind === "end") Object.assign(state, { endAt: now + END_PAUSE, aim: null });
  }
}

export function finishDue(game) {
  game.state.endAt = null;
  return game.run(() => endRound(game));
}

async function endRound(game) {
  const { state } = game;
  const { round, setup } = state;
  const score = scoreIn(round);
  const award = PROGRESS.awardRound(state.progress, { won: wonRound(starsFor(score, THRESHOLDS)), score });
  state.progress = award.record;
  game.saveProgress();
  if (state.mode === "friend") await game.duel.finish(setup.duelIndex, encodeReport(round.seed, setup.stage, round.guesses));
  state.rounds += 1;
  game.saveOwn();
  const flick = state.flick ? scoreOf(round.numbers, flickGuesses(state.flick, round.guesses.length)) : null;
  state.outcome = { score, stars: award.stars, best: award.record.best, newBest: award.newBest, gift: award.gift, opened: false, flick, duelIndex: setup.duelIndex };
  Object.assign(state, { screen: "end", snapshot: null, aim: null, last: null });
  game.sound.play(award.stars >= 2 ? "win" : "star");
  await game.store?.set(roundKey(state), "null");
}
