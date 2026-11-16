import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { TABLETOP_STYLE } from "../../../kit/src/tabletop/board.js";
import { MARKS, STYLE, board } from "../src/board.js";
import { storeKey } from "../src/keeper.js";
import { TEXTS } from "../src/texts.js";
import { ART } from "../src/theme.js";
import { DEFAULT_FLEET, commitText, fleetText, honestAnswer, initial, parseFleet, play, result, revealText, shipCells, turn } from "../src/rules.js";
import { fromBase64url } from "../src/sha256.js";

const translate = translator(joinTexts(KIT_TEXTS, TEXTS));
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const SALT = new Uint8Array(24).fill(0x5a);
const OTHER = DEFAULT_FLEET.map((ship) => ({ ...ship, start: ship.start + 10 }));
const PLACED = [commitText(SALT, DEFAULT_FLEET), commitText(SALT, DEFAULT_FLEET)];

function replay(moves, start = initial()) {
  return moves.reduce((state, move) => play(state, move, turn(state)).state, start);
}

function context(moves, extra = {}) {
  const state = replay(moves);
  const over = result(state);
  return {
    state,
    view: { me: "me-1", round: { moves } },
    mySide: turn(state),
    canPlay: !over,
    last: moves.at(-1) ?? null,
    pending: false,
    result: over ? { k: "rules", winner: over.winner, result: over } : null,
    lang: "en",
    t: (key, vars) => translate("en", key, vars),
    play: vi.fn(),
    notify: vi.fn(),
    ...extra,
  };
}

function mount(ctx) {
  const host = document.createElement("div");
  host.getBoundingClientRect = () => ({ left: 0, top: 0, width: 352, height: 352, right: 352, bottom: 352 });
  document.body.append(host);
  return { host, mounted: board.mount(host, ctx) };
}

const cell = (host, index) => host.querySelector(`button[data-cell="${index}"]`);
const own = (host, index) => host.querySelector(`button[data-own="${index}"]`);
const ships = (host) => [...host.querySelectorAll("button[data-own]")].filter((one) => (one.dataset.mark ?? "").split(" ").includes("ship")).map((one) => Number(one.dataset.own));
const keep = (fleet, salt = "WlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpa") => store.set(storeKey("me-1"), JSON.stringify({ salt, fleet: fleetText(fleet) }));

let store;
beforeEach(() => {
  store = new Map();
  globalThis.ft = {
    store: {
      get: vi.fn(async (key) => store.get(key) ?? null),
      set: vi.fn(async (key, value) => (store.set(key, value), true)),
    },
  };
});
afterEach(() => {
  document.body.innerHTML = "";
  delete globalThis.ft;
});

describe("placing the fleet on the board", () => {
  it("draws the user's sea on a canvas, with its cells named over it and the shuffle and ready buttons below", async () => {
    const { host } = mount(context([]));
    await tick();
    expect(host.querySelector("canvas").getAttribute("aria-hidden")).toBe("true");
    expect(host.querySelectorAll("button[data-own]")).toHaveLength(100);
    expect(host.querySelectorAll("button[data-cell]")).toHaveLength(0);
    expect(ships(host)).toEqual(DEFAULT_FLEET.flatMap(shipCells).sort((a, b) => a - b));
    expect(own(host, 11).getAttribute("aria-label")).toBe("Row 2, column 2: ship");
    expect(host.querySelector('[role="group"]').getAttribute("aria-label")).toContain("Place your five ships");
    expect(host.querySelector('[data-act="shuffle"]').getAttribute("aria-label")).toBe("Shuffle");
    expect(host.querySelector('[data-act="ready"]').disabled).toBe(false);
  });

  it("shows the fleet this phone kept for the match once it is read back", async () => {
    keep(OTHER);
    const { host } = mount(context([]));
    await tick();
    expect(ships(host)).toEqual(OTHER.flatMap(shipCells).sort((a, b) => a - b));
  });

  it("shuffles, then commits on Ready to the fleet it keeps on this phone", async () => {
    const ctx = context([]);
    const { host } = mount(ctx);
    await tick();
    const before = ships(host);
    host.querySelector('[data-act="shuffle"]').click();
    expect(ships(host)).toHaveLength(17);
    expect(ships(host)).not.toEqual(before);
    host.querySelector('[data-act="ready"]').click();
    await tick();
    await tick();
    expect(ctx.play).toHaveBeenCalledTimes(1);
    const move = ctx.play.mock.calls[0][0];
    expect(move).toMatch(/^c[A-Za-z0-9_-]{43}$/);
    const kept = JSON.parse(store.get(storeKey("me-1")));
    expect(commitText(fromBase64url(kept.salt), parseFleet(kept.fleet))).toBe(move);
  });

  it("drops the buttons once its fleet is sealed, and keeps them closed off turn", async () => {
    keep(DEFAULT_FLEET);
    const { host } = mount(context([PLACED[0]], { mySide: 0, canPlay: false }));
    await tick();
    expect(host.querySelector('[data-act="ready"]')).toBeNull();
    expect(host.querySelector('[role="group"]').getAttribute("aria-label")).toContain("Waiting for the other fleet");
    const { host: other } = mount(context([], { canPlay: false }));
    await tick();
    expect(other.querySelector('[data-act="ready"]').disabled).toBe(true);
  });
});

