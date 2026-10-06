// The board of Backgammon (README, "A game": `board.mount`). The points in two rows with the bar
// between, the checkers stacked, the trays at the side; under the board the dice, the pips and
// the pass. A checker moves in two taps: one on its point (or the bar), which shows where it may
// go, one on the destination; or it is dragged there with the finger (the kit's `makeDraggable`),
// onto a point or, bearing off, onto the tray. The dice are rolled on their own before each turn, the roller's
// secret seed kept in the plugin's store until it is revealed; a side with no move passes on its
// own. The board never talks to the other phone.

import BOARD_STYLE from "./board.css";
import { DRAG_STYLE, makeDraggable } from "../../../kit/src/drag.js";
import { icon } from "../../../kit/src/icons.js";
import { fromBase64url, toBase64url } from "./sha256.js";
import { CHECKERS, POINTS, SEED_BYTES, commitText, legalMoves, moveText, pips, revealText, seedText } from "./rules.js";

export const STYLE = `${BOARD_STYLE}\n${DRAG_STYLE}`;

/** The two sides' marks: a checker in each side's colour, shown on the players' chips. */
export const MARKS = [
  '<svg class="fbg-mark s0" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="42"/></svg>',
  '<svg class="fbg-mark s1" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="42"/></svg>',
];

/** Where the roller's seed is kept: by participant and roll. */
export const storeKey = (me, roll) => `backgammon/${me}/${roll}`;

const escape = (text) => String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** The points of each quarter as drawn, left to right: top row 12–23, bottom row 11–0. */
const QUARTERS = [
  { row: "top", points: [12, 13, 14, 15, 16, 17] },
  { row: "top", points: [18, 19, 20, 21, 22, 23] },
  { row: "bottom", points: [11, 10, 9, 8, 7, 6] },
  { row: "bottom", points: [5, 4, 3, 2, 1, 0] },
];

/** Where a point's column lies in the table, as percentages, for a destination target over it:
 *  the table is two quarters of six points with the bar (7 %) between and the trays (8 %) at the
 *  end, so a point's column is a thirteenth of the rest; the target is the whole column, top or
 *  bottom half, so two targets never overlap. */
function column(point) {
  const top = point >= 12;
  const index = top ? point - 12 : 11 - point;
  const quarterWidth = (100 - 7 - 8) / 2;
  const width = quarterWidth / 6;
  const left = index * width + (index >= 6 ? 7 : 0);
  return { left: `${left}%`, width: `${width}%`, top: top ? "0" : "50%" };
}

function checkersHtml(point, side) {
  const count = point[side];
  if (!count) return "";
  let html = "";
  for (let at = 0; at < Math.min(count, 5); at += 1) {
    html += `<span class="fbg-checker s${side}">${at === Math.min(count, 5) - 1 && count > 5 ? count : ""}</span>`;
  }
  return html;
}

/** Says a note once, as a passing notice at the top (the kit's toast), never in the board, where it would move the rest. */
function tell(ctx, local, text) {
  if (text && text !== local.told) ctx.notify?.(text);
  local.told = text;
}

