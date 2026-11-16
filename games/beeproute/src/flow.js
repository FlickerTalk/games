import { seedOf } from "../../../kit/src/canvas/random.js";
import { starsFor } from "../../../kit/src/progress/index.js";
import { keepRound, startScript } from "./driving.js";
import { blankLevel, checkBuilt } from "./editor.js";
import { flickScript, typing } from "./flick.js";
import { generateLevel } from "./generate.js";
import { encodeLevel } from "./level.js";
import { PROGRESS, pointsFor, roundSetup, wonRound } from "./levels.js";
import { countOf, encodeProgram } from "./program.js";
import { freshRound, hintOf, roundKey } from "./rounds.js";

const SCRIPT_DELAY = 700;
const SCORED = ["level", "friend"];

const newSeed = (game) => seedOf(`${game.random()}/${game.random()}/${game.now()}`);
const loopsFor = (state) => roundSetup(state.progress).loops;

function onScreen(game, screen) {
  const { state } = game;
  Object.assign(state, { screen, paused: false, outcome: null, moments: [], endAt: null, press: null });
  game.resize(state.width, state.height, state.fill);
  game.sound.music("calm");
}

export function showRound(game, round) {
  const { state } = game;
  state.round = round;
  state.resume = null;
  onScreen(game, "play");
  state.hint = hintOf(round, state);
  keepRound(game);
}

export function beginLevels(game) {
  const { state } = game;
  const maker = state.mode === "flick" ? "flick" : null;
  const kept = state.resume;
  if (kept?.kind === "level" && kept.maker === maker) return showRound(game, kept);
  const setup = roundSetup(state.progress);
  const seed = newSeed(game);
  return showRound(game, freshRound({ kind: "level", level: generateLevel(seed, setup.values), maker, loops: setup.loops, seed }));
}

export function openBuild(game) {
  const level = blankLevel();
  game.state.build = { level, tool: "wall", check: checkBuilt(level), mode: null };
  game.state.hint = null;
  onScreen(game, "build");
}

function beginFriend(game) {
  const { state } = game;
  const level = game.relay.level();
  const kept = state.resume;
  if (kept?.kind === "friend" && kept.code === encodeLevel(level)) return showRound(game, kept);
  return showRound(game, freshRound({ kind: "friend", level, maker: "friend", loops: loopsFor(state) }));
}

function beginWatch(game) {
  showRound(game, freshRound({ kind: "watch", level: game.relay.level(), maker: "me", driver: "friend" }));
  startScript(game, [...typing(game.relay.solution()), { kind: "run" }], game.now() + SCRIPT_DELAY);
}

export async function duelNext(game) {
  const duty = game.relay.duty();
  if (duty === "build") return openBuild(game);
  if (duty === "solve") return beginFriend(game);
  if (duty === "watch") return beginWatch(game);
  game.state.screen = "home";
  return game.relay.start();
}

export async function sendBuild(game) {
  const { state } = game;
  const { level, check } = state.build;
  if (!check.ok) {
    state.moments.push({ kind: "shake", target: "send", start: game.now(), duration: 600 });
    game.sound.play("error-soft");
    return;
  }
  game.sound.play("success");
  const loops = loopsFor(state);
  if (state.mode === "friend") {
    await game.relay.sendLevel(encodeLevel(level));
    state.screen = "home";
    return;
  }
  if (state.mode === "flick") {
    const seed = newSeed(game);
    showRound(game, freshRound({ kind: "flick", level, maker: "me", driver: "flick", loops, seed }));
    startScript(game, flickScript(level, { seed, loops }), game.now() + SCRIPT_DELAY);
    return;
  }
  showRound(game, freshRound({ kind: "self", level, maker: "me", loops }));
}

async function award(game, outcome, points) {
  const { state } = game;
  const { round } = state;
  const result = PROGRESS.awardRound(state.progress, { won: wonRound(round.fails), score: points });
  state.progress = result.record;
  game.saveProgress();
  Object.assign(outcome, { stars: result.stars, best: result.record.level - 1, newBest: result.levelUp, gift: result.gift });
  await game.store?.set(roundKey(state), "null");
  state.resume = null;
}

export async function endRound(game) {
  const { state } = game;
  const { round } = state;
  state.endAt = null;
  const count = countOf(round.edit.items);
  const points = pointsFor(count, round.best);
  const outcome = { kind: round.kind, count, stars: starsFor(points, PROGRESS.spec.stars), best: null, newBest: false, gift: null, opened: false };
  if (SCORED.includes(round.kind)) await award(game, outcome, points);
  if (round.kind === "friend") await game.relay.sendProgram(encodeProgram(round.edit.items));
  if (round.kind === "watch") await game.relay.markWatched();
  Object.assign(state, { outcome, screen: "end", hint: null });
  state.moments.push({ kind: "confetti", start: game.now(), duration: 2200 });
  game.sound.play(outcome.stars >= 2 ? "win" : "star");
}

export function startFromHome(game) {
  const { state } = game;
  if (state.variant !== "make") return beginLevels(game);
  return state.mode === "friend" ? duelNext(game) : openBuild(game);
}

export function playAgain(game) {
  const kind = game.state.outcome?.kind;
  if (kind === "flick" || kind === "self") return openBuild(game);
  if (kind === "friend" || kind === "watch") return duelNext(game);
  return beginLevels(game);
}
