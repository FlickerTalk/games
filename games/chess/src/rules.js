// The rules of chess, as the kit asks for them (README, "A game"), all through chess.js. Side 0
// starts the round and plays white; side 1 plays black. A move is UCI — from, to and, for a
// promotion, the piece: `e2e4`, `e7e8q` — one way to write each move, the same in every language;
// the SAN of each move is kept with it for the PGN.
//
// The kit replays a match from its first move whenever something changes. So that a long game
// stays quick, a state is frozen data that points to the one before it, and playing the same move
// from the same state gives back the same state: a replay of moves already seen is only lookups.
// The chess.js game behind the newest state is handed on to the next one instead of rebuilt.

import { Chess } from "chess.js";

export const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const UCI = /^([a-h][1-8])([a-h][1-8])([qrbn]?)$/;

/** Every round starts from this one state. */
const ROOT = Object.freeze({ fen: START, check: false, end: null, move: null, san: null, ply: 0, prev: null });

/** What each move already played from a state gave. */
const known = new WeakMap();
/** The chess.js game behind a state, while no later state has taken it. */
const games = new WeakMap();

/** The moves from the start to `state`: `[{ move, san }]`. */
export function line(state) {
  const moves = [];
  for (let at = state; at.prev; at = at.prev) moves.push({ move: at.move, san: at.san });
  return moves.reverse();
}

/** The game behind `state`, now the caller's: taken from the state, or rebuilt from its moves. */
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

/** The side to move: 0 for white, 1 for black. */
export function turn(state) {
  return state.fen.split(" ")[1] === "w" ? 0 : 1;
}

/** How the round stands: null while it goes on; else the winner (null: a draw) and why. */
export function result(state) {
  return state.end;
}

/**
 * How a game stands after its last move, as chess.js sees it: checkmate (the side that moved
 * wins), or a draw that comes on its own — stalemate, insufficient material, the same position a
 * third time, fifty moves each without a capture or a pawn move. A mate comes before the rest.
 */
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
  // A promotion letter exactly when a pawn reaches the last rank.
  const promotes = piece?.type === "p" && to[1] === (piece.color === "w" ? "8" : "1");
  if (promotes !== Boolean(promotion)) {
    games.set(state, chess);
    return { error: "bad" };
  }
  let played;
  try {
    played = chess.move(promotion ? { from, to, promotion } : { from, to });
  } catch {
    // chess.js throws before it changes anything.
    games.set(state, chess);
    return { error: "illegal" };
  }
  const next = Object.freeze({ fen: chess.fen(), check: chess.isCheck(), end: verdict(chess), move, san: played.san, ply: state.ply + 1, prev: state });
  games.set(next, chess);
  if (!known.has(state)) known.set(state, new Map());
  known.get(state).set(move, next);
  return { state: next };
}

/**
 * The moves of a round as PGN movetext (numbered SAN, lines of at most 80 characters) ending in
 * its result: `1-0`, `0-1` or `1/2-1/2`. No tag pairs: nothing about who played, or where.
 */
export function pgn(state, token) {
  const words = [];
  line(state).forEach(({ san }, at) => {
    if (at % 2 === 0) words.push(`${at / 2 + 1}.`);
    words.push(san);
  });
  words.push(token);
  const lines = [];
  let text = "";
  for (const word of words) {
    if (text && text.length + 1 + word.length > 80) {
      lines.push(text);
      text = word;
    } else text = text ? `${text} ${word}` : word;
  }
  lines.push(text);
  return lines.join("\n");
}
