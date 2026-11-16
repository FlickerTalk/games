import { FLICK, standIn } from "../../../kit/src/avatars/index.js";
import { flickPick } from "./flick.js";
import { PROGRESS, flickSkill, scoreOf } from "./levels.js";
import { TIMES, advance, canPick, choose, freshRound, replay, savedRound, setKey, turnOf } from "./round.js";
import { FINISH } from "./rules.js";

const KEY_BYTES = 48;
const END_MS = 900;
const CONFETTI_MS = 2200;
const SOUNDS = {
  pick: () => ["pick", {}],
  hop: ({ n }) => ["tick", { pitch: 1 + n * 0.08 }],
  spring: () => ["bounce", {}],
  turbo: () => ["whoosh", {}],
  puddle: () => ["splash", {}],
  bump: () => ["pop", {}],
  roll: () => ["tap", { gain: 0.5 }],
};

export const roundKey = (state) => `round/${state.chat ?? "-"}`;

export const kindFor = (state) => (state.mode === "alone" ? state.variant : state.mode);

export function rivalOf(state) {
  const kind = state.round?.kind ?? kindFor(state);
  return kind === "flick" ? { who: FLICK.id } : standIn(state.player);
}

export function mayPick(game, now) {
  const { state, duel } = game;
  const { round } = state;
  if (state.screen !== "play" || state.paused || !round || !canPick(round, now)) return false;
  if (round.kind === "pair") return true;
  if (turnOf(round) !== round.me) return false;
  return round.kind !== "friend" || (duel.duty() === "pick" && round.sent !== round.picks.length);
}

export function keepRound(game) {
  const { state } = game;
  const { round } = state;
  if (!round || round.kind === "friend") return;
  game.run(() => game.store?.set(roundKey(state), round.race.winner === null ? savedRound(round) : "null"));
}

function onScreen(game, screen) {
  const { state } = game;
  Object.assign(state, { screen, paused: false, outcome: null, moments: [], endAt: null, press: null, flickAt: null });
  game.resize(state.width, state.height, state.fill);
  game.sound.pause(false);
}

function showRound(game, round) {
  const { state } = game;
  state.round = round;
  state.resume = null;
  state.skill = flickSkill(state.progress);
  onScreen(game, "play");
  state.hint = !state.taught;
}

function beginLocal(game, kind) {
  const { state } = game;
  const kept = state.resume;
  if (kept?.kind === kind) {
    kept.rolledAt = game.now();
    return showRound(game, kept);
  }
  const key = Uint8Array.from({ length: KEY_BYTES }, () => Math.floor(game.random() * 256));
  showRound(game, freshRound({ kind, key, now: game.now() }));
  keepRound(game);
  return undefined;
}

export function syncFriend(game) {
  const { state, duel } = game;
  const { round } = state;
  const live = duel?.round;
  if (!live || round?.kind !== "friend" || state.screen !== "play") return;
  const now = game.now();
  round.id ??= live.id;
  if (round.id !== live.id) return;
  round.me = live.me;
  if (live.void) {
    Object.assign(state, { screen: "home", round: null });
    return;
  }
  if (!live.key) return;
  if (!round.key) {
    setKey(round, live.key, now);
    replay(round, live.picks, now);
  }
  for (let at = round.picks.length; at < live.picks.length; at += 1) choose(round, live.picks[at], now);
}

async function beginFriend(game) {
  await game.duel.start();
  showRound(game, { ...freshRound({ kind: "friend", now: game.now() }), id: null, sent: null });
  syncFriend(game);
}

export function startRound(game) {
  const kind = kindFor(game.state);
  return kind === "friend" ? beginFriend(game) : beginLocal(game, kind);
}

export function pressDie(game, index) {
  const { state } = game;
  const { round } = state;
  const now = game.now();
  if (!mayPick(game, now)) return;
  state.hint = false;
  if (!state.taught) {
    state.taught = true;
    game.saveOwn();
  }
  if (round.kind === "friend") {
    round.sent = round.picks.length;
    game.run(() => game.duel.pick(index));
    return;
  }
  choose(round, index, now);
  keepRound(game);
}

function flickTurn(game, now) {
  const { state } = game;
  const { round } = state;
  if (round.kind !== "flick" || turnOf(round) === round.me || !canPick(round, now)) return;
  state.flickAt ??= now + TIMES.think;
  if (now < state.flickAt) return;
  state.flickAt = null;
  choose(round, flickPick(round.race, round.dice, { skill: state.skill, random: game.random }), now);
  keepRound(game);
}

export function frameRound(game, now) {
  const { state } = game;
  const { round } = state;
  if (!round) return;
  syncFriend(game);
  if (state.screen !== "play") return;
  for (const cue of advance(round, now)) {
    const [name, options] = SOUNDS[cue.name]?.(cue) ?? [];
    if (name) game.sound.play(name, options);
  }
  flickTurn(game, now);
  if (round.race.winner !== null && !round.move && state.endAt === null) state.endAt = now + END_MS;
}

const leadOf = (best) => (Number.isFinite(best) && best > FINISH ? best - FINISH : null);

export async function endRound(game) {
  const { state } = game;
  const { round } = state;
  state.endAt = null;
  const { me } = round;
  const won = round.race.winner === me;
  const outcome = { kind: round.kind, won, mine: round.race.at[me], theirs: round.race.at[1 - me], stars: null, best: null, newBest: false, gift: null, opened: false };
  if (round.kind !== "pair") {
    const result = PROGRESS.awardRound(state.progress, { won, score: scoreOf(round.race, me) });
    state.progress = result.record;
    game.saveProgress();
    Object.assign(outcome, { stars: result.stars, best: leadOf(result.record.best), newBest: result.newBest && won, gift: result.gift });
  }
  if (round.kind !== "friend") await game.store?.set(roundKey(state), "null");
  Object.assign(state, { outcome, screen: "end", hint: false, resume: null });
  if (won || round.kind === "pair") state.moments.push({ kind: "confetti", start: game.now(), duration: CONFETTI_MS });
  game.sound.play(won || round.kind === "pair" ? "win" : "lose-soft");
}
