import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { storeKey } from "../../../kit/src/cards/dealer.js";
import { fromBase64url } from "../../../kit/src/cards/sha256.js";
import { commitText, revealText, seedText } from "../../../kit/src/cards/shuffle.js";
import { TABLETOP_STYLE } from "../../../kit/src/tabletop/board.js";
import { MARKS, STYLE, board } from "../src/board.js";
import { initial, play, result, turn } from "../src/rules.js";
import { t } from "./rig.js";

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const A = Uint8Array.from({ length: 24 }, (_, at) => at + 1);
const B = new Uint8Array(24).fill(0x5a);

function context(moves, extra = {}) {
  let state = initial();
  for (const move of moves) state = play(state, move, turn(state)).state;
  return { state, view: { me: "me-1", index: 0, round: { moves } }, mySide: turn(state), canPlay: !result(state), last: moves.at(-1) ?? null, pending: false, result: null, lang: "en", t, play: vi.fn(), notify: vi.fn(), ...extra };
}

function mount(ctx) {
  const host = document.createElement("div");
  host.getBoundingClientRect = () => ({ left: 0, top: 0, width: 343, height: 343, right: 343, bottom: 343 });
  document.body.append(host);
  return { host, mounted: board.mount(host, ctx) };
}

const key = (host, name) => host.querySelector(`button[data-key="${name}"]`);

let store;
beforeEach(() => {
  store = new Map();
  globalThis.ft = { store: { get: vi.fn(async (name) => store.get(name) ?? null), set: vi.fn(async (name, value) => (store.set(name, value), true)) } };
});
afterEach(() => {
  document.body.innerHTML = "";
});

describe("the board of Card Corner", () => {
  it("is a canvas with a named button over each thing to touch, the four games first", () => {
    const { host } = mount(context([]));
    expect(host.querySelector("canvas").getAttribute("aria-hidden")).toBe("true");
    expect(host.querySelector('[role="group"]').getAttribute("aria-label")).toBe("Card Corner: Choose a game");
    expect([...host.querySelectorAll("button[data-key]")].map((one) => one.getAttribute("aria-label"))).toEqual(["Pairs", "War", "Rummy", "Go Fish"]);
    key(host, "pairs").click();
    expect([...host.querySelectorAll("button[data-key]")].map((one) => one.dataset.key)).toEqual(["games", "p16", "p24"]);
    expect(STYLE.startsWith(TABLETOP_STYLE)).toBe(true);
    expect(MARKS).toHaveLength(2);
    expect(MARKS[0]).not.toBe(MARKS[1]);
  });

  it("plays the choice of a game as the round's first move", () => {
    const ctx = context([]);
    const { host } = mount(ctx);
    key(host, "fish").click();
    expect(ctx.play).toHaveBeenCalledWith("gf");
  });

  it("shuffles on its own once the game is chosen: the dealer commits and keeps its seed, the other side answers, the dealer reveals", async () => {
    const dealer = context(["gw"], { mySide: 0 });
    mount(dealer);
    await tick();
    await tick();
    expect(dealer.play).toHaveBeenCalledTimes(1);
    const commit = dealer.play.mock.calls[0][0];
    expect(commit).toMatch(/^c[A-Za-z0-9_-]{43}$/);
    const kept = fromBase64url(store.get(storeKey("cardcorner", "me-1", 0)));
    expect(commitText(kept)).toBe(commit);

    const other = context(["gw", commitText(A)], { mySide: 1 });
    mount(other);
    await tick();
    await tick();
    expect(other.play.mock.calls[0][0]).toMatch(/^s[A-Za-z0-9_-]{32}$/);

    store.set(storeKey("cardcorner", "me-1", 0), store.get(storeKey("cardcorner", "me-1", 0)));
    const again = context(["gw", commitText(kept), seedText(B)], { mySide: 0 });
    mount(again);
    await tick();
    await tick();
    expect(again.play).toHaveBeenCalledWith(revealText(kept));
  });

  it("says so when the dealer's seed is no longer on this phone, and touches nothing while it waits for a choice", async () => {
    const lost = context(["gw", commitText(A), seedText(B)], { mySide: 0 });
    mount(lost);
    await tick();
    await tick();
    expect(lost.play).not.toHaveBeenCalled();
    expect(lost.notify).toHaveBeenCalledWith("The shuffle was lost on this phone; resign and start a new match.");
    const choosing = context([], { mySide: 0 });
    mount(choosing);
    await tick();
    await tick();
    expect(choosing.play).not.toHaveBeenCalled();
  });

  it("shows the table of the chosen game once the cards are dealt, and cleans up after itself", async () => {
    const dealt = context(["gr", commitText(A), seedText(B), revealText(A)], { mySide: 1 });
    const { host, mounted } = mount(dealt);
    expect(host.querySelector('[role="group"]').getAttribute("aria-label")).toMatch(/^Card Corner, Rummy: /);
    expect(host.querySelectorAll("button[data-card]")).toHaveLength(7);
    key(host, "stock").click();
    expect(dealt.play).toHaveBeenCalledWith("ds");
    mounted.destroy();
    expect(host.children).toHaveLength(0);
  });
});
