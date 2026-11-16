import { spots } from "./court.js";
import { flickFinish, flickStart, flickUpTo } from "./flick.js";
import { PROGRESS, roundSetup, trackOf, wonRound } from "./levels.js";
import { pieceOf } from "./pieces.js";
import { seedOf } from "./random.js";
import { encodeReport } from "./report.js";
import { placeInRound, replayRound, roundResult } from "./round.js";

const END_PAUSE = 1300;
const CLEAR_MS = 1400;

export const roundKey = (state) => `round/${state.chat ?? "-"}`;

export function dailySeed(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return seedOf(`daily/${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`);
}

function hintFor(round) {
  for (let slot = 0; slot < round.slots.length; slot += 1) {
    const id = round.slots[slot];
    const found = id ? spots(round.court, pieceOf(id)) : [];
    if (found.length) return { slot, at: found[Math.floor(found.length / 2)] };
  }
  return null;
}

function keep(game) {
  const { state } = game;
  const snapshot = state.snapshot && { ...state.snapshot, placements: state.round.placements };
  state.snapshot = snapshot;
  return game.run(() => game.store?.set(roundKey(state), JSON.stringify(snapshot)));
}

function show(game, snapshot) {
  const { state } = game;
  const round = replayRound(snapshot);
  if (!round) return false;
  state.round = round;
  state.snapshot = snapshot;
  state.rival = snapshot.rival ? { kind: snapshot.rival } : null;
  state.flick = snapshot.rival === "flick" ? flickUpTo(flickStart(snapshot), round.tray) : null;
  Object.assign(state, { screen: "play", paused: false, outcome: null, drag: { phase: "idle" }, moments: [], endAt: null, resume: null });
  state.hint = state.taught ? null : hintFor(round);
  game.resize(state.width, state.height, state.fill);
  game.sound.music("playful");
  keep(game);
  return true;
}

async function seedFor(game, variant, rival) {
  if (rival === "friend") return game.duel.start();
  if (variant === "daily") return { seed: dailySeed(new Date()), index: null };
  return { seed: seedOf(`${game.random()}/${game.random()}/${game.now()}`), index: null };
}

export async function beginRound(game) {
  const { state } = game;
  const variant = state.variant;
  const rival = variant === "main" && state.mode !== "alone" ? state.mode : null;
  const kept = state.resume;
  if (kept?.variant === variant && kept.rival === rival) {
    const same = rival === "friend" ? (await game.duel.start()).seed === kept.seed : true;
    if (same && show(game, kept)) return;
  }
  const setup = roundSetup(state.progress, { variant, mode: rival ?? "alone" });
  const { seed, index } = await seedFor(game, variant, rival);
  show(game, { v: 1, variant, seed, mix: [...setup.mix], skill: setup.skill, rival, duelIndex: index, placements: [] });
}

function addMoments(game, events, piece) {
  const { state } = game;
  const { court } = state.layout;
  const now = game.now();
  const at = events.tiles.reduce((sum, cell) => [sum[0] + (cell % court.size) + 0.5, sum[1] + Math.floor(cell / court.size) + 0.5], [0, 0]);
  const x = court.x + (at[0] / events.tiles.length) * court.cell;
  const y = court.y + (at[1] / events.tiles.length) * court.cell;
  const add = (moment) => state.moments.push({ start: now, ...moment });
  add({ kind: "dust", x, y, size: court.cell * Math.max(piece.width, piece.height), duration: 450 });
  add({ kind: "burst", x, y, points: events.points, duration: 900 });
  const lines = [...events.lines, ...events.rescued];
  if (lines.length) add({ kind: "clear", lines, effect: state.progress.chosen.effect, duration: CLEAR_MS + Math.min(lines.length - 1, 6) * 110 });
  if (events.emptied) add({ kind: "empty", duration: 1600 });
  if (events.tray) add({ kind: "tray", duration: 320 });
}

export function layPiece(game, slot, at) {
  const { state } = game;
  const played = placeInRound(state.round, slot, at);
  if (played.error) return false;
  const { events } = played;
  state.round = played.round;
  addMoments(game, events, pieceOf(events.piece));
  const lines = events.lines.length;
  game.sound.play(lines > 1 ? "success" : lines === 1 ? "collect" : "place");
  if (!state.taught) {
    state.taught = true;
    game.saveOwn();
  }
  if (events.tray && state.flick) flickUpTo(state.flick, state.round.tray);
  keep(game);
  state.hint = null;
  if (events.over) state.endAt = game.now() + END_PAUSE + (lines ? CLEAR_MS / 2 : 0);
  return true;
}

export function finishDue(game) {
  game.state.endAt = null;
  return game.run(() => endRound(game));
}

function cue(outcome) {
  if (outcome.rival && !outcome.won) return "lose-soft";
  return outcome.stars >= 2 ? "win" : "star";
}

export async function endRound(game) {
  const { state } = game;
  const { round } = state;
  const mine = roundResult(round);
  const rival = state.flick ? { score: flickFinish(state.flick).round.score } : null;
  if (state.rival?.kind === "friend") await game.duel.finish(state.snapshot.duelIndex, encodeReport(round));
  const won = wonRound({ mode: state.rival?.kind ?? "alone", mine, rival });
  const track = trackOf(round.variant);
  const award = PROGRESS.awardRound(state.progress, { won, score: mine.score, track });
  state.progress = award.record;
  game.saveProgress();
  const best = track ? award.record.bests[track] : award.record.best;
  state.outcome = { score: mine.score, stars: award.stars, best, newBest: award.newBest, gift: award.gift, opened: false, over: round.over, won, rival, duelIndex: state.snapshot.duelIndex };
  state.snapshot = null;
  state.screen = "end";
  if (won) state.moments.push({ kind: "confetti", start: game.now(), duration: 2200 });
  game.sound.play(cue(state.outcome));
  await game.store?.set(roundKey(state), "null");
}
