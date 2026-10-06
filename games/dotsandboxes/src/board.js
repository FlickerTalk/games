// The dots and boxes board (README, "A game": `board.mount`). Forty lines, each a button laid over
// the gap between two dots, finger-wide; it knows nothing of the other phone: it draws what the
// kit hands it and passes the user's touch back as a move, a line from 0 to 39. Who drew each line
// shows in its colour; a closed box fills with its owner's colour and mark.

import STYLE from "./board.css";
import { icon } from "../../../kit/src/icons.js";
import { BOXES, DOTS, H, LINES, count } from "./rules.js";

export { STYLE };

/** The two marks, ✖ for side 0 and ⭕ for side 1, in the boxes and on the players' chips. */
export const MARKS = [
  '<svg class="fdb-x" viewBox="0 0 100 100" aria-hidden="true"><path d="M25 25 75 75M75 25 25 75" fill="none" stroke="var(--side-0)" stroke-width="12" stroke-linecap="round"/></svg>',
  '<svg class="fdb-o" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="28" fill="none" stroke="var(--side-1)" stroke-width="12"/></svg>',
];

const step = 100 / BOXES;
const pct = (n) => `${n.toFixed(3)}%`;

/** Where a line sits: its row and column of dots, and whether it lies flat. */
function placeOf(line) {
  if (line < H) return { flat: true, row: Math.floor(line / BOXES), col: line % BOXES };
  const vertical = line - H;
  return { flat: false, row: Math.floor(vertical / DOTS), col: vertical % DOTS };
}

function draw(host, ctx) {
  const { lines, boxes } = ctx.state;
  const t = ctx.t;
  const [first, second] = count(boxes);
  const marks = [t("markX"), t("markO")];
  let html = `<div class="fdb s${ctx.mySide ?? 0}${ctx.canPlay ? " mine" : ""}" role="group" aria-label="${t("board")}: ${t("count", { first, second })}"><div class="fdb-field">`;
  boxes.forEach((owner, box) => {
    const row = Math.floor(box / BOXES);
    const col = box % BOXES;
    html += `<span class="fdb-box${owner === null ? "" : ` b${owner}`}" style="left:${pct(col * step)};top:${pct(row * step)};width:${pct(step)};height:${pct(step)}" data-box="${box}">${owner === null ? "" : MARKS[owner]}</span>`;
  });
  for (let line = 0; line < LINES; line += 1) {
    const { flat, row, col } = placeOf(line);
    const drawn = lines[line];
    const classes = ["fdb-line", flat ? "h" : "v", drawn ? "drawn" : "free"];
    if (drawn && ctx.drawnBy?.[line] !== undefined) classes.push(`d${ctx.drawnBy[line]}`);
    if (line === ctx.last) classes.push("last");
    if (line === ctx.last && ctx.pending) classes.push("pending");
    const name = flat ? t("flatLine", { row: row + 1, col: col + 1 }) : t("uprightLine", { row: row + 1, col: col + 1 });
    const open = ctx.canPlay && !drawn;
    // The tap strip: as long as the gap between two dots, and a finger wide across it.
    const style = flat
      ? `left:${pct(col * step + step / 2)};top:${pct(row * step)};width:${pct(step * 0.78)};height:${pct(step * 0.5)}`
      : `left:${pct(col * step)};top:${pct(row * step + step / 2)};width:${pct(step * 0.5)};height:${pct(step * 0.78)}`;
    html += `<button class="${classes.join(" ")}" data-line="${line}" style="${style}" aria-label="${name}: ${drawn ? (ctx.drawnBy?.[line] === undefined ? t("drawn") : marks[ctx.drawnBy[line]]) : t("free")}" ${open ? "" : "disabled"}>${
      line === ctx.last && ctx.pending ? `<span class="fdb-clock" aria-hidden="true">${icon("time-outline")}</span>` : ""
    }</button>`;
  }
  for (let row = 0; row < DOTS; row += 1) for (let col = 0; col < DOTS; col += 1) html += `<span class="fdb-dot" style="left:${pct(col * step)};top:${pct(row * step)}"></span>`;
  host.innerHTML = `${html}</div></div>`;
}

/** Who drew each line, replayed from the round's moves: the rules keep only whether it is drawn. */
function drawnBy(view) {
  const by = {};
  const moves = view?.round?.moves ?? [];
  let side = 0;
  let boxes = Array(BOXES * BOXES).fill(null);
  let lines = Array(LINES).fill(false);
  for (const move of moves) {
    if (!Number.isInteger(move)) continue;
    by[move] = side;
    lines[move] = true;
    let closed = false;
    for (let box = 0; box < BOXES * BOXES; box += 1) {
      if (boxes[box] !== null) continue;
      const row = Math.floor(box / BOXES);
      const col = box % BOXES;
      const sides = [row * BOXES + col, (row + 1) * BOXES + col, H + row * DOTS + col, H + row * DOTS + col + 1];
      if (sides.includes(move) && sides.every((line) => lines[line])) {
        boxes[box] = side;
        closed = true;
      }
    }
    if (!closed) side = 1 - side;
  }
  return by;
}

export const board = {
  mount(host, first) {
    let ctx = { ...first, drawnBy: drawnBy(first.view) };
    host.addEventListener("click", (event) => {
      const button = event.target.closest?.("[data-line]");
      if (!button || button.disabled || !ctx.canPlay) return;
      const line = Number(button.dataset.line);
      if (!ctx.state.lines[line]) ctx.play(line);
    });
    draw(host, ctx);
    return {
      update(next) {
        ctx = { ...next, drawnBy: drawnBy(next.view) };
        draw(host, ctx);
      },
    };
  },
};
