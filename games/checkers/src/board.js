// The checkers board (README, "A game": `board.mount`). Sixty-four squares, the dark ones buttons;
// it knows nothing of the other phone: it draws what the kit hands it and passes the user's move
// back as the squares it touches. A move takes two taps or more: the piece, then where it goes,
// and on through every jump; when the squares tapped make a whole legal move, it is played. For
// the light side the board is turned around, so one's own pieces are at the bottom.

import STYLE from "./board.css";
import { icon } from "../../../kit/src/icons.js";
import { SIZE, count, isDark, isKing, legalMoves, sideOf, squaresOf } from "./rules.js";

export { STYLE };

const piece = (side, king) =>
  `<svg class="fck-p fck-s${side}" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="40"/>${king ? '<circle class="crown" cx="50" cy="50" r="20"/>' : ""}</svg>`;

/** A man of each side, for the players' chips. */
export const PIECES = [piece(0, false), piece(1, false)];

function draw(host, ctx, path) {
  const { cells } = ctx.state;
  const t = ctx.t;
  const names = [t("dark"), t("light"), t("darkKing"), t("lightKing")];
  const legal = ctx.canPlay && ctx.mySide !== null ? legalMoves(ctx.state, ctx.mySide) : [];
  const prefix = path.join("-");
  // With a piece chosen: where it may go next. With none: the pieces that may move.
  const from = path.length ? new Set() : new Set(legal.map((move) => Number(move.split("-")[0])));
  const to = new Set(path.length ? legal.filter((move) => move === prefix || move.startsWith(`${prefix}-`)).map((move) => Number(move.split("-")[path.length])).filter((square) => !Number.isNaN(square)) : []);
  const lastSquares = squaresOf(ctx.last) ?? [];
  const [dark, light] = count(cells);
  const flipped = ctx.mySide === 1;
  let html = `<div class="fck s${ctx.mySide ?? 0}${ctx.canPlay ? " mine" : ""}" role="group" aria-label="${t("board")}: ${t("count", { dark, light })}">`;
  for (let shown = 0; shown < SIZE * SIZE; shown += 1) {
    const index = flipped ? SIZE * SIZE - 1 - shown : shown;
    const one = cells[index];
    if (!isDark(index)) {
      html += '<span class="fck-sq" aria-hidden="true"></span>';
      continue;
    }
    const name = `${t("square", { row: Math.floor(index / SIZE) + 1, col: (index % SIZE) + 1 })}: ${one === null ? t("empty") : names[one]}`;
    const classes = ["fck-sq", "dark"];
    if (path.includes(index)) classes.push("from");
    if (from.has(index)) classes.push("can");
    if (to.has(index)) classes.push("to");
    if (lastSquares.includes(index)) classes.push("last");
    const landed = lastSquares.at(-1) === index;
    if (landed && ctx.pending) classes.push("pending");
    const open = ctx.canPlay && (from.has(index) || to.has(index) || path.includes(index));
    html += `<button class="${classes.join(" ")}" data-cell="${index}" aria-label="${name}" ${open ? "" : "disabled"}>${one === null ? "" : piece(sideOf(one), isKing(one))}${
      landed && ctx.pending ? `<span class="fck-clock" aria-hidden="true">${icon("time-outline")}</span>` : ""
    }</button>`;
  }
  host.innerHTML = `${html}</div>`;
}

export const board = {
  mount(host, first) {
    let ctx = first;
    /** The squares tapped so far of the move being made. */
    let path = [];
    host.addEventListener("click", (event) => {
      const square = event.target.closest?.("[data-cell]");
      if (!square || square.disabled || !ctx.canPlay || ctx.mySide === null) return;
      const index = Number(square.dataset.cell);
      const legal = legalMoves(ctx.state, ctx.mySide);
      if (path.includes(index)) {
        // Tapping the chosen piece again, or a square already in the path, starts over.
        path = [];
      } else if (!path.length) {
        if (legal.some((move) => Number(move.split("-")[0]) === index)) path = [index];
      } else {
        const next = [...path, index].join("-");
        if (legal.includes(next)) {
          path = [];
          ctx.play(next);
          return;
        }
        if (legal.some((move) => move.startsWith(`${next}-`))) path = [...path, index];
      }
      draw(host, ctx, path);
    });
    draw(host, ctx, path);
    return {
      update(next) {
        // Another position: whatever was being chosen is forgotten.
        if (next.state !== ctx.state) path = [];
        ctx = next;
        draw(host, ctx, path);
      },
    };
  },
};
