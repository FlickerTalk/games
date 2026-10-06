// The mancala board (README, "A game": `board.mount`). Twelve pits and two stores; it knows nothing
// of the other phone: it draws what the kit hands it and passes the user's touch back as a move,
// one of their six pits, 0 to 5 from their left. One's own pits are along the bottom whichever side
// one plays, the other's along the top from their left, so the seeds go round the way they fall.

import STYLE from "./board.css";
import { icon } from "../../../kit/src/icons.js";
import { PITS, STORE, initial, pitOf, play, turn } from "./rules.js";

export { STYLE };

/** A seed of each side's colour, for the players' chips. */
export const SEED_MARKS = [
  '<svg class="fmc-mark" viewBox="0 0 100 100" aria-hidden="true"><ellipse cx="50" cy="50" rx="30" ry="40" fill="var(--side-0)"/></svg>',
  '<svg class="fmc-mark" viewBox="0 0 100 100" aria-hidden="true"><ellipse cx="50" cy="50" rx="30" ry="40" fill="var(--side-1)"/></svg>',
];

const dots = (seeds) => `<span class="fmc-seeds" aria-hidden="true">${"<i></i>".repeat(Math.min(seeds, 9))}</span>`;

function draw(host, ctx) {
  const { pits } = ctx.state;
  const t = ctx.t;
  const number = new Intl.NumberFormat(ctx.lang);
  const me = ctx.mySide ?? 0;
  const them = 1 - me;
  const lastPit = Number.isInteger(ctx.last) ? pitOf(ctx.lastBy ?? them, ctx.last) : -1;
  let html = `<div class="fmc s${me}${ctx.canPlay ? " mine" : ""}" role="group" aria-label="${t("board")}: ${t("count", { first: pits[STORE[0]], second: pits[STORE[1]] })}">`;
  // Their store on the left, mine on the right: seeds go round counter-clockwise, towards one's own store.
  html += `<span class="fmc-store left${lastPit === STORE[them] ? " last" : ""}" data-store="${them}" aria-label="${t("theirStore")}: ${t("seeds", { n: number.format(pits[STORE[them]]) })}">${number.format(pits[STORE[them]])}</span>`;
  html += `<span class="fmc-store right${lastPit === STORE[me] ? " last" : ""}" data-store="${me}" aria-label="${t("yourStore")}: ${t("seeds", { n: number.format(pits[STORE[me]]) })}">${number.format(pits[STORE[me]])}</span>`;
  // Their pits along the top, from their left (which is my right), so the row reads right to left.
  for (let n = PITS - 1; n >= 0; n -= 1) {
    const pit = pitOf(them, n);
    html += `<span class="fmc-pit theirs${lastPit === pit ? " last" : ""}" style="grid-row:1;grid-column:${PITS - n + 1}" data-pit="${pit}" aria-label="${t("theirPit", { n: number.format(n + 1) })}: ${t("seeds", { n: number.format(pits[pit]) })}">${dots(pits[pit])}${number.format(pits[pit])}</span>`;
  }
  for (let n = 0; n < PITS; n += 1) {
    const pit = pitOf(me, n);
    const open = ctx.canPlay && pits[pit] > 0;
    const classes = ["fmc-pit"];
    if (open) classes.push("can");
    if (lastPit === pit) classes.push("last");
    if (ctx.pending && Number.isInteger(ctx.last) && pitOf(me, ctx.last) === pit) classes.push("pending");
    html += `<button class="${classes.join(" ")}" style="grid-row:2;grid-column:${n + 2}" data-pit="${pit}" data-move="${n}" aria-label="${t("yourPit", { n: number.format(n + 1) })}: ${t("seeds", { n: number.format(pits[pit]) })}" ${open ? "" : "disabled"}>${dots(pits[pit])}${number.format(pits[pit])}${
      classes.includes("pending") ? `<span class="fmc-clock" aria-hidden="true">${icon("time-outline")}</span>` : ""
    }</button>`;
  }
  host.innerHTML = `${html}</div>`;
}

/** Whose pit the last move emptied: the rules say only its number from that side's left. */
function lastBy(view) {
  const moves = view?.round?.moves ?? [];
  let state = initial();
  let by = null;
  for (const move of moves) {
    if (!Number.isInteger(move)) continue;
    by = turn(state);
    const played = play(state, move, by);
    if (played.error) break;
    state = played.state;
  }
  return by;
}

export const board = {
  mount(host, first) {
    let ctx = { ...first, lastBy: lastBy(first.view) };
    host.addEventListener("click", (event) => {
      const pit = event.target.closest?.("[data-move]");
      if (!pit || pit.disabled || !ctx.canPlay) return;
      ctx.play(Number(pit.dataset.move));
    });
    draw(host, ctx);
    return {
      update(next) {
        ctx = { ...next, lastBy: lastBy(next.view) };
        draw(host, ctx);
      },
    };
  },
};