function draw(host, ctx, local) {
  const { state } = ctx;
  const t = ctx.t;
  tell(ctx, local, local.lost ? t("seedLost") : "");
  const me = ctx.mySide ?? 0;
  const they = 1 - me;
  const open = ctx.canPlay && ctx.mySide !== null && state.dice !== null;
  const legal = open ? legalMoves(state) : [];
  const sources = new Set(legal.map((move) => move.from));
  const from = local.from !== null && sources.has(local.from) ? local.from : null;
  const targets = from === null ? [] : legal.filter((move) => move.from === from).map((move) => move.to);
  const pointName = (at) => t("point", { n: at + 1 });

  let quarters = "";
  QUARTERS.forEach(({ row, points }, index) => {
    quarters += `<div class="fbg-quarter ${row}" style="grid-column:${index % 2 === 0 ? 1 : 3};grid-row:${row === "top" ? 1 : 2}">`;
    for (const at of points) {
      const point = state.points[at];
      const side = point[0] ? 0 : point[1] ? 1 : null;
      const label = side === null ? `${pointName(at)}: ${t("emptyPoint")}` : `${pointName(at)}: ${t("checkers", { n: point[side] })} ${side === me ? t("yours") : t("theirs")}`;
      const classes = ["fbg-point", at % 2 === 0 ? "even" : "odd"];
      if (sources.has(at)) classes.push("from");
      if (from === at) classes.push("selected");
      quarters += `<button class="${classes.join(" ")}" data-point="${at}" ${sources.has(at) ? `data-from="${at}" data-drag` : ""} aria-label="${escape(label)}" ${sources.has(at) ? "" : "disabled"}>${checkersHtml(point, side ?? 0)}</button>`;
    }
    quarters += "</div>";
  });

  const dests = targets
    .map((to) => {
      if (to === "o") return "";
      const { left, width, top } = column(to);
      return `<button class="fbg-dest" data-to="${to}" style="left:${left};width:${width};top:${top}" aria-label="${escape(t("moveTo", { n: to + 1 }))}"></button>`;
    })
    .join("");
  const barFrom = sources.has("b");
  const barChecker = (side, count) => `<span class="fbg-checker s${side}"></span>`.repeat(Math.min(count, 3));
  const bar = `<div class="fbg-bar">
    <button data-point="b" ${barFrom ? 'data-from="b" data-drag' : ""} class="${barFrom ? "from" : ""}${from === "b" ? " selected" : ""}" aria-label="${escape(t("bar", { n: state.bar[me] }))}" ${barFrom ? "" : "disabled"}>${barChecker(me, state.bar[me])}</button>
    <button data-point="b2" aria-label="${escape(t("bar", { n: state.bar[they] }))}" disabled>${barChecker(they, state.bar[they])}</button>
  </div>`;
  const tray = (side) => {
    const to = side === me && targets.includes("o");
    return `<button class="fbg-tray${to ? " to" : ""}" data-tray="${side}" ${to ? 'data-to="o"' : ""} aria-label="${escape(t("off", { n: state.off[side] }))}" ${to ? "" : "disabled"}><i class="s${side}"></i>${state.off[side]}</button>`;
  };
  const trays = `<div class="fbg-off">${tray(they)}${tray(me)}</div>`;

  const rolling = state.dice === null && !state.end;
  const dice = state.dice
    ? `<div class="fbg-dice" role="img" aria-label="${escape(t("dice", { a: state.dice[0], b: state.dice[1] }))}">${state.dice
        .map((die, at) => `<span class="fbg-die${state.left.filter((one) => one === die).length <= (state.dice[0] === state.dice[1] ? at : 0) && !state.left.includes(die) ? " used" : ""}">${die}</span>`)
        .join("")}${state.dice[0] === state.dice[1] ? `<span class="fbg-note">×${state.left.length}</span>` : ""}</div>`
    : `<span class="fbg-note">${escape(rolling ? t("rolling") : "")}</span>`;
  host.innerHTML = `<div class="fbg s${me}" role="group" aria-label="${escape(t("name"))}">
    <div class="fbg-table">
      <div class="fbg-dests">${dests}</div>
      ${quarters}
      ${bar}
      ${trays}
    </div>
    <div class="fbg-under">
      ${dice}
      <span class="fbg-pips">${MARKS[me]} ${pips(state, me)} · ${MARKS[they]} ${pips(state, they)}</span>
      <button data-act="pass" aria-label="${escape(t("pass"))}" ${open && !legal.length ? "" : "disabled"} ${open && !legal.length ? "" : "hidden"}>${icon("play-outline")}</button>
    </div>
    <i class="fbg-nop"></i>
  </div>`;
}

/** The plugin's `ft`: on the game's own element, or global. */
function coreOf(host) {
  let node = host;
  while (node && !(node.tagName && node.tagName.includes("-"))) node = node.parentNode;
  return node?.ft ?? globalThis.ft;
}

