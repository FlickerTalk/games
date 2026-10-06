// The board of Five in a Row (README, "A game": `board.mount`). Fifteen lines each way on a wooden
// board, 225 intersections, the stones in SVG. The intersections are small on a phone, so a stone
// is placed in two taps: the first shows it as a ghost where the finger landed (and can be moved by
// tapping elsewhere), the second, on the ghost's finger-sized target, places it. The board knows
// nothing of the other phone: it draws what the kit hands it and passes the move back.

import STYLE from "./board.css";
import { icon } from "../../../kit/src/icons.js";
import { SIZE } from "./rules.js";

export { STYLE };

/** The two stones, black for side 0 and white for side 1; also shown on the players' chips. */
export const STONES = [
  '<svg class="fgm-stone fgm-s0" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="44"/></svg>',
  '<svg class="fgm-stone fgm-s1" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="44"/></svg>',
];

/** The star points of a 15 × 15 board. */
const STARS = new Set([3 * SIZE + 3, 3 * SIZE + 11, 7 * SIZE + 7, 11 * SIZE + 3, 11 * SIZE + 11]);

function draw(host, ctx, ghost) {
  const { cells } = ctx.state;
  const t = ctx.t;
  const names = [t("black"), t("white")];
  const won = new Set(ctx.result?.result?.line ?? []);
  const open = ctx.canPlay && ctx.mySide !== null;
  let html = `<div class="fgm s${ctx.mySide ?? 0}" role="group" aria-label="${t("board")}"><div class="fgm-grid">`;
  cells.forEach((side, index) => {
    const row = Math.floor(index / SIZE);
    const col = index % SIZE;
    const name = `${t("cell", { row: row + 1, col: col + 1 })}: ${side === null ? t("empty") : names[side]}`;
    const classes = ["fgm-cell"];
    if (row === 0) classes.push("top");
    if (row === SIZE - 1) classes.push("bottom");
    if (col === 0) classes.push("left");
    if (col === SIZE - 1) classes.push("right");
    if (STARS.has(index) && side === null) classes.push("star");
    if (index === ctx.last && side !== null) classes.push("last");
    if (index === ctx.last && ctx.pending) classes.push("pending");
    if (won.has(index)) classes.push("won");
    html += `<button class="${classes.join(" ")}" data-cell="${index}" aria-label="${name}" ${open && side === null ? "" : "disabled"}>${
      STARS.has(index) && side === null ? "<i></i>" : ""
    }${side === null ? "" : STONES[side]}${index === ctx.last && ctx.pending ? `<span class="fgm-clock" aria-hidden="true">${icon("time-outline")}</span>` : ""}</button>`;
  });
  html += "</div>";
  if (ghost !== null && open && cells[ghost] === null) {
    const row = Math.floor(ghost / SIZE);
    const col = ghost % SIZE;
    const at = (n) => `${((n + 0.5) / SIZE) * 100}%`;
    html += `<button class="fgm-ghost" data-ghost="${ghost}" style="left:${at(col)};top:${at(row)}" aria-label="${t("place", {
      row: row + 1,
      col: col + 1,
    })}">${STONES[ctx.mySide]}</button>`;
  }
  host.innerHTML = `${html}</div>`;
  const board = host.querySelector(".fgm");
  if (board) {
    // The ghost stone is as big as a cell: the board's width over fifteen.
    const width = board.clientWidth || 320;
    host.querySelector(".fgm-ghost")?.style.setProperty("--fgm-stone", `${(width / SIZE) * 0.88}px`);
  }
}

export const board = {
  mount(host, first) {
    let ctx = first;
    let ghost = null;
    host.addEventListener("click", (event) => {
      if (!ctx.canPlay || ctx.mySide === null) return;
      const confirm = event.target.closest?.("[data-ghost]");
      if (confirm) {
        const index = Number(confirm.dataset.ghost);
        ghost = null;
        if (ctx.state.cells[index] === null) ctx.play(index);
        return;
      }
      const cell = event.target.closest?.("[data-cell]");
      if (!cell || cell.disabled) return;
      const index = Number(cell.dataset.cell);
      if (ghost === index) {
        ghost = null;
        ctx.play(index);
        return;
      }
      ghost = index;
      draw(host, ctx, ghost);
    });
    draw(host, ctx, ghost);
    return {
      update(next) {
        if (next.state.count !== ctx.state.count || !next.canPlay) ghost = null;
        ctx = next;
        draw(host, ctx, ghost);
      },
    };
  },
};
