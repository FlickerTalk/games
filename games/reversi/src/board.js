import STYLE from "./board.css";
import { icon } from "../../../kit/src/icons.js";
import { SIZE, count, flips, moves } from "./rules.js";

export { STYLE };

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
