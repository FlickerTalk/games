// The Tic-Tac-Toe board (README, "A game": `board.mount`). Nine buttons on a tray, the marks in
// SVG; it knows nothing of the other phone: it draws what the kit hands it and passes the user's
// touch back as a move, a cell from 0 to 8.

import STYLE from "./board.css";
import { icon } from "../../../kit/src/icons.js";

export { STYLE };

/** The two marks, ✖ for side 0 and ⭕ for side 1; also shown on the players' chips. */
export const MARKS = [
  '<svg class="ftt-x" viewBox="0 0 100 100" aria-hidden="true"><path pathLength="1" d="M22 22 78 78M78 22 22 78"/></svg>',
  '<svg class="ftt-o" viewBox="0 0 100 100" aria-hidden="true"><circle pathLength="1" cx="50" cy="50" r="30"/></svg>',
];

/** Where a cell's centre is on the winning-line layer (0–100 over the cells, 3 % gaps). */
const CELL = (100 - 2 * 3) / 3;
const centre = (index) => CELL / 2 + index * (CELL + 3);

function draw(host, ctx) {
  const { cells } = ctx.state;
  const t = ctx.t;
  const line = ctx.result?.result?.line ?? null;
  const winner = ctx.result?.result?.winner;
  const marks = [t("markX"), t("markO")];
  let html = `<div class="ftt${ctx.canPlay ? " mine" : ""}" role="group" aria-label="${t("board")}">`;
  cells.forEach((side, index) => {
    const name = `${t("cell", { row: Math.floor(index / 3) + 1, col: (index % 3) + 1 })}: ${side === null ? t("empty") : marks[side]}`;
    const classes = ["ftt-cell"];
    if (side === null) classes.push("free");
    if (index === ctx.last && side !== null) classes.push("last");
    if (index === ctx.last && ctx.pending) classes.push("pending");
    if (line?.includes(index)) classes.push("win");
    const open = ctx.canPlay && side === null;
    html += `<button class="${classes.join(" ")}" data-cell="${index}" aria-label="${name}" ${open ? "" : "disabled"}>${side === null ? "" : MARKS[side]}${
      index === ctx.last && ctx.pending ? `<span class="ftt-clock" aria-hidden="true">${icon("time-outline")}</span>` : ""
    }</button>`;
  });
  if (line) {
    const [from, to] = [line[0], line[2]];
    const [x1, y1, x2, y2] = [centre(from % 3), centre(Math.floor(from / 3)), centre(to % 3), centre(Math.floor(to / 3))];
    const [dx, dy] = [x2 - x1, y2 - y1];
    const stretch = 9 / Math.hypot(dx, dy);
    const ends = [x1 - dx * stretch, y1 - dy * stretch, x2 + dx * stretch, y2 + dy * stretch].map((one) => one.toFixed(2));
    html += `<svg class="ftt-win" viewBox="0 0 100 100" aria-hidden="true"><line class="${winner === 0 ? "ftt-x" : "ftt-o"}" pathLength="1" x1="${ends[0]}" y1="${ends[1]}" x2="${ends[2]}" y2="${ends[3]}"/></svg>`;
  }
  host.innerHTML = `${html}</div>`;
}

export const board = {
  mount(host, first) {
    let ctx = first;
    host.addEventListener("click", (event) => {
      const cell = event.target.closest?.("[data-cell]");
      if (!cell || cell.disabled || !ctx.canPlay) return;
      const index = Number(cell.dataset.cell);
      if (ctx.state.cells[index] === null) ctx.play(index);
    });
    draw(host, ctx);
    return {
      update(next) {
        ctx = next;
        draw(host, ctx);
      },
    };
  },
};
