// A round: the starter chooses the game (g…), the two phones shuffle the deck as in Crazy Eights
// (c<hash>, s<seed>, r<seed>), then the moves of the chosen game. Each phone holds the whole deck;
// what a player may not see is hidden by the board, not by cryptography.

import { shuffleStep } from "../../../kit/src/cards/shuffle.js";
import * as fish from "./fish.js";
import * as pairs from "./pairs.js";
import * as rummy from "./rummy.js";
import * as war from "./war.js";

export const GAMES = Object.freeze({ pairs, war, rummy, fish });
const LETTERS = { p: "pairs", w: "war", r: "rummy", f: "fish" };

export const chooseText = (game, option = "") => `g${game[0]}${option ?? ""}`;
export const HAND_OVER = "g?";

export function initial() {
  return { phase: "choose", game: null, option: null, handed: false, commit: null, seedB: null, next: 0, table: null, end: null };
}

export const turn = (state) => state.next;
export const result = (state) => state.end;

function choose(state, move, side) {
  if (move === HAND_OVER) return side === 0 && !state.handed ? { state: { ...state, handed: true, next: 1 } } : { error: "illegal" };
  const found = /^g([pwrf])(\d{2})?$/.exec(move);
  const game = found && LETTERS[found[1]];
  const option = found?.[2] ? Number(found[2]) : null;
  if (!game || (game === "pairs" ? !pairs.SIZES.includes(option) : option !== null)) return { error: "bad" };
  return { state: { ...state, phase: "shuffle", game, option, next: 0 } };
}

function shuffle(state, move, side) {
  const step = shuffleStep(state, move, side);
  if (step.error) return step;
  if (step.cheat) return { state: { ...state, phase: "done", end: { winner: 1, reason: "cheat" } } };
  if (!step.deck) return { state: { ...state, ...step } };
  const { table, next } = GAMES[state.game].deal(step.deck, state.option);
  return { state: { ...state, phase: "play", table, next } };
}

export function play(state, move, side) {
  if (typeof move !== "string" || move.length === 0 || move.length > 64) return { error: "bad" };
  if (result(state)) return { error: "over" };
  if (side !== turn(state)) return { error: "turn" };
  if (state.phase === "choose") return choose(state, move, side);
  if (state.phase === "shuffle") return shuffle(state, move, side);
  const played = GAMES[state.game].play(state.table, move, side);
  if (played.error) return played;
  const { table, next, end = null } = played;
  return { state: { ...state, table, next, end, phase: end ? "done" : "play" } };
}
