import { seedOf } from "../../../kit/src/canvas/random.js";
import { decodeSetup, encodeSetup } from "./generate.js";
import { PROGRESS, pointsFor, roundSetup, wonRound } from "./levels.js";
import { keepRound } from "./playing.js";
import { clinksOf } from "./round.js";
import { fastForward, freshRound, hintOf, roundKey } from "./rounds.js";

const newSeed = (game) => seedOf(`${game.random()}/${game.random()}/${game.now()}`);

export function showRound(game, round) {
  const { state } = game;
  Object.assign(state, { round, resume: null, screen: "play", paused: false, outcome: null, moments: [], endAt: null, press: null, wanting: false });
  game.resize(state.width, state.height, state.fill);
  state.hint = hintOf(round, state);
  game.sound.music("playful");
  keepRound(game);
}

function beginLocal(game) {
  const { state } = game;
  const kind = state.mode === "flick" ? "flick" : "alone";
  if (state.resume?.kind === kind) return showRound(game, fastForward(state.resume, state.resume.hits, game.now()));
  const setup = roundSetup(state.progress, { team: kind === "flick", seed: newSeed(game) });
  return showRound(game, freshRound({ kind, setup, now: game.now() }));
}

function showTeam(game) {
  const { relay } = game;
  const setup = decodeSetup(relay.seen.state.code);
  const round = fastForward({ kind: "friend", setup, mySide: relay.mySide(), id: relay.roundId() }, relay.moves(), game.now());
  if (round && !round.core.over) showRound(game, round);
}

export async function teamNext(game) {
  const { state, relay } = game;
  if (!state.wanting || game.teaming) return;
  game.teaming = true;
  try {
    if (relay.duty() === "setup") await relay.sendSetup(encodeSetup(roundSetup(state.progress, { team: true, seed: newSeed(game) })));
    if (relay.duty() === "play") showTeam(game);
  } finally {
    game.teaming = false;
  }
}

async function beginTeam(game) {
  const { state, relay } = game;
  Object.assign(state, { wanting: true, screen: "home", paused: false });
  if (relay.duty() === "start" || !relay.status.here) await relay.start();
  await teamNext(game);
}

export const beginRound = (game) => (game.state.mode === "friend" ? beginTeam(game) : beginLocal(game));

export async function endRound(game) {
  const { state } = game;
  const { round } = state;
  state.endAt = null;
  const clinks = clinksOf(round.core);
  const score = pointsFor(clinks);
  const award = PROGRESS.awardRound(state.progress, { won: wonRound(clinks), score });
  state.progress = award.record;
  game.saveProgress();
  state.outcome = { team: round.kind !== "alone", golems: round.core.golems.length, clinks, score, stars: award.stars, best: award.record.best, newBest: award.newBest, gift: award.gift, opened: false };
  Object.assign(state, { screen: "end", hint: null });
  state.moments.push({ kind: "confetti", start: game.now(), duration: 2200 });
  game.sound.play(award.stars >= 2 ? "win" : "star");
  if (round.kind !== "friend") await game.store?.set(roundKey(state), "null");
}
