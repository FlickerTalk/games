import { Chess } from "chess.js";
import { search } from "../../../kit/src/robot.js";

const VALUE = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
const ENDGAME = 2600;
const FIFTY = 100;

const key = (fen) => fen.split(" ", 4).join(" ");
const centre = (file, rank) => Math.max(Math.abs(file - 3.5), Math.abs(rank - 3.5));

function pieces(fen) {
  const found = [];
  let rank = 7;
  let file = 0;
  for (const mark of fen.slice(0, fen.indexOf(" "))) {
    if (mark === "/") {
      rank -= 1;
      file = 0;
    } else if (mark >= "1" && mark <= "8") {
      file += Number(mark);
    } else {
      found.push({ type: mark.toLowerCase(), side: mark === mark.toUpperCase() ? 0 : 1, file, rank });
      file += 1;
    }
  }
  return found;
}

function placed({ type, side, file, rank }) {
  const ahead = side === 0 ? rank : 7 - rank;
  const off = centre(file, rank);
  if (type === "p") return 5 * (ahead - 1) + (off < 1 ? 15 : 0);
  if (type === "n") return 20 - 10 * off;
  if (type === "b") return 10 - 5 * off;
  if (type === "r") return ahead === 6 ? 15 : 0;
  if (type === "q") return 5 - 2 * off;
  return 0;
}

function kings(found, material) {
  const [white, black] = [0, 1].map((side) => found.find((piece) => piece.type === "k" && piece.side === side));
  const endgame = material[0] + material[1] <= ENDGAME;
  const safety = (king) => (endgame ? 10 * (3.5 - centre(king.file, king.rank)) : -10 * (king.side === 0 ? king.rank : 7 - king.rank));
  let total = safety(white) - safety(black);
  const apart = Math.abs(white.file - black.file) + Math.abs(white.rank - black.rank);
  if (material[1] === 0 && material[0] >= VALUE.r) total += 4 * (14 - apart);
  if (material[0] === 0 && material[1] >= VALUE.r) total -= 4 * (14 - apart);
  return total;
}

export function evaluate(fen, side) {
  const found = pieces(fen);
  const material = [0, 0];
  let total = 0;
  for (const piece of found) {
    if (piece.type !== "p" && piece.type !== "k") material[piece.side] += VALUE[piece.type];
    const worth = VALUE[piece.type] + placed(piece);
    total += piece.side === 0 ? worth : -worth;
  }
  total += kings(found, material);
  return side === 0 ? total : -total;
}

function settle(spot) {
  if (spot.fen === undefined) {
    const chess = board(spot.prev);
    chess.move(spot.san);
    spot.fen = chess.fen();
    spot.check = chess.inCheck();
    chess.undo();
  }
  return spot;
}

function board(spot) {
  spot.chess ??= new Chess(settle(spot).fen);
  return spot.chess;
}

function legal(spot) {
  spot.list ??= board(spot).moves();
  return spot.list;
}

function turn(spot) {
  spot.side ??= spot.prev ? 1 - turn(spot.prev) : spot.fen.split(" ")[1] === "w" ? 0 : 1;
  return spot.side;
}

function repeated(spot) {
  const position = key(spot.fen);
  let times = 0;
  let at = spot.prev;
  for (; at.prev; at = at.prev) if (key(at.fen) === position) times += 1;
  return times + (at.seen.get(position) ?? 0) >= 2;
}

function bare(fen) {
  const left = fen.slice(0, fen.indexOf(" ")).replace(/[^a-z]/gi, "");
  return left.length === 2 || (left.length === 3 && /[nb]/i.test(left.replace(/k/gi, "")));
}

function result(spot) {
  settle(spot);
  if (spot.check && legal(spot).length === 0) return { winner: 1 - turn(spot) };
  if (Number(spot.fen.split(" ")[4]) >= FIFTY || bare(spot.fen) || repeated(spot)) return { winner: null };
  return null;
}

function order(spot) {
  const chess = board(spot);
  const worth = (san) => {
    let total = /[+#]$/.test(san) ? 50 : 0;
    if (san.includes("=Q")) total += 10 * VALUE.q;
    const taking = san.indexOf("x");
    if (taking >= 0) {
      const victim = chess.get(san.slice(taking + 1, taking + 3));
      const attacker = /^[NBRQK]/.test(san) ? san[0].toLowerCase() : "p";
      total += 10 * VALUE[victim ? victim.type : "p"] - VALUE[attacker] / 10;
    }
    return total;
  };
  return legal(spot)
    .map((san) => ({ san, worth: worth(san) }))
    .sort((one, two) => two.worth - one.worth)
    .map(({ san }) => san);
}

// The search plays on positions of its own because the memo in rules.js would keep every position it tries until the frame closes.
const POSITIONS = {
  turn,
  play: (spot, san) => ({ state: { prev: spot, san } }),
  result,
  robot: { moves: order, score: (spot, side) => (spot.list?.length === 0 ? 0 : evaluate(spot.fen, side)) },
};

export const robot = {
  depth: 4,
  budgetMs: 300,
  slack: 10,
  move(state, side, memory, random) {
    const seen = new Map();
    for (let at = state; at; at = at.prev) seen.set(key(at.fen), (seen.get(key(at.fen)) ?? 0) + 1);
    const root = { fen: state.fen, prev: null, seen };
    const { choices } = search(POSITIONS, root, side, { depth: this.depth, budgetMs: this.budgetMs, slack: this.slack });
    if (!choices.length) return null;
    const made = board(root).move(choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))]);
    return made.from + made.to + (made.promotion ?? "");
  },
};
