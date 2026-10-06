// The table of Crazy Eights (README, "A game": `board.mount`). The other side's cards face down,
// the stock and the card on the table, the user's hand face up with the playable cards raised;
// a tap plays a card (an eight asks for a suit first), a tap on the stock draws, and a button
// passes when the stock is gone. The shuffle at the start of a round happens on its own: the
// dealer's secret seed is kept in the plugin's store, under this participant and round, until it
// is revealed. The board never talks to the other phone: it draws what the kit hands it and passes
// the moves back.

import STYLE from "./board.css";
import { icon } from "../../../kit/src/icons.js";
import { fromBase64url, toBase64url } from "./sha256.js";
import { SEED_BYTES, SUITS, commitText, isEight, playable, rankOf, revealText, seedText, suitOf } from "./rules.js";

export { STYLE };

/** The suits' signs, drawn in SVG (the interface draws no emoji), in the order of `SUITS`. */
export const SIGNS = [
  '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M50 8 86 48a20 20 0 0 1-30 24l6 20H38l6-20A20 20 0 0 1 14 48Z"/></svg>',
  '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M50 90 14 52A21 21 0 0 1 50 26a21 21 0 0 1 36 26Z"/></svg>',
  '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M50 6 88 50 50 94 12 50Z"/></svg>',
  '<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="30" r="18"/><circle cx="29" cy="58" r="18"/><circle cx="71" cy="58" r="18"/><path d="M44 58h12l6 34H38z"/></svg>',
];
const RED = new Set([1, 2]);

/** The two sides' marks: a card in each side's colour, shown on the players' chips. */
export const MARKS = [
  '<svg class="fce-mark s0" viewBox="0 0 100 100" aria-hidden="true"><rect x="22" y="10" width="56" height="80" rx="8" fill="var(--side-0)"/><text x="50" y="62" text-anchor="middle" font-size="36" font-weight="700" fill="var(--paper)">8</text></svg>',
  '<svg class="fce-mark s1" viewBox="0 0 100 100" aria-hidden="true"><rect x="22" y="10" width="56" height="80" rx="8" fill="var(--side-1)"/><text x="50" y="62" text-anchor="middle" font-size="36" font-weight="700" fill="var(--paper)">8</text></svg>',
];

/** Where the dealer's seed is kept: by participant and round, a fresh one each round. */
export const storeKey = (me, round) => `eights/${me}/${round}`;

const escape = (text) => String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** What a card is called: its rank and suit in the user's language. */
export function cardName(card, t) {
  const rank = rankOf(card);
  const ranks = { 0: t("ace"), 10: t("jack"), 11: t("queen"), 12: t("king") };
  const suits = [t("spades"), t("hearts"), t("diamonds"), t("clubs")];
  return t("cardOf", { rank: ranks[rank] ?? String(rank + 1), suit: suits[suitOf(card)] });
}

/** The rank as the card shows it. */
const face = (card) => ({ 0: "A", 10: "J", 11: "Q", 12: "K" })[rankOf(card)] ?? String(rankOf(card) + 1);