export const board = {
  mount(host, first) {
    let ctx = first;
    const local = { from: null, seed: null, lost: false, loaded: false, auto: null };
    const ft = coreOf(host);
    const key = () => storeKey(ctx.view?.me ?? "", `${ctx.view?.index ?? 0}/${ctx.state.rolls}`);

    const remember = async (seed) => {
      if (!ft?.store) return true;
      try {
        return (await ft.store.set(key(), toBase64url(seed))) !== false;
      } catch {
        return false;
      }
    };
    const recall = async () => {
      try {
        const kept = await ft?.store?.get?.(key());
        const seed = kept ? fromBase64url(kept) : null;
        if (seed && seed.length === SEED_BYTES) local.seed = seed;
      } catch {
        // Nothing kept.
      }
      local.loaded = true;
      settle();
    };

    /** What goes out on its own: the three steps of a roll, and a pass with no move. */
    const settle = async () => {
      if (!local.loaded || !ctx.canPlay || ctx.mySide === null || ctx.state.end) return;
      const { state } = ctx;
      const me = ctx.mySide;
      const stamp = `${ctx.view?.index}:${state.rolls}:${state.roll.commit}:${state.roll.seed}:${state.dice}:${state.left.length}`;
      if (local.auto === stamp) return;
      if (state.dice === null) {
        local.auto = stamp;
        if (state.next === me && state.roll.commit === null) {
          local.seed = crypto.getRandomValues(new Uint8Array(SEED_BYTES));
          if (!(await remember(local.seed))) return;
          ctx.play(commitText(local.seed));
        } else if (state.next !== me && state.roll.commit !== null && state.roll.seed === null) {
          ctx.play(seedText(crypto.getRandomValues(new Uint8Array(SEED_BYTES))));
        } else if (state.next === me && state.roll.seed !== null) {
          if (!local.seed) {
            local.lost = true;
            draw(host, ctx, local);
            return;
          }
          ctx.play(revealText(local.seed));
        }
      } else if (!legalMoves(state).length) {
        local.auto = stamp;
        ctx.play("x");
      }
    };

    const open = () => ctx.canPlay && ctx.mySide !== null && ctx.state.dice !== null;
    const sourceOf = (el) => (el.dataset.from === "b" ? "b" : Number(el.dataset.from));
    /** Where a checker dropped on `target` goes: the point under it, its finger-sized target, or off into the tray. */
    const destOf = (target) => {
      const to = target.dataset.to ?? target.dataset.point ?? (target.dataset.tray !== undefined ? "o" : undefined);
      return to === "o" ? "o" : Number(to);
    };
    const drag = makeDraggable(host, {
      canDrag: () => open(),
      ghost: (el) => [...el.querySelectorAll(".fbg-checker")].at(-1) ?? el,
      targets: (el) => {
        if (!open()) return [];
        const source = sourceOf(el);
        return legalMoves(ctx.state)
          .filter((move) => move.from === source)
          .flatMap((move) =>
            move.to === "o" ? [host.querySelector(`[data-tray="${ctx.mySide}"]`)] : [...host.querySelectorAll(`[data-point="${move.to}"], [data-to="${move.to}"]`)],
          );
      },
      onDrop: (el, target) => {
        const move = { from: sourceOf(el), to: destOf(target) };
        local.from = null;
        if (legalMoves(ctx.state).some((one) => one.from === move.from && one.to === move.to)) ctx.play(moveText(move));
        else draw(host, ctx, local);
      },
    });

    host.addEventListener("click", (event) => {
      if (!open()) return;
      const button = event.target.closest?.("button");
      if (!button || button.disabled) return;
      const { from, to, act } = button.dataset;
      if (act === "pass") {
        ctx.play("x");
      } else if (to !== undefined && local.from !== null) {
        const target = to === "o" ? "o" : Number(to);
        const source = local.from;
        local.from = null;
        if (legalMoves(ctx.state).some((move) => move.from === source && move.to === target)) ctx.play(moveText({ from: source, to: target }));
        else draw(host, ctx, local);
      } else if (from !== undefined) {
        const source = from === "b" ? "b" : Number(from);
        local.from = local.from === source ? null : source;
        draw(host, ctx, local);
      }
    });

    draw(host, ctx, local);
    recall();
    return {
      update(next) {
        if (next.view?.round?.moves?.length !== ctx.view?.round?.moves?.length || !next.canPlay) {
          local.from = null;
          drag.cancel();
        }
        if (next.state.rolls !== ctx.state.rolls || next.view?.index !== ctx.view?.index) {
          local.seed = null;
          local.lost = false;
        }
        ctx = next;
        draw(host, ctx, local);
        settle();
      },
      destroy() {
        drag.destroy();
      },
    };
  },
};
