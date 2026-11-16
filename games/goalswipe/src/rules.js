// Moves (64 characters at most):
//   c<hash>        the shooter's commitment: SHA-256("ftgames-kick-v1" ‖ 0 ‖ kick ‖ salt ‖ shot), base64url
//   d<dive>        where the keeper dives, two letters
//   r<salt><shot>  the shooter's salt (12 bytes, base64url) and the shot, two letters

import { REACH, aimText, diveText, readAim, readDive, resolveKick } from "./kicks.js";
import { fromBase64url, sha256, toBase64url, utf8 } from "./sha256.js";
import { overOf, shooterOf } from "./shootout.js";

export const SALT_BYTES = 12;
const DOMAIN = utf8("ftgames-kick-v1");
const HASH_LETTERS = 43;
const SALT_LETTERS = 16;
const HASH = new RegExp(`^[A-Za-z0-9_-]{${HASH_LETTERS}}$`);

const commitment = (index, salt, shot) => toBase64url(sha256(DOMAIN, Uint8Array.of(0, index), salt, utf8(shot)));

export const commitMove = (index, salt, aim) => `c${commitment(index, salt, aimText(aim))}`;
export const diveMove = (dive) => `d${diveText(dive)}`;
export const revealMove = (salt, aim) => `r${toBase64url(salt)}${aimText(aim)}`;

export const initial = () => ({ kicks: [], phase: "commit", commit: null, dive: null });

export const result = (state) => overOf(state.kicks);

export function turn(state) {
  const shooter = shooterOf(state.kicks.length);
  return state.phase === "dive" ? 1 - shooter : shooter;
}

function reveal(state, body) {
  const salt = fromBase64url(body.slice(0, SALT_LETTERS));
  const shot = body.slice(SALT_LETTERS);
  const aim = readAim(shot);
  if (!salt || salt.length !== SALT_BYTES || !aim) return { error: "bad" };
  if (commitment(state.kicks.length, salt, shot) !== state.commit) return { error: "reveal" };
  const dive = readDive(state.dive);
  const kick = { aim, dive, ...resolveKick(aim, dive, REACH.blind) };
  return { state: { kicks: [...state.kicks, kick], phase: "commit", commit: null, dive: null } };
}

export function play(state, move, side) {
  if (result(state)) return { error: "over" };
  if (side !== turn(state)) return { error: "turn" };
  if (typeof move !== "string" || move.length < 2) return { error: "bad" };
  const body = move.slice(1);
  if (move[0] === "c" && state.phase === "commit") return HASH.test(body) ? { state: { ...state, phase: "dive", commit: body } } : { error: "bad" };
  if (move[0] === "d" && state.phase === "dive") return readDive(body) ? { state: { ...state, phase: "reveal", dive: body } } : { error: "bad" };
  if (move[0] === "r" && state.phase === "reveal") return reveal(state, body);
  return { error: "bad" };
}

export const RULES = Object.freeze({ id: "goalswipe", gv: 1, initial, turn, play, result });