describe("firing on the board", () => {
  it("fires in two taps, through the target that appears over the chosen cell, with the honest answer attached", async () => {
    keep(DEFAULT_FLEET);
    const ctx = context([...PLACED, ">11"]);
    const { host } = mount(ctx);
    await tick();
    expect(host.querySelectorAll("button[data-cell]")).toHaveLength(100);
    expect(own(host, 11).dataset.mark.split(" ")).toEqual(expect.arrayContaining(["ship", "hit", "last"]));
    cell(host, 45).click();
    expect(ctx.play).not.toHaveBeenCalled();
    const ghost = host.querySelector("button[data-ghost]");
    expect(ghost.getAttribute("aria-label")).toBe("Fire at row 5, column 6");
    ghost.click();
    expect(ctx.play).toHaveBeenCalledWith("h>45");
  });

  it("says so, and fires nothing, when the fleet it committed is no longer on this phone", async () => {
    const ctx = context([...PLACED, ">21"]);
    const { host } = mount(ctx);
    await tick();
    expect(ctx.notify).toHaveBeenCalledWith(expect.stringContaining("no longer on this phone"));
    expect(cell(host, 45).disabled).toBe(true);
    expect(host.textContent).not.toContain("no longer on this phone");
    expect(ctx.play).not.toHaveBeenCalled();
  });

  it("answers the shot that sinks its last ship on its own, then sends the reveal", async () => {
    keep(DEFAULT_FLEET);
    const targets = DEFAULT_FLEET.flatMap(shipCells);
    const water = Array.from({ length: 100 }, (_, index) => 99 - index).filter((index) => !targets.includes(index));
    const moves = [...PLACED];
    let state = replay(moves);
    for (let at = 0; at < targets.length; at += 1) {
      for (const shot of [water[at], targets[at]]) {
        const move = `${honestAnswer(state, turn(state), DEFAULT_FLEET)}>${shot}`;
        state = replay([move], state);
        moves.push(move);
      }
    }
    const ctx = context(moves, { mySide: 0 });
    const { mounted } = mount(ctx);
    await tick();
    const last = honestAnswer(state, 0, DEFAULT_FLEET);
    expect(ctx.play).toHaveBeenCalledWith(last);
    state = replay([last, revealText(SALT, DEFAULT_FLEET)], state);
    ctx.play.mockClear();
    mounted.update({ ...ctx, state, canPlay: true, view: { me: "me-1", round: { moves: [...moves, last, "r"] } } });
    expect(ctx.play).toHaveBeenCalledTimes(1);
    expect(ctx.play.mock.calls[0][0]).toBe(revealText(SALT, DEFAULT_FLEET));
  });
});

describe("the board's look", () => {
  it("carries the kit's look for a canvas board, outlines the player to move in that side's colour, and marks each side with its boat", () => {
    expect(STYLE).toContain(TABLETOP_STYLE);
    expect(STYLE).toContain(`.ftg{--hue-side-0:${ART.boats[0].body};--hue-side-1:${ART.boats[1].body}}`);
    expect(MARKS).toHaveLength(2);
    expect(MARKS[0]).not.toBe(MARKS[1]);
  });
});
