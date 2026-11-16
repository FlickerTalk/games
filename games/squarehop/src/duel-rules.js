import { DICE_DOMAIN, diceFor, hop, startRace } from "./rules.js";
import { fromBase64url, sha256, toBase64url, utf8 } from "./sha256.js";

export const SEED_BYTES = 24;

const ZERO = new Uint8Array([0]);
const SEED_LENGTH = Math.ceil((SEED_BYTES * 4) / 3);
const COMMIT_LENGTH = 43;
const PICKS = ["0", "1"];

const hashOf = (seed) => toBase64url(sha256(utf8(DICE_DOMAIN), ZERO, seed));

export const commitText = (seed) => `c${hashOf(seed)}`;
export const seedText = (seed) => `s${toBase64url(seed)}`;
export const revealText = (seed) => `r${toBase64url(seed)}`;

function seedIn(move, letter) {
  if (typeof move !== "string" || move[0] !== letter || move.length !== 1 + SEED_LENGTH) return null;
  const bytes = fromBase64url(move.slice(1));
  return bytes && bytes.length === SEED_BYTES ? bytes : null;
}

export function keyOf(state) {
  if (!state.key) return null;
  return Uint8Array.from([...fromBase64url(state.key), ...fromBase64url(state.seed)]);
}

const initial = () => ({ commit: null, seed: null, key: null, race: startRace(), dice: null });

function turn(state) {
  if (state.commit === null) return 0;
  if (state.seed === null) return 1;
  return state.key === null ? 0 : state.race.next;
}

const result = (state) => (state.race.winner === null ? null : { winner: state.race.winner });

function open(state, move) {
  if (state.commit === null) {
    const fits = typeof move === "string" && move[0] === "c" && move.length === 1 + COMMIT_LENGTH && fromBase64url(move.slice(1));
    return fits ? { state: { ...state, commit: move.slice(1) } } : { error: "bad" };
  }
  if (state.seed === null) return seedIn(move, "s") ? { state: { ...state, seed: move.slice(1) } } : { error: "bad" };
  const revealed = seedIn(move, "r");
  if (!revealed) return { error: "bad" };
  if (hashOf(revealed) !== state.commit) return { error: "reveal" };
  const opened = { ...state, key: move.slice(1) };
  return { state: { ...opened, dice: diceFor(keyOf(opened), 0) } };
}

function play(state, move, side) {
  if (result(state)) return { error: "over" };
  if (side !== turn(state)) return { error: "turn" };
  if (state.key === null) return open(state, move);
  const picked = PICKS.indexOf(move);
  if (picked < 0) return { error: "bad" };
  const { race } = hop(state.race, state.dice[picked]);
  return { state: { ...state, race, dice: race.winner === null ? diceFor(keyOf(state), race.turn) : null } };
}

export const DUEL_RULES = Object.freeze({ id: "squarehop", gv: 1, initial, turn, play, result });
