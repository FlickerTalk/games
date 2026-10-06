// The board of Letter Grid (README, "A game": `board.mount`). Sixteen tiles; a word is built by
// tapping letters that touch, each tile lit with its place in the word, then said with a button
// (or taken back a letter at a time); a pass when nothing is found. Under the grid the words
// each side said and the scores. The grid at the start of a round is drawn on its own (the first
// side's seed kept in the plugin's store until revealed). The board never talks to the other phone.

import STYLE from "./board.css";
import { icon } from "../../../kit/src/icons.js";
import { fromBase64url, toBase64url } from "./sha256.js";
import { SEED_BYTES, SIZE, commitText, langFor, points, refusal, revealText, seedText } from "./rules.js";

export { STYLE };

/** The two sides' marks: a tile in each side's colour, shown on the players' chips. */
export const MARKS = [
  '<svg class="fwg-mark s0" viewBox="0 0 100 100" aria-hidden="true"><rect x="10" y="10" width="80" height="80" rx="14"/></svg>',
  '<svg class="fwg-mark s1" viewBox="0 0 100 100" aria-hidden="true"><rect x="10" y="10" width="80" height="80" rx="14"/></svg>',
];

/** Where the first side's seed is kept: by participant and round. */
export const storeKey = (me, round) => `wordgrid/${me}/${round}`;

const escape = (text) => String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const touching = (a, b) => Math.abs(Math.floor(a / SIZE) - Math.floor(b / SIZE)) <= 1 && Math.abs((a % SIZE) - (b % SIZE)) <= 1;

function draw(host, ctx, local) {
  const { state } = ctx;
  const t = ctx.t;
  const me = ctx.mySide ?? 0;
  const they = 1 - me;
  const open = ctx.canPlay && state.phase === "play";
  const grid = state.grid ?? Array(16).fill("");
  const path = local.path;
  const word = path.map((cell) => grid[cell]).join("");
  const last = path.at(-1);
  const why = word.length ? refusal(state, word) : null;
  const canSay = open && word.length >= 3 && !why;
  const tiles = grid
    .map((letter, cell) => {
      const at = path.indexOf(cell);
      const lit = at >= 0;
      const next = open && !lit && (last === undefined || touching(last, cell));
      const name = t("tile", { letter: letter.toUpperCase(), row: Math.floor(cell / SIZE) + 1, col: (cell % SIZE) + 1 });
      return `<button class="fwg-tile${lit ? " lit" : ""}" data-cell="${cell}" aria-label="${escape(name)}" ${next || lit ? "" : "disabled"}>${letter.toUpperCase()}${lit ? `<i aria-hidden="true">${at + 1}</i>` : ""}</button>`;
    })
    .join("");
  const list = (side) => state.said[side].map((one) => `${one} <small>${points(one)}</small>`).join(", ");
  const note = local.lost ? t("seedLost") : why && word.length >= 3 ? t({ unknown: "notAWord", used: "alreadySaid", grid: "notOnGrid" }[why] ?? "notAWord") : "";
  host.innerHTML = `<div class="fwg s${me}${open ? " mine" : ""}${state.phase === "done" ? " done" : ""}" role="group" aria-label="${escape(t("name"))}">
    <div class="fwg-scores"><span>${MARKS[me]} <b>${state.score[me]}</b> ${escape(t("yourWords", { n: state.said[me].length }))}</span><span>${escape(t("theirWords", { n: state.said[they].length }))} <b>${state.score[they]}</b> ${MARKS[they]}</span></div>
    <div class="fwg-grid" role="grid" aria-label="${escape(t("grid"))}">${state.phase === "shuffle" ? `<p class="fwg-note">${escape(t("shuffling"))}</p>` : tiles}</div>
    <div class="fwg-word">
      <button data-act="undo" aria-label="${escape(t("undo"))}" ${open && path.length ? "" : "disabled"}>${icon("chevron-back-outline")}</button>
      <b aria-live="polite">${escape(word)}</b>
      <button data-act="say" ${canSay ? "" : "disabled"}>${icon("send-outline")}<span>${escape(t("sayWord"))}</span></button>
      <button data-act="pass" aria-label="${escape(t("pass"))}" ${open ? "" : "disabled"}>${icon("play-outline")}</button>
    </div>
    <div class="fwg-lists"><p>${list(me)}</p><p>${list(they)}</p>${note ? `<span class="fwg-note">${escape(note)}</span>` : ""}</div>
    <i class="fwg-nop"></i>
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
    const local = { path: [], seed: null, lost: false, loaded: false, auto: null };
    const ft = coreOf(host);
    const key = () => storeKey(ctx.view?.me ?? "", ctx.view?.index ?? 0);

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

    /** The three moves of the draw go out on their own when it is this side's turn. */
    const settle = async () => {
      if (!local.loaded || !ctx.canPlay || ctx.mySide === null || ctx.state.phase !== "shuffle") return;
      const { state } = ctx;
      const stamp = `${ctx.view?.index}:${state.commit}:${state.seedB}`;
      if (local.auto === stamp) return;
      local.auto = stamp;
      if (ctx.mySide === 0 && state.commit === null) {
        local.seed = crypto.getRandomValues(new Uint8Array(SEED_BYTES));
        if (!(await remember(local.seed))) return;
        ctx.play(commitText(langFor(ctx.lang), local.seed));
      } else if (ctx.mySide === 1 && state.commit !== null && state.seedB === null) {
        ctx.play(seedText(crypto.getRandomValues(new Uint8Array(SEED_BYTES))));
      } else if (ctx.mySide === 0 && state.seedB !== null) {
        if (!local.seed) {
          local.lost = true;
          draw(host, ctx, local);
          return;
        }
        ctx.play(revealText(local.seed));
      }
    };

    host.addEventListener("click", (event) => {
      if (!ctx.canPlay || ctx.mySide === null || ctx.state.phase !== "play") return;
      const button = event.target.closest?.("button");
      if (!button || button.disabled) return;
      const { act, cell } = button.dataset;
      if (act === "pass") {
        local.path = [];
        ctx.play("x");
      } else if (act === "undo") {
        local.path.pop();
        draw(host, ctx, local);
      } else if (act === "say") {
        const word = local.path.map((at) => ctx.state.grid[at]).join("");
        local.path = [];
        if (!refusal(ctx.state, word)) ctx.play(`w${word}`);
        else draw(host, ctx, local);
      } else if (cell !== undefined) {
        const index = Number(cell);
        const at = local.path.indexOf(index);
        if (at >= 0) local.path = local.path.slice(0, at);
        else local.path = [...local.path, index];
        draw(host, ctx, local);
      }
    });

    draw(host, ctx, local);
    recall();
    return {
      update(next) {
        if (next.view?.round?.moves?.length !== ctx.view?.round?.moves?.length || !next.canPlay) local.path = [];
        if (next.view?.index !== ctx.view?.index) {
          local.seed = null;
          local.lost = false;
          local.auto = null;
        }
        ctx = next;
        draw(host, ctx, local);
        settle();
      },
    };
  },
};
