import { seedOf } from "../../../kit/src/canvas/random.js";
import { starsFor } from "../../../kit/src/progress/index.js";
import { blankBuild, checkBuilt, trainOf } from "./composer.js";
import { flickScript, replayScript } from "./flick.js";
import { generateTrain, shapeOf } from "./generate.js";
import { PROGRESS, TRAINS, pointsFor, roundSetup, wonRound } from "./levels.js";
import { keepRound, startScript } from "./playing.js";
import { encodeTries } from "./puzzle.js";
import { freshRound, roundKey, setTrain } from "./rounds.js";
import { encodeTrain } from "./train.js";

const SCORED = ["level", "friend"];
const SHAKE_MS = 600;

const newSeed = (game) => seedOf(`${game.random()}/${game.random()}/${game.now()}`);

function onScreen(game, screen) {
  const { state } = game;
  Object.assign(state, { screen, paused: false, outcome: null, moments: [], endAt: null, press: null, drag: null, hint: null });
  game.relayout();
  game.sound.music("calm");
}

export function showRound(game, round) {
  const { state } = game;
  state.round = setTrain(round, round.at, game.now());
  state.resume = null;
  onScreen(game, "play");
  game.sound.play("whoosh", { gain: 0.5 });
  keepRound(game);
}

export function beginLevels(game) {
  const { state } = game;
  const maker = state.mode === "flick" ? "flick" : null;
  const kept = state.resume;
  if (kept?.kind === "level" && kept.maker === maker) return showRound(game, kept);
  const { values } = roundSetup(state.progress);
  const seed = newSeed(game);
  const trains = Array.from({ length: TRAINS }, (_, at) => generateTrain(`${seed}/${at}`, values));
  return showRound(game, freshRound({ kind: "level", trains, maker, seed, choices: shapeOf(values).choices }));
}

export function openCompose(game) {
  const build = blankBuild();
  game.state.build = { ...build, check: checkBuilt(build) };
  onScreen(game, "build");
}

function beginFriend(game) {
  const { state } = game;
  const train = game.relay.train();
  const code = encodeTrain(train);
  const kept = state.resume;
  if (kept?.kind === "friend" && encodeTrain(kept.trains[0]) === code) return showRound(game, kept);
  return showRound(game, freshRound({ kind: "friend", trains: [train], maker: "friend", seed: code }));
}

function beginWatch(game) {
  const train = game.relay.train();
  showRound(game, freshRound({ kind: "watch", trains: [train], maker: "me", driver: "friend", seed: encodeTrain(train) }));
  startScript(game, replayScript(game.relay.tries()));
}

export async function duelNext(game) {
  const duty = game.relay.duty();
  if (duty === "build") return openCompose(game);
  if (duty === "solve") return beginFriend(game);
  if (duty === "watch") return beginWatch(game);
  game.state.screen = "home";
  return game.relay.start();
}

function listen(game) {
  const { build } = game.state;
  if (!build.wagons.length) {
    game.sound.play("error-soft");
    return;
  }
  build.tune = { start: game.now(), fired: 0 };
}

export async function sendBuild(game) {
  const { state } = game;
  if (state.mode === "alone") return listen(game);
  if (!state.build.check.ok) {
    state.moments.push({ kind: "shake", target: "send", start: game.now(), duration: SHAKE_MS });
    game.sound.play("error-soft");
    return undefined;
  }
  const train = trainOf(state.build);
  game.sound.play("success");
  if (state.mode === "friend") {
    await game.relay.sendTrain(encodeTrain(train));
    state.screen = "home";
    return undefined;
  }
  const seed = newSeed(game);
  showRound(game, freshRound({ kind: "flick", trains: [train], maker: "me", driver: "flick", seed }));
  return startScript(game, flickScript(train, state.round.candidates, seed));
}

async function award(game, outcome, points) {
  const { state } = game;
  const result = PROGRESS.awardRound(state.progress, { won: wonRound(state.round.wrongs), score: points });
  state.progress = result.record;
  game.saveProgress();
  Object.assign(outcome, { stars: result.stars, gift: result.gift });
  await game.store?.set(roundKey(state), "null");
  state.resume = null;
}

export async function endRound(game) {
  const { state } = game;
  const { round } = state;
  state.endAt = null;
  const points = pointsFor(round.wrongs);
  const outcome = { kind: round.kind, level: state.progress.level, wrongs: round.wrongs, stars: starsFor(points, PROGRESS.spec.stars), gift: null, opened: false };
  if (SCORED.includes(round.kind)) await award(game, outcome, points);
  if (round.kind === "friend") await game.relay.sendTries(encodeTries(round.puzzle.tries));
  if (round.kind === "watch") await game.relay.markWatched();
  Object.assign(state, { outcome, screen: "end", hint: null, drag: null });
  state.moments.push({ kind: "confetti", start: game.now(), duration: 2200 });
  game.sound.play(outcome.stars >= 2 ? "win" : "star");
}

export function startFromHome(game) {
  const { state } = game;
  if (state.variant !== "make") return beginLevels(game);
  return state.mode === "friend" ? duelNext(game) : openCompose(game);
}

export function playAgain(game) {
  const kind = game.state.outcome?.kind;
  if (kind === "flick") return openCompose(game);
  if (kind === "friend" || kind === "watch") return duelNext(game);
  return beginLevels(game);
}
