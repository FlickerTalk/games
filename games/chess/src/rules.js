// Side 0 plays white. Moves are UCI (`e2e4`, `e7e8q`), one way per move, with the SAN kept for the PGN.
// The kit replays from the first move on every change, so states are frozen and memoised. The same move
// from the same state gives back the same state, and the newest chess.js game is handed on.

import { Chess } from "chess.js";

export const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const UCI = /^([a-h][1-8])([a-h][1-8])([qrbn]?)$/;

const ROOT = Object.freeze({ fen: START, check: false, end: null, move: null, san: null, ply: 0, prev: null });

const known = new WeakMap();
const games = new WeakMap();

export function line(state) {
  const moves = [];
  for (let at = state; at.prev; at = at.prev) moves.push({ move: at.move, san: at.san });
  return moves.reverse();
}

function take(state) {
  const kept = games.get(state);
  if (kept) {
    games.delete(state);
    return kept;
  }
  const chess = new Chess();
  for (const { move } of line(state)) chess.move(parse(move));
  return chess;
}

function parse(move) {
  const [, from, to, promotion] = UCI.exec(move);
  return promotion ? { from, to, promotion } : { from, to };
}

export function initial() {
  return ROOT;
}

export function turn(state) {
  return state.fen.split(" ")[1] === "w" ? 0 : 1;
}

export function result(state) {
  return state.end;
}

export function verdict(chess) {
  if (chess.isCheckmate()) return { winner: chess.turn() === "w" ? 1 : 0, reason: "checkmate" };
  if (chess.isStalemate()) return { winner: null, reason: "stalemate" };
  if (chess.isInsufficientMaterial()) return { winner: null, reason: "material" };
  if (chess.isThreefoldRepetition()) return { winner: null, reason: "repetition" };
  if (chess.isDrawByFiftyMoves()) return { winner: null, reason: "fifty" };
  return null;
}

export function play(state, move, side) {
  const uci = typeof move === "string" ? UCI.exec(move) : null;
  if (!uci) return { error: "bad" };
  if (state.end) return { error: "over" };
  if (side !== turn(state)) return { error: "turn" };
  const seen = known.get(state)?.get(move);
  if (seen) return { state: seen };
  const chess = take(state);
  const [, from, to, promotion] = uci;
  const piece = chess.get(from);
  const promotes = piece?.type === "p" && to[1] === (piece.color === "w" ? "8" : "1");
  if (promotes !== Boolean(promotion)) {
    games.set(state, chess);
    return { error: "bad" };
  }
  let played;
  try {
    played = chess.move(promotion ? { from, to, promotion } : { from, to });
  } catch {
    // chess.js throws before it changes anything
    games.set(state, chess);
    return { error: "illegal" };
  }
  const next = Object.freeze({ fen: chess.fen(), check: chess.isCheck(), end: verdict(chess), move, san: played.san, ply: state.ply + 1, prev: state });
  games.set(next, chess);
  if (!known.has(state)) known.set(state, new Map());
  known.get(state).set(move, next);
  return { state: next };
}

/** No tag pairs, nothing about who played or where. */
export function pgn(state, token) {
  const words = [];
  line(state).forEach(({ san }, at) => {
    if (at % 2 === 0) words.push(`${at / 2 + 1}.`);
    words.push(san);
  });
  return [...words, token].join(" ");
}
