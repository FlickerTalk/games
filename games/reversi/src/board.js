// The Reversi board (README, "A game": `board.mount`). Sixty-four buttons on a felt, the discs in
// SVG; it knows nothing of the other phone: it draws what the kit hands it and passes the user's
// touch back as a move, a cell from 0 to 63. The cells the user may play are dotted; the discs just
// turned flip over.

import STYLE from "./board.css";
import { icon } from "../../../kit/src/icons.js";
import { SIZE, count, flips, moves } from "./rules.js";

export { STYLE };

/** The two discs, dark for side 0 and light for side 1; also shown on the players' chips. */
export const DISCS = [
  '<svg class="frv-disc frv-s0" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="42"/></svg>',
  '<svg class="frv-disc frv-s1" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="42"/></svg>',
];

function draw(host, ctx, flipped) {
  const { cells } = ctx.state;
  const t = ctx.t;
  const names = [t("dark"), t("light")];
  const legal = ctx.canPlay && ctx.mySide !== null ? new Set(moves(cells, ctx.mySide)) : new Set();
  const [dark, light] = count(cells);
  let html = `<div class="frv s${ctx.mySide ?? 0}${ctx.canPlay ? " mine" : ""}" role="group" aria-label="${t("board")}: ${t("count", { dark, light })}">`;
  cells.forEach((side, index) => {
    const name = `${t("cell", { row: Math.floor(index / SIZE) + 1, col: (index % SIZE) + 1 })}: ${side === null ? t("empty") : names[side]}`;
    const classes = ["frv-cell"];
    if (legal.has(index)) classes.push("legal");
    if (index === ctx.last && side !== null) classes.push("last");
    if (index === ctx.last && ctx.pending) classes.push("pending");
    if (flipped.has(index)) classes.push("flip");
    html += `<button class="${classes.join(" ")}" data-cell="${index}" aria-label="${name}" ${legal.has(index) ? "" : "disabled"}>${side === null ? "" : DISCS[side]}${
      index === ctx.last && ctx.pending ? `<span class="frv-clock" aria-hidden="true">${icon("time-outline")}</span>` : ""
    }</button>`;
  });
  host.innerHTML = `${html}</div>`;
}

export const board = {
  mount(host, first) {
    let ctx = first;
    host.addEventListener("click", (event) => {
      const cell = event.target.closest?.("[data-cell]");
      if (!cell || cell.disabled || !ctx.canPlay || ctx.mySide === null) return;
      const index = Number(cell.dataset.cell);
      if (flips(ctx.state.cells, index, ctx.mySide).length) ctx.play(index);
    });
    draw(host, ctx, new Set());
    return {
      update(next) {
        // The discs whose side changed since the last drawing flip over; a new disc does not.
        const flipped = new Set();
        next.state.cells.forEach((side, index) => {
          const before = ctx.state.cells[index];
          if (before !== null && side !== null && before !== side) flipped.add(index);
        });
        ctx = next;
        draw(host, ctx, flipped);
      },
    };
  },
};
