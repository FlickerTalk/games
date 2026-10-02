// The Four in a Row board (README, "A game": `board.mount`). Seven columns, each one button from
// the top of the board to the bottom, the discs in SVG; it knows nothing of the other phone: it
// draws what the kit hands it and passes the user's touch back as a move, a column from 0 to 6.
// It is built once and then patched, so a disc dropping in keeps falling while the kit redraws.

import STYLE from "./board.css";
import { icon } from "../../../kit/src/icons.js";
import { COLUMNS, ROWS, landing } from "./rules.js";

export { STYLE };

/** The two discs, each in its side's colour with a mark (✖ for side 0, ⭕ for side 1); also on the players' chips. */
export const DISCS = [
  '<svg class="ffr-d ffr-s0" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="40"/><path d="M38 38 62 62M62 38 38 62"/></svg>',
  '<svg class="ffr-d ffr-s1" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="40"/><circle cx="50" cy="50" r="13"/></svg>',
];

const count = (cells) => cells.filter((cell) => cell !== null).length;

/** The top disc of a column, or -1. */
function top(cells, column) {
  for (let row = 0; row < ROWS; row += 1) if (cells[row * COLUMNS + column] !== null) return row * COLUMNS + column;
  return -1;
}

function draw(host, ctx, dropped) {
  const { cells } = ctx.state;
  const t = ctx.t;
  const line = ctx.result?.result?.line ?? [];
  const last = Number.isInteger(ctx.last) ? top(cells, ctx.last) : -1;
  const marks = [t("markX"), t("markO")];
  const number = new Intl.NumberFormat(ctx.lang);
  const list = new Intl.ListFormat(ctx.lang, { type: "unit", style: "short" });
  const tray = host.firstChild;
  tray.setAttribute("aria-label", t("board"));
  tray.className = `ffr s${ctx.mySide ?? 0}${ctx.canPlay ? " mine" : ""}${line.length ? " won" : ""}`;
  host.querySelectorAll("[data-col]").forEach((button, column) => {
    const next = landing(cells, column);
    const discs = [];
    for (let row = ROWS - 1; row >= 0; row -= 1) if (cells[row * COLUMNS + column] !== null) discs.push(marks[cells[row * COLUMNS + column]]);
    button.setAttribute("aria-label", `${t("column", { n: number.format(column + 1) })}: ${discs.length ? list.format(discs) : t("empty")}`);
    button.disabled = !ctx.canPlay || next < 0;
    button.querySelectorAll("[data-cell]").forEach((slot) => {
      const cell = Number(slot.dataset.cell);
      const side = cells[cell];
      const classes = ["ffr-slot"];
      if (cell === next) classes.push("next");
      if (cell === last) classes.push("last", ...(ctx.pending ? ["pending"] : []));
      if (line.includes(cell)) classes.push("win");
      if (cell === dropped && side !== null) classes.push("drop");
      slot.className = classes.join(" ");
      if (cell === dropped) slot.style.setProperty("--f", String(Math.floor(cell / COLUMNS) + 1));
      const html = `${side === null ? "" : DISCS[side]}${cell === last && ctx.pending ? `<span class="ffr-clock" aria-hidden="true">${icon("time-outline")}</span>` : ""}`;
      if (slot.drawn !== html) {
        slot.innerHTML = html;
        slot.drawn = html;
      }
    });
  });
}

export const board = {
  mount(host, first) {
    let ctx = first;
    let discs = count(first.state.cells);
    let dropped = -1;
    let html = '<div role="group">';
    for (let column = 0; column < COLUMNS; column += 1) {
      html += `<button class="ffr-col" data-col="${column}"><span class="ffr-top"></span>`;
      for (let row = 0; row < ROWS; row += 1) html += `<span data-cell="${row * COLUMNS + column}"></span>`;
      html += "</button>";
    }
    host.innerHTML = `${html}</div>`;
    host.addEventListener("click", (event) => {
      const button = event.target.closest?.("[data-col]");
      if (!button || button.disabled || !ctx.canPlay) return;
      const column = Number(button.dataset.col);
      if (landing(ctx.state.cells, column) >= 0) ctx.play(column);
    });
    draw(host, ctx, dropped);
    return {
      update(next) {
        const now = count(next.state.cells);
        // One disc more is one that has just arrived: it drops in. Anything else is drawn still.
        if (now === discs + 1 && Number.isInteger(next.last)) dropped = top(next.state.cells, next.last);
        else if (now !== discs) dropped = -1;
        discs = now;
        ctx = next;
        draw(host, ctx, dropped);
      },
    };
  },
};
