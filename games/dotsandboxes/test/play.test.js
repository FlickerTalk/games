import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fromBase64 } from "../../../kit/src/envelope.js";
import { TIMING } from "../../../kit/src/table.js";
import { fakeCore, phones, settle, within } from "../../../kit/test/helpers.js";
import "../src/index.js";

const tick = () => settle([...document.querySelectorAll("ft-dotsandboxes")].map((element) => element.table));
const kinds = (core) => core.sent.map((data) => JSON.parse(new TextDecoder().decode(fromBase64(data))).k);
const text = (element) => element.textContent.replace(/\s+/g, " ");
const line = (element, index) => element.querySelector(`button[data-line="${index}"]`);
const marked = (element, index, name) => (line(element, index).dataset.mark ?? "").split(" ").includes(name);
const counted = (element) => element.querySelector('.ftg-board [role="group"]').getAttribute("aria-label");
const free = (element) => [...element.querySelectorAll("button[data-line]")].find((one) => !one.disabled);

async function phone(core, opening = {}) {
  const element = document.createElement("ft-dotsandboxes");
  element.ft = core.ft;
  document.body.append(element);
  await core.open(opening);
  await tick();
  return element;
}

async function touch(element, target) {
  const node = typeof target === "number" ? line(element, target) : within(element, target);
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
  const [x, o] = one.table.view.myTurn ? [one, two] : [two, one];
  return { a, b, one, two, x, o };
}

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = "";
});
afterEach(() => vi.useRealTimers());

describe("dots and boxes against the phone", () => {
  it("lets the phone draw its lines by the rules, and draw again after closing a box, without a word on the live channel", async () => {
    vi.useRealTimers();
    vi.useFakeTimers({ toNotFake: ["Date"] });
    const core = fakeCore();
    const one = await phone(core, { live: false, solo: true });
    one.table.random = () => new Uint8Array(32).fill(1);
    await touch(one, '[data-kit="new"]');
    await vi.advanceTimersByTimeAsync(TIMING.think);
    await tick();
    expect(one.table.record.game.moves).toHaveLength(1);
    let touched = 0;
    while (one.table.view.state.boxes[0] === null && touched < 4) {
      await touch(one, [0, 4, 20, 21].find((index) => !one.table.view.state.lines[index]));
      touched += 1;
      await vi.advanceTimersByTimeAsync(TIMING.think);
      await tick();
    }
    await vi.advanceTimersByTimeAsync(TIMING.think);
    await tick();
    expect(one.table.view.state.boxes[0]).toBe(1 - one.table.view.mySide);
    expect(counted(one)).toBe(one.table.view.mySide === 0 ? "Board: 0 boxes to 1" : "Board: 1 boxes to 0");
    expect(one.table.record.game.moves).toHaveLength(2 * touched + 2);
    expect(one.table.view.myTurn).toBe(true);
    expect(core.ft.live.send).not.toHaveBeenCalled();
  });

  it("plays a whole round against the phone to its end, the phone always Flick and never a word on the live channel", async () => {
    vi.useRealTimers();
    vi.useFakeTimers({ toNotFake: ["Date"] });
    const core = fakeCore();
    const one = await phone(core, { live: false, solo: true });
    one.table.random = () => new Uint8Array(32).fill(1);
    await touch(one, '[data-kit="new"]');
    for (let turn = 0; one.table.view.phase === "play" && turn < 200; turn += 1) {
      if (one.table.view.myTurn) await touch(one, Number(free(one).dataset.line));
      await vi.advanceTimersByTimeAsync(TIMING.think);
      await tick();
    }
    expect(one.table.view.phase).toBe("over");
    expect(one.table.view.state.lines.every(Boolean)).toBe(true);
    expect(text(one)).toMatch(/You (won|lost)|Draw/);
    expect(one.querySelector('.ftg-bar canvas[data-side="them"]').dataset.who).toBe("flick");
    expect(one.querySelector('[data-kit="send"]')).toBeNull();
    expect(core.ft.live.send).not.toHaveBeenCalled();
  }, 60_000);
});

describe("dots and boxes between two phones", () => {
  it("tosses the coin, draws lines seen on both phones, closes a box for another turn, and sends the result of a resignation", async () => {
    const { a, b, x, o } = await match();
    expect(kinds(a)).toEqual(["hello", "commit", "reveal"]);
    expect(kinds(b)).toEqual(["sync", "seed", "sync"]);
    expect(text(x)).toContain("The coin says you start");
    expect(line(o, 0).disabled).toBe(true);

    await touch(x, 0);
    await touch(o, 4);
    await touch(x, 20);
    expect(text(o)).toContain("Your turn");
    await touch(o, 21);
    for (const side of [x, o]) {
      expect(side.table.view.state.boxes[0]).toBe(1);
      expect(counted(side)).toBe("Board: 0 boxes to 1");
      expect(marked(side, 21, "d1")).toBe(true);
    }
    expect(text(o)).toContain("Your turn");
    expect(line(x, 1).disabled).toBe(true);
    expect(line(o, 1).disabled).toBe(false);

    await touch(o, '[data-kit="resign"]');
    await touch(o, '[data-kit="yes"]');
    expect(text(o)).toContain("You lost");
    expect(text(x)).toContain("You won");
    await touch(x, '[data-kit="send"]');
    expect(x.ft.say).toHaveBeenCalledWith(expect.stringContaining("🔲 Dots and Boxes"));
  });

  it("keeps a move made without a connection pending, and sends it with the next hello", async () => {
    const { x, o } = await match();
    const send = x.ft.live.send;
    x.ft.live.send = vi.fn(async () => false);
    await touch(x, 5);
    expect(text(x)).toContain("The other phone cannot be reached right now.");
    expect(marked(x, 5, "pending")).toBe(true);
    expect(o.table.record.game.moves).toEqual([]);
    x.ft.live.send = send;
    await touch(x, '[data-kit="back"]');
    await touch(x, '[data-kit="enter"]');
    await tick();
    expect(o.table.record.game.moves).toEqual([5]);
    expect(line(o, 5).getAttribute("aria-label")).toBe("Line across, row 2, box 2: X");
    expect(marked(x, 5, "pending")).toBe(false);
    expect(text(o)).toContain("Your turn");
  });
});