function cardHtml(card, t, { top = false, open = false } = {}) {
  const classes = ["fce-card"];
  if (RED.has(suitOf(card))) classes.push("red");
  if (top) classes.push("top");
  const name = cardName(card, t);
  if (top) return `<div class="${classes.join(" ")}" role="img" aria-label="${escape(t("onTable", { card: name }))}"><b>${face(card)}</b><i>${SIGNS[suitOf(card)]}</i></div>`;
  return `<button class="${classes.join(" ")}" data-card="${card}" aria-label="${escape(t("playCard", { card: name }))}" ${open ? "" : "disabled"}><b>${face(card)}</b><i>${SIGNS[suitOf(card)]}</i></button>`;
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
  const open = ctx.canPlay && state.phase === "play";
  const suits = [t("spades"), t("hearts"), t("diamonds"), t("clubs")];
  const theirCount = state.hands[they].length;
  const hand = [...state.hands[me]].sort((a, b) => suitOf(a) - suitOf(b) || rankOf(a) - rankOf(b));
  const top = state.pile.at(-1);
  const picking = local.eight !== null && open && state.hands[me].includes(local.eight);
  const pick = picking
    ? `<div class="fce-pick" role="group" aria-label="${escape(t("pickSuit"))}">${SUITS.map(
        (suit, at) => `<button data-suit="${suit}" class="${RED.has(at) ? "red" : ""}" aria-label="${escape(suits[at])}">${SIGNS[at]}</button>`,
      ).join("")}</div>`
    : "";
  const cards = hand.map((card) => cardHtml(card, t, { open: open && playable(state, card) })).join("");
  const shuffling = state.phase === "shuffle";
  // The hand fits the square whole: one row up to seven cards, two up to sixteen, then three.
  const rows = hand.length <= 7 ? 1 : hand.length <= 16 ? 2 : 3;
  const perRow = Math.max(1, Math.ceil(hand.length / rows));
  const width = Math.min(15, 92 / perRow - 1.5).toFixed(2);
  const height = (40 / (rows * 1.42) - (rows - 1) * 0.8).toFixed(2);
  host.innerHTML = `<div class="fce s${me}${open ? " mine" : ""}" role="group" aria-label="${escape(t("name"))}" style="--card: clamp(14px, min(${width}cqw, ${height}cqh), 56px)">
    <div class="fce-bottom">
      ${pick}
      <div class="fce-hand" role="group" aria-label="${escape(t("yourHand", { n: hand.length }))}">${cards}</div>
      <div class="fce-row">
        <button data-act="pass" ${open && !state.stock.length ? "" : "disabled"} ${state.phase === "play" && !state.stock.length ? "" : "hidden"}>${icon("play-outline")}<span>${escape(t("passTurn"))}</span></button>
      </div>
    </div>
    <div class="fce-them" aria-label="${escape(t("theirHand", { n: theirCount }))}">
      <span class="fce-backs" aria-hidden="true">${"<i></i>".repeat(Math.min(theirCount, 12))}</span>
      <span>${escape(t("theirHand", { n: theirCount }))}</span>
    </div>
    <div class="fce-table">
      ${
        shuffling
          ? `<p class="fce-note">${escape(t("shuffling"))}</p>`
          : `<button class="fce-draw" data-act="draw" aria-label="${escape(t("drawPile", { n: state.stock.length }))}" ${open && state.stock.length ? "" : "disabled"}><span>${state.stock.length}</span></button>
             ${top === undefined ? "" : cardHtml(top, t, { top: true })}
             <span class="fce-suit${RED.has(state.suit) ? " red" : ""}" role="img" aria-label="${escape(t("suitNow", { suit: suits[state.suit] }))}">${SIGNS[state.suit]}</span>`
      }
    </div>
    <i class="fce-nop"></i>
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
    const local = { eight: null, seed: null, lost: false, auto: null, loaded: false };
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
        // Nothing kept: a fresh seed when it is time to commit.
      }
      local.loaded = true;
      settle();
    };

    /** The shuffle's three moves go out on their own when it is this side's turn. */
    const settle = async () => {
      if (!local.loaded || !ctx.canPlay || ctx.mySide === null || ctx.state.phase !== "shuffle") return;
      const { state } = ctx;
      const stamp = `${ctx.view?.index}:${state.commit}:${state.seedB}`;
      if (local.auto === stamp) return;
      local.auto = stamp;
      if (ctx.mySide === 0 && state.commit === null) {
        local.seed = crypto.getRandomValues(new Uint8Array(SEED_BYTES));
        if (!(await remember(local.seed))) return;
        ctx.play(commitText(local.seed));
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
      const { act, card, suit } = button.dataset;
      if (act === "draw") {
        local.eight = null;
        ctx.play("d");
      } else if (act === "pass") {
        local.eight = null;
        ctx.play("x");
      } else if (suit !== undefined && local.eight !== null) {
        const eight = local.eight;
        local.eight = null;
        ctx.play(`p${eight}${suit}`);
      } else if (card !== undefined) {
        const index = Number(card);
        if (isEight(index)) {
          local.eight = index;
          draw(host, ctx, local);
        } else {
          local.eight = null;
          ctx.play(`p${index}`);
        }
      }
    });

    draw(host, ctx, local);
    recall();
    return {
      update(next) {
        if (next.view?.round?.moves?.length !== ctx.view?.round?.moves?.length || !next.canPlay) local.eight = null;
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
