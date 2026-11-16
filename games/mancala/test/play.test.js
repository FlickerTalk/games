import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fromBase64 } from "../../../kit/src/envelope.js";
import { TIMING } from "../../../kit/src/table.js";
import { fakeCore, phones, settle, within } from "../../../kit/test/helpers.js";
import { openPits } from "../src/picking.js";
import "../src/index.js";

const tick = () => settle([...document.querySelectorAll("ft-mancala")].map((element) => element.table));
const kinds = (core) => core.sent.map((data) => JSON.parse(new TextDecoder().decode(fromBase64(data))).k);
const text = (element) => element.textContent.replace(/\s+/g, " ");
const pit = (element, index) => element.querySelector(`button[data-pit="${index}"]`);
const move = (element, n) => element.querySelector(`button[data-move="${n}"]`);
const store = (element, side) => element.querySelector(`button[data-store="${side}"]`);
const seeds = (node) => node.getAttribute("aria-label").split(": ")[1];
const marked = (element, name) => [...element.querySelectorAll("button[data-mark]")].filter((one) => one.dataset.mark.split(" ").includes(name)).map((one) => one.dataset.pit);

async function phone(core, opening = {}) {
  const element = document.createElement("ft-mancala");
  element.ft = core.ft;
  document.body.append(element);
  await core.open(opening);
  await tick();
  return element;
}

async function touch(element, target) {
  const node = typeof target === "number" ? move(element, target) : within(element, target);
  if (!node) throw new Error(`nothing to touch: ${target}`);
  node.click();
  await tick();
}

async function match() {
  const { a, b } = phones();
  const one = await phone(a);
  const two = await phone(b);
  await touch(one, '[data-kit="new"]');
  await tick();
  const [s, n] = one.table.view.myTurn ? [one, two] : [two, one];
  return { a, b, one, two, s, n };
}

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = "";
});
afterEach(() => vi.useRealTimers());

async function phoneTurn(element) {
  for (let wait = 0; !element.table.view.myTurn && element.table.view.phase === "play" && wait < 12; wait += 1) {
    await vi.advanceTimersByTimeAsync(TIMING.think);
    await tick();
  }
}

describe("mancala against the phone", () => {
  it("lets the phone sow by the rules, again when it ends in its store, without a word on the live channel", async () => {
    const core = fakeCore();
    const one = await phone(core, { live: false, solo: true });
    one.table.random = () => new Uint8Array(32);
    await touch(one, '[data-kit="new"]');
    expect(one.table.view.myTurn).toBe(true);
    await touch(one, 2);
    expect(one.table.view.myTurn).toBe(true);
    await touch(one, 5);
    await phoneTurn(one);
    const played = one.table.record.game.moves;
    expect(played.slice(0, 2)).toEqual([2, 5]);
    expect(played.length).toBeGreaterThanOrEqual(4);
    expect(one.table.view.myTurn).toBe(true);
    expect(core.ft.live.send).not.toHaveBeenCalled();
  });

  it("plays a whole round against the phone to its end, the phone always Flick and never a word on the live channel", async () => {
    const core = fakeCore();
    const one = await phone(core, { live: false, solo: true });
    one.table.random = () => new Uint8Array(32).fill(1);
    await touch(one, '[data-kit="new"]');
    for (let turn = 0; one.table.view.phase === "play" && turn < 200; turn += 1) {
      if (one.table.view.myTurn) await touch(one, openPits(one.table.view.state, one.table.view.mySide, true)[0]);
      await vi.advanceTimersByTimeAsync(TIMING.think);
      await tick();
    }
    expect(one.table.view.phase).toBe("over");
    expect(text(one)).toMatch(/You (won|lost)|Draw/);
    expect(one.querySelector('.ftg-bar canvas[data-side="them"]').dataset.who).toBe("flick");
    expect(one.querySelector('[data-kit="send"]')).toBeNull();
    expect(core.ft.live.send).not.toHaveBeenCalled();
  });
});

describe("mancala between two phones", () => {
  it("tosses the coin, sows seeds seen on both phones with the turn again on a store, and sends the result of a resignation", async () => {
    const { a, b, s, n } = await match();
    expect(kinds(a)).toEqual(["hello", "commit", "reveal"]);
    expect(kinds(b)).toEqual(["sync", "seed", "sync"]);
    expect(text(s)).toContain("The coin says you start");
    expect(move(n, 0).disabled).toBe(true);

    await touch(s, 2);
    for (const side of [s, n]) {
      expect(seeds(pit(side, 2))).toBe("0 seeds");
      expect(seeds(store(side, 0))).toBe("1 seeds");
    }
    expect(text(s)).toContain("Your turn");
    await touch(s, 0);
    expect(text(n)).toContain("Your turn");
    expect(pit(n, 1).getAttribute("aria-label")).toBe("Their pit 2: 5 seeds");

    await touch(n, '[data-kit="resign"]');
    await touch(n, '[data-kit="yes"]');
    expect(text(n)).toContain("You lost");
    expect(text(s)).toContain("You won");
    await touch(s, '[data-kit="send"]');
    expect(s.ft.say).toHaveBeenCalledWith(expect.stringContaining("🫘 Mancala"));
  });

  it("keeps a move made without a connection pending, and sends it with the next hello", async () => {
    const { s, n } = await match();
    const send = s.ft.live.send;
    s.ft.live.send = vi.fn(async () => false);
    await touch(s, 0);
    expect(text(s)).toContain("The other phone cannot be reached right now.");
    expect(marked(s, "pending")).toEqual(["0"]);
    expect(n.table.record.game.moves).toEqual([]);
    s.ft.live.send = send;
    await touch(s, '[data-kit="back"]');
    await touch(s, '[data-kit="enter"]');
    await tick();
    expect(n.table.record.game.moves).toEqual([0]);
    expect(pit(n, 0).getAttribute("aria-label")).toBe("Their pit 1: 0 seeds");
    expect(marked(s, "pending")).toEqual([]);
    expect(text(n)).toContain("Your turn");
  });
});
