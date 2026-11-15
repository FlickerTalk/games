import { SIZE, isKing, legalMoves, sideOf } from "./rules.js";

const MAN = 100;
const KING = 160;
const STEP_FORWARD = 4;
const BACK_ROW = 6;
const CENTRE = 3;

const forward = (side, row) => (side === 0 ? row : SIZE - 1 - row);

function worth(piece, cell) {
  const row = Math.floor(cell / SIZE);
  const col = cell % SIZE;
  const centre = row >= 2 && row <= 5 && col >= 2 && col <= 5 ? CENTRE : 0;
  if (isKing(piece)) return KING + centre;
  const ahead = forward(sideOf(piece), row);
  return MAN + STEP_FORWARD * ahead + (ahead === 0 ? BACK_ROW : 0) + centre;
}

function score(state, side) {
  let total = 0;
  state.cells.forEach((piece, cell) => {
    if (piece === null) return;
    total += sideOf(piece) === side ? worth(piece, cell) : -worth(piece, cell);
  });
  return total;
}

function crowns(state, move, side) {
  const to = Number(move.slice(move.lastIndexOf("-") + 1));
  return !isKing(state.cells[Number(move.slice(0, move.indexOf("-")))]) && forward(side, Math.floor(to / SIZE)) === SIZE - 1;
}

function order(state, side) {
  const rank = (move) => move.split("-").length * 2 + (crowns(state, move, side) ? 1 : 0);
  return legalMoves(state, side).sort((one, two) => rank(two) - rank(one));
}

export const robot = {
  moves: order,
  score,
  depth: 6,
  budgetMs: 250,
  slack: 2,
};
